"""Payment provider contracts for NoteFlow AI."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class PaymentProvider(ABC):
    """Abstract payment provider interface.

    Real providers such as Toss or Stripe can implement the same contract later.
    """

    name: str

    @abstractmethod
    def create_checkout(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        """Create a checkout request with the provider."""

    @abstractmethod
    def verify_payment(self, provider_payment_id: str) -> Dict[str, Any]:
        """Verify a provider payment status."""

    @abstractmethod
    def webhook(self, payload: Any, sig_header: Optional[str] = None) -> Dict[str, Any]:
        """Normalize a provider webhook payload."""
