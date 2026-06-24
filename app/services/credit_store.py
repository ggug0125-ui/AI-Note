"""Credit transaction store for NoteFlow AI."""

import json
import os
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional


class CreditStore:
    """Persist credit transaction history to MongoDB when configured, otherwise JSON."""

    def __init__(self, path: Path, mongodb_uri: Optional[str] = None):
        self.path = path
        self._lock = threading.Lock()
        self._collection: Optional[Any] = None

        uri = mongodb_uri or os.getenv("MONGODB_URI")
        if uri:
            from pymongo import ASCENDING, DESCENDING, MongoClient

            self._collection = MongoClient(uri)["noteflow"]["credit_transactions"]
            self._collection.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        else:
            self.path.parent.mkdir(parents=True, exist_ok=True)

    def append_transaction(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        next_transaction = dict(transaction)

        if self._collection is not None:
            self._collection.insert_one(next_transaction)
            return self._public_record(next_transaction)

        with self._lock:
            transactions = self._load_unlocked()
            transactions.append(next_transaction)
            self._write_unlocked(transactions)
            return self._public_record(next_transaction)

    def list_transactions(
        self,
        user_id: str,
        user_email: str,
        include_all: bool = False,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        safe_limit = max(0, int(limit))
        normalized_email = str(user_email).strip().lower()

        if self._collection is not None:
            query: Dict[str, Any] = {}
            if not include_all:
                query = {
                    "$or": [
                        {"user_id": user_id},
                        {"user_email": normalized_email},
                    ]
                }

            cursor = self._collection.find(query).sort("created_at", -1)
            if safe_limit:
                cursor = cursor.limit(safe_limit)
            return [self._public_record(transaction) for transaction in cursor]

        transactions = self._load()
        if not include_all:
            transactions = [
                transaction for transaction in transactions
                if self._matches_user(transaction, user_id, normalized_email)
            ]

        sorted_transactions = sorted(
            transactions,
            key=lambda transaction: str(transaction.get("created_at", "")),
            reverse=True,
        )
        if safe_limit:
            sorted_transactions = sorted_transactions[:safe_limit]
        return [self._public_record(transaction) for transaction in sorted_transactions]

    def count_transactions(self) -> int:
        if self._collection is not None:
            return int(self._collection.count_documents({}))

        return len(self._load())

    @staticmethod
    def _public_record(transaction: Dict[str, Any]) -> Dict[str, Any]:
        return {key: value for key, value in transaction.items() if key != "_id"}

    @staticmethod
    def _matches_user(transaction: Dict[str, Any], user_id: str, user_email: str) -> bool:
        return (
            transaction.get("user_id") == user_id
            or str(transaction.get("user_email", "")).strip().lower() == user_email
        )

    def _load(self) -> List[Dict[str, Any]]:
        with self._lock:
            return [self._public_record(transaction) for transaction in self._load_unlocked()]

    def _load_unlocked(self) -> List[Dict[str, Any]]:
        if not self.path.exists():
            return []

        try:
            with self.path.open("r", encoding="utf-8") as file:
                raw = json.load(file)
        except (json.JSONDecodeError, OSError):
            return []

        if isinstance(raw, list):
            return [transaction for transaction in raw if isinstance(transaction, dict)]
        if isinstance(raw, dict):
            transactions = raw.get("transactions", [])
            if isinstance(transactions, list):
                return [transaction for transaction in transactions if isinstance(transaction, dict)]
        return []

    def _write_unlocked(self, transactions: List[Dict[str, Any]]) -> None:
        with self.path.open("w", encoding="utf-8") as file:
            json.dump(transactions, file, ensure_ascii=False, indent=2)
