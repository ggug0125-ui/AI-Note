"""Payment orchestration service for NoteFlow AI."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from app.services.credit_store import CreditStore
from app.services.payment_provider import PaymentProvider
from app.services.payment_store import PaymentStore
from app.services.user_store import UserStore


class PaymentService:
    """Coordinate payment records, provider calls, credit deposits, and history."""

    def __init__(
        self,
        payment_store: PaymentStore,
        user_store: UserStore,
        credit_store: CreditStore,
        provider: PaymentProvider,
    ):
        self.payment_store = payment_store
        self.user_store = user_store
        self.credit_store = credit_store
        self.provider = provider

    def create_checkout(self, product: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        payment_id = uuid.uuid4().hex
        user_id = str(user.get("user_id", ""))
        user_email = str(user.get("email", "")).strip().lower()
        credits = int(product.get("credits", 0) or 0)
        base_credits = int(product.get("base_credits", credits) or 0)
        bonus_credits = int(product.get("bonus_credits", 0) or 0)

        payment = {
            "payment_id": payment_id,
            "user_id": user_id,
            "user_email": user_email,
            "provider": self.provider.name,
            "provider_payment_id": None,
            "checkout_url": None,
            "product_id": product["product_id"],
            "product_name": product["name"],
            "plan_name": product["name"],
            "product_type": product.get("product_type", "credit"),
            "base_credits": base_credits,
            "bonus_credits": bonus_credits,
            "credits": credits,
            "amount": product.get("price", 0),
            "amount_cents": int(product.get("amount_cents", 0) or 0),
            "currency": product.get("currency", "USD"),
            "status": "pending",
            "created_at": now,
            "updated_at": now,
            "paid_at": None,
        }

        provider_checkout = self.provider.create_checkout(payment)
        payment.update({
            "provider_payment_id": provider_checkout.get("provider_payment_id"),
            "checkout_url": provider_checkout.get("checkout_url"),
            "status": provider_checkout.get("status") or "pending",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        return self.payment_store.create_payment(payment)

    def handle_webhook_success(self, payment_id: str) -> Dict[str, Any]:
        payment = self.payment_store.get_payment(payment_id)
        if not payment:
            raise ValueError("Payment not found")
        if payment.get("provider") != self.provider.name:
            raise ValueError("Payment provider mismatch")

        if payment.get("status") == "paid":
            return {
                "payment": payment,
                "credit_usage": {
                    "service": "payment",
                    "type": "deposit",
                    "credits_added": 0,
                    "credits_before": None,
                    "credits_after": None,
                    "already_paid": True,
                },
            }

        provider_payment_id = str(payment.get("provider_payment_id") or "")
        verified = self.provider.verify_payment(provider_payment_id)
        if verified.get("status") != "success":
            failed_payment = self.payment_store.update_payment(
                payment_id,
                {
                    "status": "failed",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "failure_reason": "Payment verification failed",
                },
            ) or payment
            return {"payment": failed_payment, "credit_usage": None}

        paid_at = datetime.now(timezone.utc).isoformat()
        updated_payment = self.payment_store.mark_payment_paid(payment_id, paid_at)
        if not updated_payment:
            refreshed_payment = self.payment_store.get_payment(payment_id)
            if refreshed_payment and refreshed_payment.get("status") == "paid":
                return {
                    "payment": refreshed_payment,
                    "credit_usage": {
                        "service": "payment",
                        "type": "deposit",
                        "credits_added": 0,
                        "credits_before": None,
                        "credits_after": None,
                        "already_paid": True,
                    },
                }
            raise ValueError("Failed to mark payment as paid")

        user = self.user_store.get_by_id(str(payment["user_id"]))
        if not user:
            raise ValueError("User not found")

        credits_before = float(user.get("credits", 0) or 0)
        credits_added = int(payment.get("credits", 0) or 0)
        updated_user = self.user_store.update_credits(str(payment["user_id"]), credits_added)
        if not updated_user:
            raise ValueError("User not found")

        credits_after = float(updated_user.get("credits", 0) or 0)
        transaction = self.credit_store.append_transaction({
            "transaction_id": uuid.uuid4().hex,
            "user_id": str(payment["user_id"]),
            "user_email": str(payment.get("user_email") or "").strip().lower(),
            "type": "deposit",
            "service": "payment",
            "amount": credits_added,
            "credits_before": credits_before,
            "credits_after": credits_after,
            "description": f"Credit purchase: {payment.get('product_name') or payment.get('plan_name')}",
            "metadata": {
                "payment_id": payment_id,
                "provider": self.provider.name,
                "provider_payment_id": provider_payment_id,
                "product_id": payment.get("product_id"),
                "plan_name": payment.get("plan_name"),
            },
            "created_at": paid_at,
        })

        return {
            "payment": updated_payment,
            "transaction": transaction,
            "credit_usage": {
                "service": "payment",
                "type": "deposit",
                "credits_added": credits_added,
                "credits_before": credits_before,
                "credits_after": credits_after,
                "already_paid": False,
            },
        }
