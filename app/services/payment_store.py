"""Payment product and payment preparation store for NoteFlow AI."""

import json
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


DEFAULT_CREDIT_PRODUCTS: List[Dict[str, Any]] = [
    {
        "product_id": "kr_starter",
        "product_name": "Starter",
        "plan_name": "Starter",
        "name": "Starter",
        "product_type": "credit",
        "region": "kr",
        "provider": "toss",
        "amount": 5900,
        "price": 5900,
        "amount_cents": 590000,
        "currency": "KRW",
        "base_credits": 50,
        "bonus_credits": 10,
        "credits": 60,
        "status": "active",
        "badge": "Starter",
        "description": "Domestic Toss starter credit pack",
    },
    {
        "product_id": "kr_standard",
        "product_name": "Standard",
        "plan_name": "Standard",
        "name": "Standard",
        "product_type": "credit",
        "region": "kr",
        "provider": "toss",
        "amount": 9900,
        "price": 9900,
        "amount_cents": 990000,
        "currency": "KRW",
        "base_credits": 100,
        "bonus_credits": 20,
        "credits": 120,
        "status": "active",
        "badge": "Popular",
        "description": "Domestic Toss standard credit pack",
    },
    {
        "product_id": "kr_premium",
        "product_name": "Premium",
        "plan_name": "Premium",
        "name": "Premium",
        "product_type": "credit",
        "region": "kr",
        "provider": "toss",
        "amount": 19900,
        "price": 19900,
        "amount_cents": 1990000,
        "currency": "KRW",
        "base_credits": 220,
        "bonus_credits": 40,
        "credits": 260,
        "status": "active",
        "badge": "Premium",
        "description": "Domestic Toss premium credit pack",
    },
    {
        "product_id": "kr_business",
        "product_name": "Business",
        "plan_name": "Business",
        "name": "Business",
        "product_type": "credit",
        "region": "kr",
        "provider": "toss",
        "amount": 49900,
        "price": 49900,
        "amount_cents": 4990000,
        "currency": "KRW",
        "base_credits": 600,
        "bonus_credits": 100,
        "credits": 700,
        "status": "active",
        "badge": "Business",
        "description": "Domestic Toss business credit pack",
    },
    {
        "product_id": "global_starter",
        "product_name": "Starter Global",
        "plan_name": "Starter Global",
        "name": "Starter Global",
        "product_type": "credit",
        "region": "global",
        "provider": "stripe",
        "amount": 5,
        "price": 5,
        "amount_cents": 500,
        "currency": "USD",
        "base_credits": 50,
        "bonus_credits": 10,
        "credits": 60,
        "status": "active",
        "badge": "Global",
        "description": "Global Stripe candidate starter credit pack",
    },
    {
        "product_id": "global_standard",
        "product_name": "Standard Global",
        "plan_name": "Standard Global",
        "name": "Standard Global",
        "product_type": "credit",
        "region": "global",
        "provider": "stripe",
        "amount": 9,
        "price": 9,
        "amount_cents": 900,
        "currency": "USD",
        "base_credits": 100,
        "bonus_credits": 20,
        "credits": 120,
        "status": "active",
        "badge": "Global Popular",
        "description": "Global Stripe candidate standard credit pack",
    },
    {
        "product_id": "global_premium",
        "product_name": "Premium Global",
        "plan_name": "Premium Global",
        "name": "Premium Global",
        "product_type": "credit",
        "region": "global",
        "provider": "stripe",
        "amount": 19,
        "price": 19,
        "amount_cents": 1900,
        "currency": "USD",
        "base_credits": 220,
        "bonus_credits": 40,
        "credits": 260,
        "status": "active",
        "badge": "Global Premium",
        "description": "Global Stripe candidate premium credit pack",
    },
    {
        "product_id": "global_business",
        "product_name": "Business Global",
        "plan_name": "Business Global",
        "name": "Business Global",
        "product_type": "credit",
        "region": "global",
        "provider": "stripe",
        "amount": 49,
        "price": 49,
        "amount_cents": 4900,
        "currency": "USD",
        "base_credits": 600,
        "bonus_credits": 100,
        "credits": 700,
        "status": "active",
        "badge": "Global Business",
        "description": "Global Stripe candidate business credit pack",
    },
]


class PaymentStore:
    """Persist payment products and prepared payments to MongoDB when configured."""

    def __init__(self, path: Path, mongodb_uri: Optional[str] = None):
        self.path = path
        self._lock = threading.Lock()
        self._product_collection: Optional[Any] = None
        self._payment_collection: Optional[Any] = None

        uri = mongodb_uri or os.getenv("MONGODB_URI")
        if uri:
            from pymongo import ASCENDING, DESCENDING, MongoClient

            db = MongoClient(uri)["noteflow"]
            self._product_collection = db["payment_products"]
            self._payment_collection = db["payments"]
            self._product_collection.create_index([("product_id", ASCENDING)], unique=True)
            self._product_collection.create_index(
                [("product_type", ASCENDING), ("status", ASCENDING), ("region", ASCENDING), ("amount", ASCENDING)]
            )
            self._payment_collection.create_index([("payment_id", ASCENDING)], unique=True)
            self._payment_collection.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        else:
            self.path.parent.mkdir(parents=True, exist_ok=True)

    def create_default_credit_products(self) -> None:
        now = datetime.now(timezone.utc).isoformat()
        default_product_ids = {product["product_id"] for product in DEFAULT_CREDIT_PRODUCTS}

        if self._product_collection is not None:
            for product in DEFAULT_CREDIT_PRODUCTS:
                self._product_collection.update_one(
                    {"product_id": product["product_id"]},
                    {
                        "$set": {**product, "updated_at": now},
                        "$setOnInsert": {"created_at": now},
                    },
                    upsert=True,
                )
            self._product_collection.update_many(
                {
                    "product_type": "credit",
                    "product_id": {"$nin": list(default_product_ids)},
                },
                {"$set": {"status": "inactive", "updated_at": now}},
            )
            return

        with self._lock:
            data = self._load_unlocked()
            products_by_id = {
                product.get("product_id"): dict(product)
                for product in data["payment_products"]
                if product.get("product_id")
            }

            for product in DEFAULT_CREDIT_PRODUCTS:
                existing = products_by_id.get(product["product_id"], {})
                products_by_id[product["product_id"]] = {
                    **existing,
                    **product,
                    "created_at": existing.get("created_at", now),
                    "updated_at": now,
                }

            for product_id, product in products_by_id.items():
                if product.get("product_type") == "credit" and product_id not in default_product_ids:
                    product["status"] = "inactive"
                    product["updated_at"] = now

            data["payment_products"] = list(products_by_id.values())
            self._write_unlocked(data)

    def get_credit_products(self) -> List[Dict[str, Any]]:
        query = {"product_type": "credit", "status": "active"}

        if self._product_collection is not None:
            cursor = self._product_collection.find(query).sort([("region", 1), ("amount", 1)])
            return [self._public_record(product) for product in cursor]

        products = [
            product for product in self._load().get("payment_products", [])
            if product.get("product_type") == "credit" and product.get("status") == "active"
        ]
        return [
            self._public_record(product)
            for product in sorted(products, key=lambda item: (str(item.get("region", "")), item.get("amount", item.get("price", 0))))
        ]

    def get_product(self, product_id: str) -> Optional[Dict[str, Any]]:
        query = {"product_id": product_id, "status": "active"}

        if self._product_collection is not None:
            product = self._product_collection.find_one(query)
            return self._public_record(product) if product else None

        product = next(
            (
                product for product in self._load().get("payment_products", [])
                if product.get("product_id") == product_id and product.get("status") == "active"
            ),
            None,
        )
        return self._public_record(product) if product else None

    def create_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        payment = dict(payment_data)

        if self._payment_collection is not None:
            self._payment_collection.insert_one(payment)
            return self._public_record(payment)

        with self._lock:
            data = self._load_unlocked()
            data["payments"].append(payment)
            self._write_unlocked(data)
            return self._public_record(payment)

    def update_payment(self, payment_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        next_updates = dict(updates)

        if self._payment_collection is not None:
            self._payment_collection.update_one({"payment_id": payment_id}, {"$set": next_updates})
            payment = self._payment_collection.find_one({"payment_id": payment_id})
            return self._public_record(payment) if payment else None

        with self._lock:
            data = self._load_unlocked()
            for payment in data["payments"]:
                if payment.get("payment_id") == payment_id:
                    payment.update(next_updates)
                    self._write_unlocked(data)
                    return self._public_record(payment)

        return None

    def mark_payment_paid(self, payment_id: str, paid_at: str) -> Optional[Dict[str, Any]]:
        updates = {
            "status": "paid",
            "paid_at": paid_at,
            "updated_at": paid_at,
        }

        if self._payment_collection is not None:
            result = self._payment_collection.update_one(
                {"payment_id": payment_id, "status": {"$ne": "paid"}},
                {"$set": updates},
            )
            if result.modified_count <= 0:
                return None

            payment = self._payment_collection.find_one({"payment_id": payment_id})
            return self._public_record(payment) if payment else None

        with self._lock:
            data = self._load_unlocked()
            for payment in data["payments"]:
                if payment.get("payment_id") == payment_id:
                    if payment.get("status") == "paid":
                        return None
                    payment.update(updates)
                    self._write_unlocked(data)
                    return self._public_record(payment)

        return None

    def get_payment(self, payment_id: str) -> Optional[Dict[str, Any]]:
        if self._payment_collection is not None:
            payment = self._payment_collection.find_one({"payment_id": payment_id})
            return self._public_record(payment) if payment else None

        payment = next(
            (
                payment for payment in self._load().get("payments", [])
                if payment.get("payment_id") == payment_id
            ),
            None,
        )
        return self._public_record(payment) if payment else None

    def get_user_payments(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        safe_limit = max(0, int(limit))

        if self._payment_collection is not None:
            cursor = self._payment_collection.find({"user_id": user_id}).sort("created_at", -1)
            if safe_limit:
                cursor = cursor.limit(safe_limit)
            return [self._public_record(payment) for payment in cursor]

        payments = [
            payment for payment in self._load().get("payments", [])
            if payment.get("user_id") == user_id
        ]
        sorted_payments = sorted(
            payments,
            key=lambda payment: str(payment.get("created_at", "")),
            reverse=True,
        )
        if safe_limit:
            sorted_payments = sorted_payments[:safe_limit]
        return [self._public_record(payment) for payment in sorted_payments]

    @staticmethod
    def _default_products_with_timestamps() -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        return [
            {
                **product,
                "created_at": now,
                "updated_at": now,
            }
            for product in DEFAULT_CREDIT_PRODUCTS
        ]

    @staticmethod
    def _public_record(record: Dict[str, Any]) -> Dict[str, Any]:
        return {key: value for key, value in record.items() if key != "_id"}

    def _load(self) -> Dict[str, List[Dict[str, Any]]]:
        with self._lock:
            return self._load_unlocked()

    def _load_unlocked(self) -> Dict[str, List[Dict[str, Any]]]:
        if not self.path.exists():
            return {"payment_products": [], "payments": []}

        try:
            with self.path.open("r", encoding="utf-8") as file:
                raw = json.load(file)
        except (json.JSONDecodeError, OSError):
            return {"payment_products": [], "payments": []}

        if not isinstance(raw, dict):
            return {"payment_products": [], "payments": []}

        return {
            "payment_products": [
                product for product in raw.get("payment_products", [])
                if isinstance(product, dict)
            ],
            "payments": [
                payment for payment in raw.get("payments", [])
                if isinstance(payment, dict)
            ],
        }

    def _write_unlocked(self, data: Dict[str, List[Dict[str, Any]]]) -> None:
        with self.path.open("w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
