"""Toss Payments provider skeleton for NoteFlow AI."""

import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from urllib.parse import urlencode

from app.services.payment_provider import PaymentProvider


class TossProvider(PaymentProvider):
    """Toss Payments checkout provider placeholder.

    This intentionally does not call the Toss Payments API yet. It only
    normalizes a ready checkout response so the rest of the payment flow can
    persist Toss payments while the frontend integration is prepared.
    """

    name = "toss"

    def _environment(self) -> str:
        return "live" if os.getenv("TOSS_PAYMENTS_ENV", "test").strip().lower() == "live" else "test"

    def _secret_key(self) -> str:
        """Resolve the Toss secret key for the current environment.

        The key is intentionally not used for an API call yet. The real Toss
        Confirm API integration can use this resolver in the next step.
        """

        if self._environment() == "live":
            return os.getenv("TOSS_LIVE_SECRET_KEY", "").strip()
        return os.getenv("TOSS_TEST_SECRET_KEY", "").strip()

    def create_checkout(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        frontend_base_url = (
            os.getenv("FRONTEND_BASE_URL", "").strip().rstrip("/")
            or str(payment.get("frontend_origin") or "").strip().rstrip("/")
        )
        order_id = str(payment["payment_id"])
        checkout_path = os.getenv("TOSS_CHECKOUT_PATH", "/payments/toss/ready").strip() or "/payments/toss/ready"
        query = urlencode({
            "payment_id": str(payment["payment_id"]),
            "order_id": order_id,
            "product_name": str(payment.get("product_name") or payment.get("plan_name") or "AI Note Credit"),
            "amount": str(payment.get("amount") or 0),
            "credits": str(payment.get("credits") or 0),
            "currency": str(payment.get("currency") or "KRW"),
        })

        if checkout_path.startswith(("http://", "https://")):
            checkout_url = f"{checkout_path}?{query}"
        elif frontend_base_url:
            checkout_url = f"{frontend_base_url}{checkout_path}?{query}"
        else:
            checkout_url = f"{checkout_path}?{query}"

        return {
            "provider": self.name,
            "order_id": order_id,
            "provider_payment_id": order_id,
            "amount": payment.get("amount"),
            "credits": payment.get("credits"),
            "status": "ready",
            "checkout_url": checkout_url,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    def verify_payment(self, provider_payment_id: str) -> Dict[str, Any]:
        # Real Toss Confirm API verification will be connected in the next step.
        _ = self._secret_key()
        return {
            "provider": self.name,
            "provider_payment_id": provider_payment_id,
            "status": "ready",
            "environment": self._environment(),
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }

    def webhook(self, payload: Dict[str, Any], sig_header: Optional[str] = None) -> Dict[str, Any]:
        # Toss webhook signature verification and event handling will be connected
        # with the production Toss API integration.
        return {
            "provider": self.name,
            "status": "ignored",
            "environment": self._environment(),
            "event_type": payload.get("eventType") or payload.get("event_type") or payload.get("status"),
            "signature_present": bool(sig_header),
            "received_at": datetime.now(timezone.utc).isoformat(),
        }
