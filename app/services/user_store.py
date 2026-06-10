"""User store for NoteFlow AI authentication."""

import json
import os
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional


class UserStore:
    """Persist user accounts to MongoDB when configured, otherwise JSON."""

    def __init__(self, path: Path, mongodb_uri: Optional[str] = None):
        self.path = path
        self._lock = threading.Lock()
        self._collection: Optional[Any] = None
        self._duplicate_key_error: Optional[type[Exception]] = None

        uri = mongodb_uri or os.getenv("MONGODB_URI")
        if uri:
            from pymongo import ASCENDING, MongoClient
            from pymongo.errors import DuplicateKeyError

            client = MongoClient(uri)
            self._collection = client["noteflow"]["users"]
            self._duplicate_key_error = DuplicateKeyError
            self._collection.create_index([("email", ASCENDING)], unique=True)
        else:
            self.path.parent.mkdir(parents=True, exist_ok=True)

    def list_users(self) -> List[Dict[str, Any]]:
        if self._collection is not None:
            return [self._public_record(user) for user in self._collection.find({})]

        with self._lock:
            return self._load_unlocked()

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        normalized_email = email.strip().lower()
        if self._collection is not None:
            user = self._collection.find_one({"email": normalized_email})
            return self._public_record(user) if user else None

        return next(
            (user for user in self.list_users() if user.get("email", "").lower() == normalized_email),
            None,
        )

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self._collection is not None:
            user = self._collection.find_one({"user_id": user_id})
            return self._public_record(user) if user else None

        return next(
            (user for user in self.list_users() if user.get("user_id") == user_id),
            None,
        )

    def create_user(self, user: Dict[str, Any]) -> Dict[str, Any]:
        normalized_email = str(user["email"]).strip().lower()
        next_user = {**user, "email": normalized_email}

        if self._collection is not None:
            duplicate_key_error = self._duplicate_key_error
            if duplicate_key_error is None:
                raise RuntimeError("MongoDB duplicate key handler is not configured")

            try:
                self._collection.insert_one(next_user)
            except duplicate_key_error as exc:
                raise ValueError("Email is already registered") from exc
            return self._public_record(next_user)

        with self._lock:
            users = self._load_unlocked()
            if any(existing.get("email", "").lower() == normalized_email for existing in users):
                raise ValueError("Email is already registered")

            users.append(next_user)
            self._write_unlocked(users)
            return next_user

    @staticmethod
    def _public_record(user: Dict[str, Any]) -> Dict[str, Any]:
        return {key: value for key, value in user.items() if key != "_id"}

    def _load_unlocked(self) -> List[Dict[str, Any]]:
        if not self.path.exists():
            return []

        try:
            with self.path.open("r", encoding="utf-8") as file:
                raw = json.load(file)
        except (json.JSONDecodeError, OSError):
            return []

        if isinstance(raw, dict):
            return list(raw.get("users", []))
        if isinstance(raw, list):
            return raw
        return []

    def _write_unlocked(self, users: List[Dict[str, Any]]) -> None:
        with self.path.open("w", encoding="utf-8") as file:
            json.dump({"users": users}, file, ensure_ascii=False, indent=2)
