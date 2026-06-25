"""Mock payment provider for local credit purchase testing."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.services.payment_provider import PaymentProvider


class MockProvider(PaymentProvider):
    """A no-money provider that simulates a successful payment."""

    name = "mock"

    def create_checkout(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        provider_payment_id = f"mock_{uuid.uuid4().hex}"
        return {
            "provider": self.name,
            "provider_payment_id": provider_payment_id,
            "checkout_url": None,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    def verify_payment(self, provider_payment_id: str) -> Dict[str, Any]:
        return {
            "provider": self.name,
            "provider_payment_id": provider_payment_id,
            "status": "success",
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }

    def webhook(self, payload: Dict[str, Any], sig_header: Optional[str] = None) -> Dict[str, Any]:
        provider_payment_id = str(payload.get("provider_payment_id") or "").strip()
        payment_id = str(payload.get("payment_id") or "").strip()
        return {
            "provider": self.name,
            "payment_id": payment_id,
            "provider_payment_id": provider_payment_id,
            "status": "success",
            "received_at": datetime.now(timezone.utc).isoformat(),
        }
