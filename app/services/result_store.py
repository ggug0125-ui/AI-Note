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
