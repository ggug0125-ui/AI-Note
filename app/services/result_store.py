"""Result history store for NoteFlow AI."""

import json
import os
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional


DEFAULT_RESULTS: Dict[str, List[Dict[str, Any]]] = {
    "documents": [],
    "summary_results": [],
    "keyword_results": [],
    "chat_results": [],
}
COLLECTION_BY_CATEGORY = {
    "documents": "documents",
    "summary_results": "summaries",
    "keyword_results": "keywords",
    "chat_results": "chat_history",
}


class ResultStore:
    """Persist document and result history to MongoDB when configured, otherwise JSON."""

    def __init__(self, path: Path, mongodb_uri: Optional[str] = None):
        self.path = path
        self._lock = threading.Lock()
        self._collections: Optional[Dict[str, Any]] = None

        uri = mongodb_uri or os.getenv("MONGODB_URI")
        if uri:
            from pymongo import MongoClient

            db = MongoClient(uri)["noteflow"]
            self._collections = {
                category: db[collection_name]
                for category, collection_name in COLLECTION_BY_CATEGORY.items()
            }
            print("ResultStore initialized in MongoDB mode")
        else:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            print("ResultStore initialized in JSON fallback mode")

    def load(self) -> Dict[str, List[Dict[str, Any]]]:
        if self._collections is not None:
            return {
                category: [
                    self._public_record(item)
                    for item in self._collections[category].find({})
                ]
                for category in DEFAULT_RESULTS
            }

        with self._lock:
            return self._load_unlocked()

    def append(self, category: str, item: Dict[str, Any]) -> None:
        if self._collections is not None:
            collection = self._collections.get(category)
            if collection is None:
                raise ValueError(f"Unknown result category: {category}")
            result = collection.insert_one(dict(item))
            print(f"ResultStore MongoDB append succeeded: category={category}, inserted_id={result.inserted_id}")
            return

        with self._lock:
            data = self._load_unlocked()
            data.setdefault(category, [])
            data[category].append(item)
            self._write_unlocked(data)
            print(f"ResultStore JSON append succeeded: category={category}")

    def list_documents(
        self,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        include_all: bool = False,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if not include_all:
            query = self._user_query(user_id, user_email)

        if self._collections is not None:
            return [
                self._public_record(item)
                for item in self._collections["documents"].find(query)
            ]

        documents = self.load().get("documents", [])
        if include_all:
            return documents
        return [
            item for item in documents
            if self._matches_user(item, user_id, user_email)
        ]

    def list_chat_history(
        self,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        include_all: bool = False,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if not include_all:
            query = self._user_query(user_id, user_email)

        if self._collections is not None:
            cursor = (
                self._collections["chat_results"]
                .find(query)
                .sort("created_at", -1)
                .limit(limit)
            )
            return [self._chat_record(item) for item in cursor]

        chats = self.load().get("chat_results", [])
        if not include_all:
            chats = [
                item for item in chats
                if self._matches_user(item, user_id, user_email)
            ]
        return [
            self._chat_record(item)
            for item in sorted(chats, key=lambda item: str(item.get("created_at", "")), reverse=True)[:limit]
        ]

    def count_all(self) -> Dict[str, int]:
        if self._collections is not None:
            return {
                "total_documents": int(self._collections["documents"].count_documents({})),
                "total_chat_history": int(self._collections["chat_results"].count_documents({})),
                "total_summaries": int(self._collections["summary_results"].count_documents({})),
                "total_keywords": int(self._collections["keyword_results"].count_documents({})),
            }

        data = self.load()
        return {
            "total_documents": len(data.get("documents", [])),
            "total_chat_history": len(data.get("chat_results", [])),
            "total_summaries": len(data.get("summary_results", [])),
            "total_keywords": len(data.get("keyword_results", [])),
        }

    def get_by_file_id(self, file_id: str) -> Dict[str, List[Dict[str, Any]]]:
        if self._collections is not None:
            return {
                "documents": self._find_by_file_id("documents", file_id),
                "summaries": self._find_by_file_id("summary_results", file_id),
                "keywords": self._find_by_file_id("keyword_results", file_id),
                "chats": self._find_by_file_id("chat_results", file_id),
            }

        data = self.load()
        return {
            "documents": [
                item for item in data.get("documents", [])
                if item.get("file_id") == file_id
            ],
            "summaries": [
                item for item in data.get("summary_results", [])
                if item.get("file_id") == file_id
            ],
            "keywords": [
                item for item in data.get("keyword_results", [])
                if item.get("file_id") == file_id
            ],
            "chats": [
                item for item in data.get("chat_results", [])
                if item.get("file_id") == file_id
            ],
        }

    def delete_by_file_id(self, file_id: str) -> Dict[str, int]:
        if self._collections is not None:
            return {
                "documents": self._delete_by_file_id("documents", file_id),
                "summaries": self._delete_by_file_id("summary_results", file_id),
                "keywords": self._delete_by_file_id("keyword_results", file_id),
                "chats": self._delete_by_file_id("chat_results", file_id),
            }

        with self._lock:
            data = self._load_unlocked()
            before_counts = {
                "documents": len(data.get("documents", [])),
                "summaries": len(data.get("summary_results", [])),
                "keywords": len(data.get("keyword_results", [])),
                "chats": len(data.get("chat_results", [])),
            }

            data["documents"] = [
                item for item in data.get("documents", [])
                if item.get("file_id") != file_id
            ]
            data["summary_results"] = [
                item for item in data.get("summary_results", [])
                if item.get("file_id") != file_id
            ]
            data["keyword_results"] = [
                item for item in data.get("keyword_results", [])
                if item.get("file_id") != file_id
            ]
            data["chat_results"] = [
                item for item in data.get("chat_results", [])
                if item.get("file_id") != file_id
            ]

            deleted_counts = {
                "documents": before_counts["documents"] - len(data["documents"]),
                "summaries": before_counts["summaries"] - len(data["summary_results"]),
                "keywords": before_counts["keywords"] - len(data["keyword_results"]),
                "chats": before_counts["chats"] - len(data["chat_results"]),
            }
            self._write_unlocked(data)
            return deleted_counts

    def delete_user_records(
        self,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        query = self._user_query(user_id, user_email)

        if self._collections is not None:
            documents = [
                self._public_record(item)
                for item in self._collections["documents"].find(query)
            ]
            deleted = {
                "documents": int(self._collections["documents"].delete_many(query).deleted_count),
                "chat_history": int(self._collections["chat_results"].delete_many(query).deleted_count),
                "summaries": int(self._collections["summary_results"].delete_many(query).deleted_count),
                "keywords": int(self._collections["keyword_results"].delete_many(query).deleted_count),
            }
            return {"deleted": deleted, "documents": documents}

        with self._lock:
            data = self._load_unlocked()
            documents = [
                dict(item)
                for item in data.get("documents", [])
                if self._matches_user(item, user_id, user_email)
            ]
            before_counts = {
                "documents": len(data.get("documents", [])),
                "chat_history": len(data.get("chat_results", [])),
                "summaries": len(data.get("summary_results", [])),
                "keywords": len(data.get("keyword_results", [])),
            }

            data["documents"] = [
                item for item in data.get("documents", [])
                if not self._matches_user(item, user_id, user_email)
            ]
            data["chat_results"] = [
                item for item in data.get("chat_results", [])
                if not self._matches_user(item, user_id, user_email)
            ]
            data["summary_results"] = [
                item for item in data.get("summary_results", [])
                if not self._matches_user(item, user_id, user_email)
            ]
            data["keyword_results"] = [
                item for item in data.get("keyword_results", [])
                if not self._matches_user(item, user_id, user_email)
            ]

            deleted = {
                "documents": before_counts["documents"] - len(data["documents"]),
                "chat_history": before_counts["chat_history"] - len(data["chat_results"]),
                "summaries": before_counts["summaries"] - len(data["summary_results"]),
                "keywords": before_counts["keywords"] - len(data["keyword_results"]),
            }
            self._write_unlocked(data)
            return {"deleted": deleted, "documents": documents}

    def update_document_metadata(
        self,
        file_id: str,
        updates: Dict[str, Any],
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        include_all: bool = False,
    ) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {"file_id": file_id}
        if not include_all:
            user_query = self._user_query(user_id, user_email)
            query = {"$and": [query, user_query]}

        if self._collections is not None:
            collection = self._collections["documents"]
            if updates:
                collection.update_one(query, {"$set": dict(updates)})
            record = collection.find_one(query)
            return self._public_record(record) if record else None

        with self._lock:
            data = self._load_unlocked()
            for item in data.get("documents", []):
                if item.get("file_id") != file_id:
                    continue
                if not include_all and not self._matches_user(item, user_id, user_email):
                    continue
                item.update(updates)
                self._write_unlocked(data)
                return dict(item)
        return None

    def update_record_metadata(
        self,
        category: str,
        record_id: str,
        updates: Dict[str, Any],
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        include_all: bool = False,
    ) -> Optional[Dict[str, Any]]:
        if category not in {"summary_results", "keyword_results", "chat_results"}:
            raise ValueError(f"Unknown result category: {category}")

        query: Dict[str, Any] = {"created_at": record_id}
        if not include_all:
            user_query = self._user_query(user_id, user_email)
            query = {"$and": [query, user_query]}

        if self._collections is not None:
            collection = self._collections[category]
            if updates:
                collection.update_one(query, {"$set": dict(updates)})
            record = collection.find_one(query)
            if not record:
                return None
            if category == "chat_results":
                return self._chat_record(record)
            return self._public_record(record)

        with self._lock:
            data = self._load_unlocked()
            for item in data.get(category, []):
                if item.get("created_at") != record_id:
                    continue
                if not include_all and not self._matches_user(item, user_id, user_email):
                    continue
                item.update(updates)
                self._write_unlocked(data)
                return self._chat_record(item) if category == "chat_results" else dict(item)
        return None

    def get_record_by_created_at(
        self,
        category: str,
        record_id: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        include_all: bool = False,
    ) -> Optional[Dict[str, Any]]:
        if category not in {"summary_results", "keyword_results", "chat_results"}:
            raise ValueError(f"Unknown result category: {category}")

        query: Dict[str, Any] = {"created_at": record_id}
        if not include_all:
            user_query = self._user_query(user_id, user_email)
            query = {"$and": [query, user_query]}

        if self._collections is not None:
            record = self._collections[category].find_one(query)
            if not record:
                return None
            if category == "chat_results":
                return self._chat_record(record)
            return self._public_record(record)

        with self._lock:
            data = self._load_unlocked()
            for item in data.get(category, []):
                if item.get("created_at") != record_id:
                    continue
                if not include_all and not self._matches_user(item, user_id, user_email):
                    continue
                return self._chat_record(item) if category == "chat_results" else dict(item)
        return None

    def delete_record_by_created_at(
        self,
        category: str,
        record_id: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        include_all: bool = False,
    ) -> int:
        if category not in {"summary_results", "keyword_results", "chat_results"}:
            raise ValueError(f"Unknown result category: {category}")

        query: Dict[str, Any] = {"created_at": record_id}
        if not include_all:
            user_query = self._user_query(user_id, user_email)
            query = {"$and": [query, user_query]}

        if self._collections is not None:
            result = self._collections[category].delete_one(query)
            return int(result.deleted_count)

        with self._lock:
            data = self._load_unlocked()
            records = data.get(category, [])
            next_records = []
            deleted_count = 0

            for item in records:
                matches_record = item.get("created_at") == record_id
                matches_user = include_all or self._matches_user(item, user_id, user_email)
                if matches_record and matches_user and deleted_count == 0:
                    deleted_count = 1
                    continue
                next_records.append(item)

            if deleted_count:
                data[category] = next_records
                self._write_unlocked(data)

            return deleted_count

    def delete_ai_records_by_file_id(
        self,
        file_id: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        include_all: bool = False,
    ) -> Dict[str, int]:
        category_keys = {
            "summary_results": "summaries",
            "keyword_results": "keywords",
            "chat_results": "chats",
        }

        if self._collections is not None:
            deleted: Dict[str, int] = {}
            for category, key in category_keys.items():
                query: Dict[str, Any] = {"file_id": file_id}
                if not include_all:
                    query = {"$and": [query, self._user_query(user_id, user_email)]}
                result = self._collections[category].delete_many(query)
                deleted[key] = int(result.deleted_count)
            return deleted

        with self._lock:
            data = self._load_unlocked()
            deleted = {}

            for category, key in category_keys.items():
                records = data.get(category, [])
                next_records = []
                deleted_count = 0

                for item in records:
                    matches_file = item.get("file_id") == file_id
                    matches_user = include_all or self._matches_user(item, user_id, user_email)
                    if matches_file and matches_user:
                        deleted_count += 1
                        continue
                    next_records.append(item)

                data[category] = next_records
                deleted[key] = deleted_count

            self._write_unlocked(data)
            return deleted

    def _find_by_file_id(self, category: str, file_id: str) -> List[Dict[str, Any]]:
        if self._collections is None:
            return []
        return [
            self._public_record(item)
            for item in self._collections[category].find({"file_id": file_id})
        ]

    def _delete_by_file_id(self, category: str, file_id: str) -> int:
        if self._collections is None:
            return 0
        result = self._collections[category].delete_many({"file_id": file_id})
        return int(result.deleted_count)

    @staticmethod
    def _user_query(user_id: Optional[str], user_email: Optional[str]) -> Dict[str, Any]:
        clauses = []
        if user_id:
            clauses.append({"user_id": user_id})
        if user_email:
            clauses.append({"user_email": user_email})
        if not clauses:
            return {"user_id": "__missing_user__"}
        if len(clauses) == 1:
            return clauses[0]
        return {"$or": clauses}

    @staticmethod
    def _matches_user(item: Dict[str, Any], user_id: Optional[str], user_email: Optional[str]) -> bool:
        return (
            bool(user_id and item.get("user_id") == user_id)
            or bool(user_email and item.get("user_email") == user_email)
        )

    @staticmethod
    def _public_record(item: Dict[str, Any]) -> Dict[str, Any]:
        return {key: value for key, value in item.items() if key != "_id"}

    @classmethod
    def _chat_record(cls, item: Dict[str, Any]) -> Dict[str, Any]:
        record = cls._public_record(item)
        return {
            "file_id": record.get("file_id"),
            "filename": record.get("filename", ""),
            "question": record.get("question", ""),
            "answer": record.get("answer", ""),
            "sources": record.get("sources", []),
            "created_at": record.get("created_at", ""),
            "display_title": record.get("display_title", ""),
            "memo": record.get("memo", ""),
            "user_id": record.get("user_id", ""),
            "user_email": record.get("user_email", ""),
        }

    def _load_unlocked(self) -> Dict[str, List[Dict[str, Any]]]:
        if not self.path.exists():
            return {key: list(value) for key, value in DEFAULT_RESULTS.items()}

        try:
            with self.path.open("r", encoding="utf-8") as file:
                raw = json.load(file)
        except (json.JSONDecodeError, OSError):
            return {key: list(value) for key, value in DEFAULT_RESULTS.items()}

        return {
            "documents": list(raw.get("documents", [])),
            "summary_results": list(raw.get("summary_results", [])),
            "keyword_results": list(raw.get("keyword_results", [])),
            "chat_results": list(raw.get("chat_results", [])),
        }

    def _write_unlocked(self, data: Dict[str, List[Dict[str, Any]]]) -> None:
        with self.path.open("w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
