"""Review and question board storage."""

import json
import os
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional


class ReviewStore:
    """Persist reviews to MongoDB when configured, otherwise JSON."""

    def __init__(self, path: Path, mongodb_uri: Optional[str] = None):
        self.path = path
        self._lock = threading.Lock()
        self._collection: Optional[Any] = None

        uri = mongodb_uri or os.getenv("MONGODB_URI")
        if uri:
            from pymongo import ASCENDING, DESCENDING, MongoClient

            self._collection = MongoClient(uri)["noteflow"]["reviews"]
            self._collection.create_index([("review_id", ASCENDING)], unique=True)
            self._collection.create_index([("status", ASCENDING), ("created_at", DESCENDING)])
            self._collection.create_index([("type", ASCENDING), ("created_at", DESCENDING)])
        else:
            self.path.parent.mkdir(parents=True, exist_ok=True)

    def list_public(self, type_filter: Optional[str] = None, limit: int = 50, query_text: str = "") -> List[Dict[str, Any]]:
        safe_limit = max(1, int(limit))
        query: Dict[str, Any] = {"status": {"$ne": "hidden"}}
        if type_filter in {"review", "question"}:
            query["type"] = type_filter
        normalized_query = query_text.strip().lower()

        if self._collection is not None:
            if normalized_query:
                query["$or"] = [
                    {"title": {"$regex": normalized_query, "$options": "i"}},
                    {"content": {"$regex": normalized_query, "$options": "i"}},
                    {"answer": {"$regex": normalized_query, "$options": "i"}},
                    {"display_name": {"$regex": normalized_query, "$options": "i"}},
                ]
            cursor = self._collection.find(query).sort("created_at", -1).limit(safe_limit)
            return [self._public_record(record) for record in cursor]

        records = [
            record for record in self._load()
            if record.get("status") != "hidden"
            and (not type_filter or record.get("type") == type_filter)
            and (not normalized_query or self._matches_query(record, normalized_query))
        ]
        records = sorted(records, key=lambda record: str(record.get("created_at", "")), reverse=True)
        return [self._public_record(record) for record in records[:safe_limit]]

    def stats(self) -> Dict[str, int]:
        if self._collection is not None:
            visible_query = {"status": {"$ne": "hidden"}}
            return {
                "review_count": int(self._collection.count_documents({**visible_query, "type": "review"})),
                "question_count": int(self._collection.count_documents({**visible_query, "type": "question"})),
                "answered_count": int(self._collection.count_documents({**visible_query, "status": "answered"})),
            }

        records = [record for record in self._load() if record.get("status") != "hidden"]
        return {
            "review_count": len([record for record in records if record.get("type") == "review"]),
            "question_count": len([record for record in records if record.get("type") == "question"]),
            "answered_count": len([record for record in records if record.get("status") == "answered"]),
        }

    def get_public(self, review_id: str) -> Optional[Dict[str, Any]]:
        record = self.get(review_id)
        if not record or record.get("status") == "hidden":
            return None
        return record

    def get(self, review_id: str) -> Optional[Dict[str, Any]]:
        if self._collection is not None:
            record = self._collection.find_one({"review_id": review_id})
            return self._public_record(record) if record else None

        return next(
            (self._public_record(record) for record in self._load() if record.get("review_id") == review_id),
            None,
        )

    def create(self, record: Dict[str, Any]) -> Dict[str, Any]:
        next_record = dict(record)
        if self._collection is not None:
            self._collection.insert_one(next_record)
            return self._public_record(next_record)

        with self._lock:
            records = self._load_unlocked()
            records.append(next_record)
            self._write_unlocked(records)
            return self._public_record(next_record)

    def update(self, review_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if self._collection is not None:
            result = self._collection.find_one_and_update(
                {"review_id": review_id},
                {"$set": dict(updates)},
                return_document=True,
            )
            return self._public_record(result) if result else None

        with self._lock:
            records = self._load_unlocked()
            updated_record: Optional[Dict[str, Any]] = None
            for record in records:
                if record.get("review_id") == review_id:
                    record.update(updates)
                    updated_record = dict(record)
                    break
            if updated_record is None:
                return None
            self._write_unlocked(records)
            return self._public_record(updated_record)

    def hide(self, review_id: str, updated_at: str) -> Optional[Dict[str, Any]]:
        return self.update(review_id, {"status": "hidden", "updated_at": updated_at})

    def answer(self, review_id: str, answer: str, answer_by: str, answer_at: str) -> Optional[Dict[str, Any]]:
        return self.update(
            review_id,
            {
                "answer": answer,
                "answer_by": answer_by,
                "answer_at": answer_at,
                "status": "answered",
                "updated_at": answer_at,
            },
        )

    @staticmethod
    def _public_record(record: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        if not record:
            return {}
        return {key: value for key, value in record.items() if key != "_id"}

    @staticmethod
    def _matches_query(record: Dict[str, Any], normalized_query: str) -> bool:
        searchable_values = (
            record.get("title"),
            record.get("content"),
            record.get("answer"),
            record.get("display_name"),
        )
        return any(normalized_query in str(value or "").lower() for value in searchable_values)

    def _load(self) -> List[Dict[str, Any]]:
        with self._lock:
            return [self._public_record(record) for record in self._load_unlocked()]

    def _load_unlocked(self) -> List[Dict[str, Any]]:
        if not self.path.exists():
            return []
        try:
            with self.path.open("r", encoding="utf-8") as file:
                raw = json.load(file)
        except (json.JSONDecodeError, OSError):
            return []
        if isinstance(raw, list):
            return [record for record in raw if isinstance(record, dict)]
        if isinstance(raw, dict):
            records = raw.get("reviews", [])
            if isinstance(records, list):
                return [record for record in records if isinstance(record, dict)]
        return []

    def _write_unlocked(self, records: List[Dict[str, Any]]) -> None:
        with self.path.open("w", encoding="utf-8") as file:
            json.dump({"reviews": records}, file, ensure_ascii=False, indent=2)
