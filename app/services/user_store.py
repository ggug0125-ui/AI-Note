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
        self._return_document_after: Optional[Any] = None

        uri = mongodb_uri or os.getenv("MONGODB_URI")
        if uri:
            from pymongo import ASCENDING, MongoClient, ReturnDocument
            from pymongo.errors import DuplicateKeyError

            client = MongoClient(uri)
            self._collection = client["noteflow"]["users"]
            self._duplicate_key_error = DuplicateKeyError
            self._return_document_after = ReturnDocument.AFTER
            self._collection.create_index([("email", ASCENDING)], unique=True)
        else:
            self.path.parent.mkdir(parents=True, exist_ok=True)

    def list_users(self) -> List[Dict[str, Any]]:
        if self._collection is not None:
            return [self._public_record(user) for user in self._collection.find({})]

        with self._lock:
            return [self._public_record(user) for user in self._load_unlocked()]

    def count_users(self) -> int:
        if self._collection is not None:
            return int(self._collection.count_documents({}))

        return len(self.list_users())

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        normalized_email = email.strip().lower()
        if self._collection is not None:
            user = self._collection.find_one({"email": normalized_email})
            return self._public_record(user) if user else None

        user = next(
            (user for user in self.list_users() if user.get("email", "").lower() == normalized_email),
            None,
        )
        return self._public_record(user) if user else None

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self._collection is not None:
            user = self._collection.find_one({"user_id": user_id})
            return self._public_record(user) if user else None

        user = next(
            (user for user in self.list_users() if user.get("user_id") == user_id),
            None,
        )
        return self._public_record(user) if user else None

    def get_by_provider_id(self, provider: str, provider_id: str) -> Optional[Dict[str, Any]]:
        normalized_provider = provider.strip().lower()
        normalized_provider_id = str(provider_id).strip()
        if not normalized_provider or not normalized_provider_id:
            return None

        if self._collection is not None:
            user = self._collection.find_one({
                "$and": [
                    {
                        "$or": [
                            {"provider": normalized_provider},
                            {"providers": normalized_provider},
                        ]
                    },
                    {
                        "$or": [
                            {"provider_id": normalized_provider_id},
                            {"kakao_id": normalized_provider_id},
                        ]
                    },
                ]
            })
            return self._public_record(user) if user else None

        def has_provider(user: Dict[str, Any]) -> bool:
            raw_providers = user.get("providers")
            providers = raw_providers if isinstance(raw_providers, list) else []
            return (
                str(user.get("provider") or "").strip().lower() == normalized_provider
                or normalized_provider in [str(item).strip().lower() for item in providers]
            )

        user = next(
            (
                user for user in self.list_users()
                if has_provider(user)
                and (
                    str(user.get("provider_id") or "").strip() == normalized_provider_id
                    or str(user.get("kakao_id") or "").strip() == normalized_provider_id
                )
            ),
            None,
        )
        return self._public_record(user) if user else None

    def create_user(self, user: Dict[str, Any]) -> Dict[str, Any]:
        normalized_email = str(user["email"]).strip().lower()
        next_user = {**user, "email": normalized_email, "credits": int(user.get("credits", 0) or 0)}

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

    def update_credits(self, user_id: str, amount: float) -> Optional[Dict[str, Any]]:
        if self._collection is not None:
            updated_user = self._collection.find_one_and_update(
                {"user_id": user_id},
                {"$inc": {"credits": float(amount)}},
                return_document=self._return_document_after,
            )
            return self._public_record(updated_user) if updated_user else None

        with self._lock:
            users = self._load_unlocked()
            for user in users:
                if user.get("user_id") == user_id:
                    user["credits"] = float(user.get("credits", 0) or 0) + float(amount)
                    self._write_unlocked(users)
                    return self._public_record(user)

        return None

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        next_updates = {key: value for key, value in updates.items() if key not in {"_id", "user_id", "email"}}
        if not next_updates:
            return self.get_by_id(user_id)

        if self._collection is not None:
            updated_user = self._collection.find_one_and_update(
                {"user_id": user_id},
                {"$set": next_updates},
                return_document=self._return_document_after,
            )
            return self._public_record(updated_user) if updated_user else None

        with self._lock:
            users = self._load_unlocked()
            for user in users:
                if user.get("user_id") == user_id:
                    user.update(next_updates)
                    self._write_unlocked(users)
                    return self._public_record(user)

        return None

    def delete_user(self, user_id: str, email: str) -> int:
        normalized_email = str(email).strip().lower()

        if self._collection is not None:
            result = self._collection.delete_one({
                "$or": [
                    {"user_id": user_id},
                    {"email": normalized_email},
                ]
            })
            return int(result.deleted_count)

        with self._lock:
            users = self._load_unlocked()
            next_users = [
                user for user in users
                if user.get("user_id") != user_id and str(user.get("email", "")).lower() != normalized_email
            ]
            deleted_count = len(users) - len(next_users)
            self._write_unlocked(next_users)
            return deleted_count

    @staticmethod
    def _public_record(user: Dict[str, Any]) -> Dict[str, Any]:
        public_user = {key: value for key, value in user.items() if key != "_id"}
        public_user["credits"] = public_user.get("credits", 0) or 0
        return public_user

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
