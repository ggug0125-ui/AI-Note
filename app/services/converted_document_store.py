"""Store converted document metadata."""

import json
import os
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional


class ConvertedDocumentStore:
    """Persist converted document records to MongoDB when configured, otherwise JSON."""

    def __init__(self, path: Path, mongodb_uri: Optional[str] = None):
        self.path = path
        self._lock = threading.Lock()
        self._collection: Optional[Any] = None

        uri = mongodb_uri or os.getenv("MONGODB_URI")
        if uri:
            from pymongo import ASCENDING, DESCENDING, MongoClient

            self._collection = MongoClient(uri)["noteflow"]["converted_documents"]
            self._collection.create_index([("conversion_id", ASCENDING)], unique=True)
            self._collection.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        else:
            self.path.parent.mkdir(parents=True, exist_ok=True)

    def append(self, record: Dict[str, Any]) -> Dict[str, Any]:
        next_record = dict(record)
        if self._collection is not None:
            self._collection.insert_one(next_record)
            return self._public_record(next_record)

        with self._lock:
            records = self._load_unlocked()
            records.append(next_record)
            self._write_unlocked(records)
            return self._public_record(next_record)

    def get_for_user(self, conversion_id: str, user_id: str, user_email: str) -> Optional[Dict[str, Any]]:
        normalized_email = str(user_email).strip().lower()
        if self._collection is not None:
            record = self._collection.find_one({
                "conversion_id": conversion_id,
                "$or": [{"user_id": user_id}, {"user_email": normalized_email}],
            })
            return self._public_record(record) if record else None

        return next(
            (
                self._public_record(record)
                for record in self._load()
                if record.get("conversion_id") == conversion_id and self._matches_user(record, user_id, normalized_email)
            ),
            None,
        )

    def list_for_user(self, user_id: str, user_email: str, limit: int = 50) -> List[Dict[str, Any]]:
        safe_limit = max(1, int(limit))
        normalized_email = str(user_email).strip().lower()
        if self._collection is not None:
            cursor = (
                self._collection.find({"$or": [{"user_id": user_id}, {"user_email": normalized_email}]})
                .sort("created_at", -1)
                .limit(safe_limit)
            )
            return [self._public_record(record) for record in cursor]

        records = [
            record for record in self._load()
            if self._matches_user(record, user_id, normalized_email)
        ]
        records = sorted(records, key=lambda record: str(record.get("created_at", "")), reverse=True)
        return [self._public_record(record) for record in records[:safe_limit]]

    def count_for_user(self, user_id: str, user_email: str) -> int:
        normalized_email = str(user_email).strip().lower()
        if self._collection is not None:
            return int(self._collection.count_documents({"$or": [{"user_id": user_id}, {"user_email": normalized_email}]}))
        return len([record for record in self._load() if self._matches_user(record, user_id, normalized_email)])

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
            records = raw.get("converted_documents", [])
            if isinstance(records, list):
                return [record for record in records if isinstance(record, dict)]
        return []

    def _write_unlocked(self, records: List[Dict[str, Any]]) -> None:
        with self.path.open("w", encoding="utf-8") as file:
            json.dump({"converted_documents": records}, file, ensure_ascii=False, indent=2)

    @staticmethod
    def _matches_user(record: Dict[str, Any], user_id: str, user_email: str) -> bool:
        return record.get("user_id") == user_id or str(record.get("user_email", "")).strip().lower() == user_email

    @staticmethod
    def _public_record(record: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        if not record:
            return {}
        return {key: value for key, value in record.items() if key != "_id"}
