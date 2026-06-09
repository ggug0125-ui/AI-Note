"""JSON-backed user store for NoteFlow AI authentication."""

import json
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional


class UserStore:
    """Persist MVP user accounts to a local JSON file."""

    def __init__(self, path: Path):
        self.path = path
        self._lock = threading.Lock()
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def list_users(self) -> List[Dict[str, Any]]:
        with self._lock:
            return self._load_unlocked()

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        normalized_email = email.strip().lower()
        return next(
            (user for user in self.list_users() if user.get("email", "").lower() == normalized_email),
            None,
        )

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        return next(
            (user for user in self.list_users() if user.get("user_id") == user_id),
            None,
        )

    def create_user(self, user: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            users = self._load_unlocked()
            normalized_email = str(user["email"]).strip().lower()
            if any(existing.get("email", "").lower() == normalized_email for existing in users):
                raise ValueError("Email is already registered")

            next_user = {**user, "email": normalized_email}
            users.append(next_user)
            self._write_unlocked(users)
            return next_user

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
