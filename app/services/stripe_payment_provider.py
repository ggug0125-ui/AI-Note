"""Stripe payment provider for NoteFlow AI."""

import os
from typing import Any, Dict, Optional

from app.services.payment_provider import PaymentProvider


class StripeProvider(PaymentProvider):
    """Stripe Checkout provider implementation."""

    name = "stripe"

    def _stripe(self) -> Any:
        secret_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
        if not secret_key:
            raise RuntimeError("Stripe is not configured")

        import stripe

        stripe.api_key = secret_key
        return stripe

    def create_checkout(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        stripe = self._stripe()
        frontend_base_url = os.getenv("FRONTEND_BASE_URL", "http://127.0.0.1:3000").strip().rstrip("/")
        payment_id = str(payment["payment_id"])

        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[
                {
                    "price_data": {
                        "currency": str(payment.get("currency", "USD")).lower(),
                        "unit_amount": int(payment.get("amount_cents", 0) or 0),
                        "product_data": {
                            "name": str(payment.get("product_name") or payment.get("plan_name") or "Credits"),
                        },
                    },
                    "quantity": 1,
                }
            ],
            success_url=f"{frontend_base_url}/mypage?tab=payments&payment=success&payment_id={payment_id}",
            cancel_url=f"{frontend_base_url}/mypage?tab=billing&payment=cancel&payment_id={payment_id}",
            customer_email=str(payment.get("user_email") or "") or None,
            metadata={
                "payment_id": payment_id,
                "user_id": str(payment.get("user_id") or ""),
                "user_email": str(payment.get("user_email") or ""),
                "product_id": str(payment.get("product_id") or ""),
                "credits": str(payment.get("credits") or 0),
                "provider": self.name,
            },
        )

        return {
            "provider_payment_id": session.id,
            "checkout_url": session.url,
            "status": "pending",
        }

    def verify_payment(self, provider_payment_id: str) -> Dict[str, Any]:
        stripe = self._stripe()
        session = stripe.checkout.Session.retrieve(provider_payment_id)
        if getattr(session, "payment_status", None) == "paid":
            return {"status": "success"}
        return {"status": "pending"}

    def webhook(self, payload: bytes, sig_header: Optional[str] = None) -> Dict[str, Any]:
        stripe = self._stripe()
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
        if not webhook_secret:
            raise RuntimeError("Stripe webhook is not configured")
        if not sig_header:
            raise RuntimeError("Missing Stripe signature")

        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        if event.get("type") != "checkout.session.completed":
            return {
                "status": "ignored",
                "event_type": event.get("type"),
            }

        session = event["data"]["object"]
        metadata = getattr(session, "metadata", None) or session.get("metadata", {}) or {}
        return {
            "status": "success",
            "event_type": event.get("type"),
            "provider_payment_id": session.get("id") if isinstance(session, dict) else session.id,
            "payment_id": str(metadata.get("payment_id") or ""),
        }
