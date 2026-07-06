"""
Main FastAPI application for NoteFlow AI.

This file defines the FastAPI app and endpoints for:
- PDF upload
- RAG query
- chat history
- uploaded file list
- file deletion
"""

import os
import re
import shutil
import uuid
import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.services.auth_service import create_access_token, decode_access_token, hash_password, verify_password
from app.services.convert_engine import (
    ConversionError,
    DownloadNotFoundError,
    UnsupportedConversionError,
    convert_file,
    get_supported_targets,
    format_history,
    is_supported_type,
    next_display_filename,
    resolve_converted_download,
    source_type_from_filename,
)
from app.services.converted_document_store import ConvertedDocumentStore
from app.services.credit_store import CreditStore
from app.services.extractors.base import ExtractionError
from app.services.extractors.factory import get_extractor
from app.services.mock_payment_provider import MockProvider
from app.services.payment_service import PaymentService
from app.services.payment_store import PaymentStore
from app.services.payments.toss_provider import TossProvider
from app.services.rag_service import RAGService
from app.services.result_store import ResultStore
from app.services.review_store import ReviewStore
from app.services.stripe_payment_provider import StripeProvider
from app.services.user_store import UserStore


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "backend" / ".env", override=False)

UPLOAD_DIR = BASE_DIR / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_PATH = BASE_DIR / "backend" / "data" / "results.json"
TAROT_READINGS_PATH = BASE_DIR / "backend" / "data" / "tarot_readings.json"
USERS_PATH = BASE_DIR / "backend" / "data" / "users.json"
CREDIT_TRANSACTIONS_PATH = BASE_DIR / "backend" / "data" / "credit_transactions.json"
PAYMENTS_PATH = BASE_DIR / "backend" / "data" / "payments.json"
CONVERTED_DOCUMENTS_PATH = BASE_DIR / "backend" / "data" / "converted_documents.json"
REVIEWS_PATH = BASE_DIR / "backend" / "data" / "reviews.json"
CONVERSION_DIR = BASE_DIR / "backend" / "data" / "conversions"
CONVERSION_DIR.mkdir(parents=True, exist_ok=True)
CONVERTED_DIR = BASE_DIR / "backend" / "data" / "converted"
CONVERTED_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="NoteFlow AI",
    description="PDF upload + RAG document chat service",
)

# Development CORS setting.
# Readdy preview runs from a different origin, so allow all origins for now.
# For production, replace this with a fixed frontend domain list.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_service = RAGService(
    persist_directory=os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
)
result_store = ResultStore(RESULTS_PATH)
user_store = UserStore(USERS_PATH)
credit_store = CreditStore(CREDIT_TRANSACTIONS_PATH)
payment_store = PaymentStore(PAYMENTS_PATH)
converted_document_store = ConvertedDocumentStore(CONVERTED_DOCUMENTS_PATH)
review_store = ReviewStore(REVIEWS_PATH)


def _get_payment_provider(provider_name: Optional[str] = None):
    provider_name = (provider_name or os.getenv("PAYMENT_PROVIDER", "toss")).strip().lower()
    if provider_name == "toss":
        return TossProvider()
    if provider_name == "stripe":
        return StripeProvider()
    if provider_name == "mock":
        return MockProvider()
    raise ValueError(f"Unsupported payment provider: {provider_name}")


def _get_payment_service(provider_name: Optional[str] = None) -> PaymentService:
    return PaymentService(payment_store, user_store, credit_store, _get_payment_provider(provider_name))


def _get_payment_service_for_payment(payment: Dict[str, Any]) -> PaymentService:
    return _get_payment_service(str(payment.get("provider") or ""))


payment_service = _get_payment_service()
bearer_scheme = HTTPBearer(auto_error=False)
ADMIN_EMAIL = "ggug0125@gmail.com"
ADMIN_NAME = "관리자"
ADMIN_PASSWORD = "102121200"

# In-memory state for this starter backend.
# These values reset when the FastAPI server restarts.
chat_history: List[Dict[str, Any]] = []
uploaded_files: Dict[str, Dict[str, Any]] = {}


SummaryType = Literal["핵심 요약", "회의록 요약", "보고서 요약", "액션아이템"]
ConvertTarget = Literal["pdf", "txt", "xlsx", "hwpx"]
TAROT_TODAY_CATEGORY = "오늘의 운세"
TAROT_OTHER_READING_CREDIT_COST = 3
TAROT_EXTRA_TODAY_CREDIT_COST = 1
TAROT_PRICING_RULE = "tarot_category_based_v1"
SEOUL_TZ = ZoneInfo("Asia/Seoul")


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    file_id: Optional[str] = None


class SummaryRequest(BaseModel):
    file_id: str = Field(..., min_length=1)
    summary_type: SummaryType


class KeywordRequest(BaseModel):
    file_id: str = Field(..., min_length=1)
    count: int = Field(default=12, ge=1, le=50)
    scope: str = Field(default="전체 문서", min_length=1)


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    name: Optional[str] = Field(default=None, max_length=80)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=1, max_length=128)


class AdminCreditAdjustRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    amount: int = Field(..., ge=-100000, le=100000)
    description: str = Field(default="Admin credit adjustment", max_length=300)


class PaymentPrepareRequest(BaseModel):
    product_id: str = Field(..., min_length=1, max_length=80)


class PaymentCheckoutRequest(BaseModel):
    product_id: str = Field(..., min_length=1, max_length=80)
    provider: Optional[str] = Field(default=None, max_length=40)
    frontend_origin: Optional[str] = Field(default=None, max_length=300)
    success_url: Optional[str] = Field(default=None, max_length=500)
    fail_url: Optional[str] = Field(default=None, max_length=500)


class MockPaymentSuccessRequest(BaseModel):
    payment_id: str = Field(..., min_length=1, max_length=120)


class TossPaymentConfirmRequest(BaseModel):
    payment_id: str = Field(..., min_length=1, max_length=120)
    order_id: str = Field(..., min_length=1, max_length=120)
    amount: float
    payment_key: Optional[str] = None


class ReviewCreateRequest(BaseModel):
    type: Literal["review", "question"]
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    title: str = Field(..., min_length=1, max_length=120)
    content: str = Field(..., min_length=1, max_length=4000)


class ReviewUpdateRequest(BaseModel):
    type: Optional[Literal["review", "question"]] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    content: Optional[str] = Field(default=None, min_length=1, max_length=4000)


class ReviewAnswerRequest(BaseModel):
    answer: str = Field(..., min_length=1, max_length=4000)


class TarotCardRequest(BaseModel):
    position: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=80)
    englishName: str = Field(..., min_length=1, max_length=80)
    keywords: List[str] = Field(default_factory=list, max_length=12)
    uprightMeaning: str = Field(..., min_length=1, max_length=600)


class TarotReadingRequest(BaseModel):
    category: str = Field(default="오늘의 운세", min_length=1, max_length=80)
    question: str = Field(default="", max_length=500)
    theme: Literal["witch", "fairy"] = "witch"
    birth_date: Optional[str] = Field(default=None, max_length=20)
    calendar_type: Optional[Literal["solar", "lunar"]] = None
    cards: List[TarotCardRequest] = Field(..., min_length=3, max_length=3)


class TarotReadingResponse(BaseModel):
    overallSummary: str
    pastInsight: str
    presentInsight: str
    futureInsight: str
    advice: str
    caution: str
    finalMessage: str
    source: Literal["openai"]
    credit_usage: Optional[Dict[str, Any]] = None


class TarotSavedReading(BaseModel):
    overallSummary: str
    pastInsight: str
    presentInsight: str
    futureInsight: str
    advice: str
    caution: str
    finalMessage: str
    source: str = Field(..., min_length=1, max_length=20)


class SaveTarotReadingRequest(BaseModel):
    category: str = Field(..., min_length=1, max_length=80)
    question: str = Field(default="", max_length=500)
    theme: Literal["witch", "fairy"] = "witch"
    birth_date: Optional[str] = Field(default=None, max_length=20)
    calendar_type: Optional[Literal["solar", "lunar"]] = None
    cards: List[TarotCardRequest] = Field(..., min_length=3, max_length=3)
    reading: TarotSavedReading
    source: str = Field(..., min_length=1, max_length=20)


class UpdateFileMetadataRequest(BaseModel):
    display_name: Optional[str] = Field(default=None, max_length=120)
    memo: Optional[str] = Field(default=None, max_length=1000)


class UpdateRecordMetadataRequest(BaseModel):
    display_title: Optional[str] = Field(default=None, max_length=160)
    memo: Optional[str] = Field(default=None, max_length=1000)


def _public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    is_admin = _normalize_email(str(user["email"])) == _normalize_email(ADMIN_EMAIL)
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": "admin" if is_admin else "user",
        "plan": "Admin" if is_admin else "Free",
        "credits": user.get("credits", 0) or 0,
    }


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _validate_email(email: str) -> None:
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Invalid email address")


def _frontend_url() -> str:
    frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if not frontend_url:
        raise HTTPException(
            status_code=500,
            detail="Missing OAuth environment variable: FRONTEND_URL",
        )
    return frontend_url


def _normalize_frontend_origin(value: Optional[str]) -> str:
    raw_value = str(value or "").strip().rstrip("/")
    if not raw_value:
        return ""
    parsed = urllib.parse.urlparse(raw_value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    return f"{parsed.scheme}://{parsed.netloc}"


def _request_origin(request: Request) -> str:
    configured_origin = _normalize_frontend_origin(os.getenv("FRONTEND_BASE_URL") or os.getenv("FRONTEND_URL"))
    if configured_origin:
        return configured_origin

    header_origin = _normalize_frontend_origin(request.headers.get("origin"))
    if header_origin:
        return header_origin

    referer_origin = _normalize_frontend_origin(request.headers.get("referer"))
    if referer_origin:
        return referer_origin

    return ""


def _google_oauth_config() -> Dict[str, str]:
    config = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID", "").strip(),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", "").strip(),
        "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI", "").strip(),
    }
    env_names = {
        "client_id": "GOOGLE_CLIENT_ID",
        "client_secret": "GOOGLE_CLIENT_SECRET",
        "redirect_uri": "GOOGLE_REDIRECT_URI",
    }
    missing = [env_names[key] for key, value in config.items() if not value]
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Missing Google OAuth environment variables: {', '.join(missing)}",
        )
    return config


def _google_oauth_failed_redirect() -> RedirectResponse:
    return RedirectResponse(url=f"{_frontend_url()}/login?error=google_oauth_failed", status_code=302)


def _kakao_oauth_config() -> Dict[str, str]:
    config = {
        "client_id": os.getenv("KAKAO_REST_API_KEY", "").strip(),
        "client_secret": os.getenv("KAKAO_CLIENT_SECRET", "").strip(),
        "redirect_uri": os.getenv("KAKAO_REDIRECT_URI", "").strip(),
    }
    env_names = {
        "client_id": "KAKAO_REST_API_KEY",
        "client_secret": "KAKAO_CLIENT_SECRET",
        "redirect_uri": "KAKAO_REDIRECT_URI",
    }
    missing = [env_names[key] for key, value in config.items() if not value]
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Missing Kakao OAuth environment variables: {', '.join(missing)}",
        )
    return config


def _kakao_oauth_failed_redirect() -> RedirectResponse:
    return RedirectResponse(url=f"{_frontend_url()}/login?error=kakao_oauth_failed", status_code=302)


def _post_form(url: str, data: Dict[str, str]) -> Dict[str, Any]:
    encoded_data = urllib.parse.urlencode(data).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=encoded_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, json.JSONDecodeError) as exc:
        raise ValueError("OAuth token request failed") from exc


def _get_json(url: str, headers: Dict[str, str]) -> Dict[str, Any]:
    request = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, json.JSONDecodeError) as exc:
        raise ValueError("OAuth userinfo request failed") from exc


def _issue_user_token(user: Dict[str, Any]) -> str:
    return create_access_token(
        subject=str(user["user_id"]),
        extra_claims={"email": user["email"]},
    )


def _google_providers(existing_user: Dict[str, Any]) -> List[str]:
    raw_providers = existing_user.get("providers")
    if isinstance(raw_providers, list):
        providers = [str(provider).strip().lower() for provider in raw_providers if str(provider).strip()]
    else:
        provider = str(existing_user.get("provider") or "").strip().lower()
        providers = [provider] if provider else []
    if "google" not in providers:
        providers.append("google")
    return providers


def _upsert_google_user(email: str, name: str, picture: str) -> Dict[str, Any]:
    normalized_email = _normalize_email(email)
    _validate_email(normalized_email)

    existing_user = user_store.get_by_email(normalized_email)
    if existing_user:
        updates: Dict[str, Any] = {
            "providers": _google_providers(existing_user),
            "provider": existing_user.get("provider") or "google",
        }
        if picture:
            updates["picture"] = picture
        if not str(existing_user.get("name") or "").strip() and name:
            updates["name"] = name
        return user_store.update_user(str(existing_user["user_id"]), updates) or existing_user

    user = {
        "user_id": uuid.uuid4().hex,
        "email": normalized_email,
        "name": name or normalized_email.split("@", 1)[0],
        "provider": "google",
        "providers": ["google"],
        "picture": picture,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "credits": 0,
    }
    return user_store.create_user(user)


def _oauth_providers(existing_user: Dict[str, Any], provider_name: str) -> List[str]:
    raw_providers = existing_user.get("providers")
    if isinstance(raw_providers, list):
        providers = [str(provider).strip().lower() for provider in raw_providers if str(provider).strip()]
    else:
        provider = str(existing_user.get("provider") or "").strip().lower()
        providers = [provider] if provider else []
    if provider_name not in providers:
        providers.append(provider_name)
    return providers


def _upsert_kakao_user(provider_id: str, email: str, name: str, picture: str) -> Dict[str, Any]:
    normalized_provider_id = str(provider_id).strip()
    if not normalized_provider_id:
        raise ValueError("Kakao provider id was not returned")

    normalized_email = _normalize_email(email) if email else f"kakao_{normalized_provider_id}@kakao.local"
    _validate_email(normalized_email)

    existing_user = user_store.get_by_email(normalized_email)
    if not existing_user:
        existing_user = user_store.get_by_provider_id("kakao", normalized_provider_id)

    if existing_user:
        updates: Dict[str, Any] = {
            "providers": _oauth_providers(existing_user, "kakao"),
            "provider": existing_user.get("provider") or "kakao",
            "provider_id": normalized_provider_id,
            "kakao_id": normalized_provider_id,
        }
        if picture:
            updates["picture"] = picture
        if not str(existing_user.get("name") or "").strip() and name:
            updates["name"] = name
        return user_store.update_user(str(existing_user["user_id"]), updates) or existing_user

    user = {
        "user_id": uuid.uuid4().hex,
        "email": normalized_email,
        "name": name or "Kakao User",
        "provider": "kakao",
        "providers": ["kakao"],
        "provider_id": normalized_provider_id,
        "kakao_id": normalized_provider_id,
        "picture": picture,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "credits": 0,
    }
    return user_store.create_user(user)


def calculate_document_credits(page_count: int) -> float:
    if page_count <= 0:
        return 0
    if page_count <= 2:
        return 1
    return page_count * 0.5


def get_document_credit_details(page_count: Optional[int], metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    extraction_metadata = metadata or {}
    basis_type = str(extraction_metadata.get("basis_type") or ("pages" if page_count is not None else "document"))
    basis_count = extraction_metadata.get("basis_count", page_count if page_count is not None else 1)
    credit_rule = (
        "전체 예상 페이지 기준 차감"
        if basis_type in {"estimated_pages", "estimated_text_pages"}
        else "페이지 기준 차감"
    )

    return {
        "credit_cost": 1 if page_count is None else calculate_document_credits(page_count),
        "pricing_rule": "document_text_basic_v1" if page_count is None else "document_page_based_v1",
        "rule": credit_rule,
        "basis_type": basis_type,
        "basis_count": basis_count,
        "sheet_count": extraction_metadata.get("sheet_count"),
        "sheet_page_counts": extraction_metadata.get("sheet_page_counts"),
    }


def _format_credit_amount(amount: float) -> str:
    return str(int(amount)) if float(amount).is_integer() else str(amount)


def _format_page_label(page_count: Any) -> str:
    try:
        numeric_page_count = float(page_count)
    except (TypeError, ValueError):
        return ""

    if numeric_page_count <= 0:
        return ""

    page_text = str(int(numeric_page_count)) if numeric_page_count.is_integer() else str(numeric_page_count)
    return f"{page_text} Page"


def _format_credit_delta(amount: float) -> str:
    prefix = "+" if amount > 0 else ""
    return f"{prefix}{_format_credit_amount(amount)} Credit"


def _normalize_transaction_amount(transaction: Dict[str, Any]) -> float:
    raw_amount = transaction.get("amount", transaction.get("credit_amount", transaction.get("credit_change", 0)))
    try:
        return float(raw_amount or 0)
    except (TypeError, ValueError):
        return 0.0


def _derive_credit_transaction_details(transaction: Dict[str, Any]) -> Dict[str, Any]:
    metadata = transaction.get("metadata") if isinstance(transaction.get("metadata"), dict) else {}
    service = str(transaction.get("service") or transaction.get("service_type") or "").strip().lower()
    transaction_type = str(transaction.get("type") or "").strip().lower()
    amount = _normalize_transaction_amount(transaction)

    if service in {"document_assistant", "document_upload", "upload"}:
        service_type = "upload"
        action = "document_upload"
        title = "문서 업로드"
    elif service in {"file_conversion", "convert", "conversion"}:
        service_type = "convert"
        action = "file_convert"
        title = "파일 변환"
    elif service == "tarot":
        category = str(metadata.get("category") or "").strip()
        service_type = "tarot"
        action = "tarot_today" if category == TAROT_TODAY_CATEGORY else "tarot_reading"
        title = "AI 타로"
    elif service == "payment" or transaction_type == "deposit":
        service_type = "payment"
        action = "payment_deposit"
        title = "결제 충전"
    elif service == "admin" or transaction_type == "adjust":
        service_type = "admin"
        action = "admin_adjustment"
        title = "크레딧 조정"
    else:
        service_type = service or "credit"
        action = str(transaction.get("action") or transaction_type or "credit_transaction")
        title = str(transaction.get("title") or "크레딧 내역")

    status = str(transaction.get("status") or "").strip().lower()
    if not status:
        if service_type == "payment" and amount > 0:
            status = "deposit"
        elif amount == 0:
            status = "free"
        elif amount < 0:
            status = "charged"
        elif amount > 0:
            status = "deposit"
        else:
            status = "recorded"

    filename = (
        metadata.get("filename")
        or metadata.get("original_filename")
        or transaction.get("filename")
        or ""
    )
    original_type = metadata.get("original_type") or metadata.get("file_type") or transaction.get("original_type")
    target_type = metadata.get("target_type") or transaction.get("target_type")
    page_count = metadata.get("page_count", transaction.get("page_count"))
    page_label = _format_page_label(page_count)
    original_type_text = str(original_type or "").upper()
    target_type_text = str(target_type or "").upper()

    description = str(transaction.get("description") or "").strip()
    if not description or description.startswith("Document analysis:") or description.startswith("Tarot reading:") or description.startswith("Credit purchase:"):
        if service_type == "upload":
            parts = [title]
            if filename:
                parts.append(str(filename))
            if page_label:
                parts.append(page_label)
            description = " · ".join(parts)
        elif service_type == "convert":
            parts = [title]
            if filename:
                parts.append(str(filename))
            if original_type_text and target_type_text:
                parts.append(f"{original_type_text} → {target_type_text}")
            if page_label:
                parts.append(page_label)
            description = " · ".join(parts)
        elif service_type == "tarot":
            category = str(metadata.get("category") or "").strip() or "타로"
            usage_label = "무료 이용" if amount == 0 else _format_credit_delta(amount)
            description = f"{title} · {category} · {usage_label}"
        elif service_type == "payment":
            product_name = metadata.get("product_name") or metadata.get("plan_name") or transaction.get("product_name")
            parts = [title]
            if product_name:
                parts.append(str(product_name))
            parts.append(_format_credit_delta(amount))
            description = " · ".join(parts)

    return {
        "service_type": service_type,
        "action": str(transaction.get("action") or action),
        "title": str(transaction.get("title") or title),
        "description": description,
        "filename": filename,
        "original_type": original_type,
        "target_type": target_type,
        "page_count": page_count,
        "credit_change": amount,
        "credit_amount": transaction.get("credit_amount", amount),
        "status": status,
    }


def _format_credit_transaction(transaction: Dict[str, Any]) -> Dict[str, Any]:
    details = _derive_credit_transaction_details(transaction)
    formatted = dict(transaction)
    formatted.update(details)
    formatted.setdefault("transaction_id", str(transaction.get("transaction_id") or ""))
    formatted.setdefault("amount", _normalize_transaction_amount(transaction))
    return formatted


def _get_pdf_page_count(pdf_path: Path) -> int:
    from pypdf import PdfReader

    reader = PdfReader(str(pdf_path))
    return len(reader.pages)


@app.on_event("startup")
def seed_admin_user() -> None:
    email = _normalize_email(ADMIN_EMAIL)

    if user_store.get_by_email(email):
        print(f"Admin user already exists: {email}")
        return

    admin_user = {
        "user_id": uuid.uuid4().hex,
        "email": email,
        "name": ADMIN_NAME,
        "hashed_password": hash_password(ADMIN_PASSWORD),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "credits": 0,
    }

    try:
        user_store.create_user(admin_user)
    except ValueError:
        print(f"Admin user already exists: {email}")
        return

    print(f"Admin user seeded: {email}")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Dict[str, Any]:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_id = str(payload.get("sub", ""))
    user = user_store.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Optional[Dict[str, Any]]:
    if not credentials or credentials.scheme.lower() != "bearer":
        return None

    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError:
        return None

    user_id = str(payload.get("sub", ""))
    return user_store.get_by_id(user_id)


def _is_admin_user(user: Dict[str, Any]) -> bool:
    return _normalize_email(str(user.get("email", ""))) == _normalize_email(ADMIN_EMAIL)


def require_admin_user(user: Dict[str, Any]) -> None:
    if not _is_admin_user(user):
        raise HTTPException(
            status_code=403,
            detail="AI Document Assistant is available to administrators only.",
        )


def _user_identity(user: Dict[str, Any]) -> Dict[str, str]:
    return {
        "user_id": str(user.get("user_id", "")),
        "user_email": _normalize_email(str(user.get("email", ""))),
    }


def _record_belongs_to_user(record: Dict[str, Any], user: Dict[str, Any]) -> bool:
    if _is_admin_user(user):
        return True

    identity = _user_identity(user)
    return (
        bool(record.get("user_id") and record.get("user_id") == identity["user_id"])
        or bool(record.get("user_email") and record.get("user_email") == identity["user_email"])
    )


def _review_belongs_to_user(review: Dict[str, Any], user: Dict[str, Any]) -> bool:
    identity = _user_identity(user)
    return (
        bool(review.get("user_id") and review.get("user_id") == identity["user_id"])
        or bool(review.get("user_email") and review.get("user_email") == identity["user_email"])
    )


def _public_review(record: Dict[str, Any], current_user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    public = dict(record)
    public["can_edit"] = bool(current_user and (_is_admin_user(current_user) or _review_belongs_to_user(record, current_user)))
    public["can_answer"] = bool(current_user and _is_admin_user(current_user))
    return public


def _build_ready_payment(product: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
    identity = _user_identity(current_user)
    now = datetime.now(timezone.utc).isoformat()
    return {
        "payment_id": uuid.uuid4().hex,
        "user_id": identity["user_id"],
        "user_email": identity["user_email"],
        "product_id": product["product_id"],
        "product_name": product.get("product_name") or product.get("name"),
        "plan_name": product.get("plan_name") or product.get("product_name") or product.get("name"),
        "product_type": product["product_type"],
        "region": product.get("region"),
        "base_credits": int(product.get("base_credits", product.get("credits", 0)) or 0),
        "bonus_credits": int(product.get("bonus_credits", 0) or 0),
        "credits": int(product.get("credits", 0) or 0),
        "amount": product.get("amount", product.get("price", 0)),
        "amount_cents": int(product.get("amount_cents", 0) or 0),
        "currency": product.get("currency", "USD"),
        "status": "ready",
        "provider": product.get("provider") or payment_service.provider.name,
        "provider_payment_id": None,
        "checkout_url": None,
        "created_at": now,
        "updated_at": now,
    }


def _get_file_record(file_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
    file_record = uploaded_files.get(file_id)
    if file_record:
        if not _record_belongs_to_user(file_record, current_user):
            raise HTTPException(status_code=403, detail="Not allowed to access this file")
        return file_record

    file_results = result_store.get_by_file_id(file_id)
    documents = file_results.get("documents", [])
    if not documents:
        raise HTTPException(status_code=404, detail="File not found")

    document = documents[0]
    if not _record_belongs_to_user(document, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to access this file")
    return document


def _read_uploaded_file_text(file_id: str, current_user: Dict[str, Any]) -> str:
    file_record = _get_file_record(file_id, current_user)
    upload_path_value = file_record.get("upload_path")
    if upload_path_value:
        upload_path = Path(upload_path_value)
    else:
        upload_path = UPLOAD_DIR / f"{file_id}.pdf"

    if not upload_path.exists():
        fallback_path = UPLOAD_DIR / f"{file_id}.pdf"
        if fallback_path.exists():
            upload_path = fallback_path
        else:
            raise HTTPException(status_code=404, detail="업로드된 문서 파일을 찾지 못했습니다. 해당 문서를 다시 업로드해주세요.")

    extractor_filename = str(file_record.get("filename") or "")
    if not Path(extractor_filename).suffix:
        extractor_filename = upload_path.name

    try:
        extractor = get_extractor(
            extractor_filename,
            str(file_record.get("content_type") or ""),
        )
        extracted = extractor.extract(upload_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ExtractionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded document: {exc}") from exc

    text = extracted.text
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="No readable text found in document")

    return text


def _safe_save_result(category: str, item: Dict[str, Any]) -> None:
    try:
        result_store.append(category, item)
    except Exception as exc:
        print(f"Failed to save {category}: {exc}")


def _filename_for_file_id(file_id: Optional[str], current_user: Optional[Dict[str, Any]] = None) -> str:
    if not file_id:
        return ""
    file_record = uploaded_files.get(file_id)
    if file_record:
        if current_user and not _record_belongs_to_user(file_record, current_user):
            raise HTTPException(status_code=403, detail="Not allowed to access this file")
        return str(file_record.get("filename", ""))

    file_results = result_store.get_by_file_id(file_id)
    documents = file_results.get("documents", [])
    if documents:
        if current_user and not _record_belongs_to_user(documents[0], current_user):
            raise HTTPException(status_code=403, detail="Not allowed to access this file")
        return str(documents[0].get("filename", ""))

    for category in ("summaries", "keywords", "chats"):
        if file_results[category]:
            if current_user and not _record_belongs_to_user(file_results[category][0], current_user):
                raise HTTPException(status_code=403, detail="Not allowed to access this file")
            return str(file_results[category][0].get("filename", ""))
    return ""


def _filter_records_for_user(data: Dict[str, List[Dict[str, Any]]], current_user: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    if _is_admin_user(current_user):
        return data

    return {
        category: [
            item for item in items
            if _record_belongs_to_user(item, current_user)
        ]
        for category, items in data.items()
    }


def _metadata_updates(request: BaseModel, allowed_fields: List[str]) -> Dict[str, Any]:
    payload = request.dict(exclude_unset=True)
    return {
        field: payload[field]
        for field in allowed_fields
        if field in payload and payload[field] is not None
    }


def _parse_json_object(text: str) -> Dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            raise ValueError("OpenAI response was not valid JSON")
        parsed = json.loads(match.group(0))

    if not isinstance(parsed, dict):
        raise ValueError("OpenAI response JSON must be an object")
    return parsed


def _is_today_tarot_category(category: str) -> bool:
    return category.strip() == TAROT_TODAY_CATEGORY


def _parse_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not value:
        return None

    try:
        text = str(value).strip()
        if text.endswith("Z"):
            text = f"{text[:-1]}+00:00"
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None

    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _seoul_day_bounds(now: Optional[datetime] = None) -> tuple[datetime, datetime]:
    seoul_now = (now or datetime.now(timezone.utc)).astimezone(SEOUL_TZ)
    day_start = seoul_now.replace(hour=0, minute=0, second=0, microsecond=0)
    return day_start, day_start.replace(day=day_start.day) + timedelta(days=1)


def _has_used_free_today_tarot(current_user: Dict[str, Any], now: Optional[datetime] = None) -> bool:
    identity = _user_identity(current_user)
    seoul_start, seoul_end = _seoul_day_bounds(now)
    utc_start = seoul_start.astimezone(timezone.utc).isoformat()
    utc_end = seoul_end.astimezone(timezone.utc).isoformat()

    mongodb_uri = os.getenv("MONGODB_URI")
    if mongodb_uri:
        try:
            from pymongo import MongoClient

            client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=3000)
            collection = client["noteflow"]["tarot_readings"]
            return collection.find_one({
                "user_id": identity["user_id"],
                "category": TAROT_TODAY_CATEGORY,
                "source": "openai",
                "created_at": {"$gte": utc_start, "$lt": utc_end},
            }) is not None
        except Exception as exc:
            print(f"Tarot daily free MongoDB check failed, falling back to JSON: {exc}")

    try:
        with TAROT_READINGS_PATH.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        data = []

    if not isinstance(data, list):
        return False

    for item in data:
        if (
            item.get("user_id") != identity["user_id"]
            or item.get("category") != TAROT_TODAY_CATEGORY
            or item.get("source") != "openai"
        ):
            continue

        created_at = _parse_datetime(item.get("created_at"))
        if not created_at:
            continue

        seoul_created_at = created_at.astimezone(SEOUL_TZ)
        if seoul_start <= seoul_created_at < seoul_end:
            return True

    return False


def _get_tarot_credit_policy(category: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
    if _is_today_tarot_category(category):
        free_daily = not _has_used_free_today_tarot(current_user)
        return {
            "credit_cost": 0 if free_daily else TAROT_EXTRA_TODAY_CREDIT_COST,
            "free_daily": free_daily,
        }

    return {
        "credit_cost": TAROT_OTHER_READING_CREDIT_COST,
        "free_daily": False,
    }


def _format_credit_shortage(required: float, current: float) -> str:
    return (
        "크레딧이 부족합니다. "
        f"필요한 크레딧: {_format_credit_amount(required)}, "
        f"보유 크레딧: {_format_credit_amount(current)}"
    )


def _save_tarot_reading_record(record: Dict[str, Any]) -> None:
    mongodb_uri = os.getenv("MONGODB_URI")
    if mongodb_uri:
        try:
            from pymongo import MongoClient

            client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=3000)
            db = client["noteflow"]
            db["tarot_readings"].insert_one(dict(record))
            return
        except Exception as exc:
            print(f"Tarot reading MongoDB save failed, falling back to JSON: {exc}")

    TAROT_READINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    try:
        if TAROT_READINGS_PATH.exists():
            with TAROT_READINGS_PATH.open("r", encoding="utf-8") as file:
                data = json.load(file)
        else:
            data = []
    except (json.JSONDecodeError, OSError):
        data = []

    if not isinstance(data, list):
        data = []

    data.append(record)
    with TAROT_READINGS_PATH.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


def _list_tarot_reading_records(current_user: Dict[str, Any], limit: int) -> List[Dict[str, Any]]:
    identity = _user_identity(current_user)
    mongodb_uri = os.getenv("MONGODB_URI")
    include_all = _is_admin_user(current_user)

    if mongodb_uri:
        try:
            from pymongo import MongoClient

            client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=3000)
            collection = client["noteflow"]["tarot_readings"]
            cursor = (
                collection.find({} if include_all else {"user_id": identity["user_id"]})
                .sort("created_at", -1)
                .limit(limit)
            )
            return [
                {key: value for key, value in item.items() if key not in {"_id", "user_id", "user_email"}}
                for item in cursor
            ]
        except Exception as exc:
            print(f"Tarot reading MongoDB list failed, falling back to JSON: {exc}")

    try:
        with TAROT_READINGS_PATH.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        data = []

    if not isinstance(data, list):
        data = []

    readings = [
        {key: value for key, value in item.items() if key not in {"user_id", "user_email"}}
        for item in data
        if include_all or item.get("user_id") == identity["user_id"]
    ]
    return sorted(readings, key=lambda item: str(item.get("created_at", "")), reverse=True)[:limit]


def _delete_tarot_reading_record(reading_id: str, current_user: Dict[str, Any]) -> int:
    mongodb_uri = os.getenv("MONGODB_URI")

    if mongodb_uri:
        try:
            from pymongo import MongoClient

            client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=3000)
            client.admin.command("ping")
            delete_filter = {"reading_id": reading_id}
            if not _is_admin_user(current_user):
                delete_filter["user_id"] = _user_identity(current_user)["user_id"]

            collection = client["noteflow"]["tarot_readings"]
            delete_result = collection.delete_one(delete_filter)
            return int(delete_result.deleted_count)
        except Exception as exc:
            print(f"Tarot reading MongoDB delete failed, falling back to JSON: {exc}")

    try:
        with TAROT_READINGS_PATH.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        data = []

    if not isinstance(data, list):
        data = []

    target_record = next(
        (item for item in data if isinstance(item, dict) and item.get("reading_id") == reading_id),
        None,
    )

    if not target_record:
        return 0

    if not _is_admin_user(current_user) and target_record.get("user_id") != _user_identity(current_user)["user_id"]:
        raise HTTPException(status_code=403, detail="Not allowed to delete this tarot reading")

    next_data = [
        item
        for item in data
        if not (isinstance(item, dict) and item.get("reading_id") == reading_id)
    ]
    TAROT_READINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with TAROT_READINGS_PATH.open("w", encoding="utf-8") as file:
        json.dump(next_data, file, ensure_ascii=False, indent=2)

    return 1


def _delete_tarot_reading_records_for_user(user_id: str, user_email: str) -> int:
    mongodb_uri = os.getenv("MONGODB_URI")

    if mongodb_uri:
        try:
            from pymongo import MongoClient

            client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=3000)
            client.admin.command("ping")
            result = client["noteflow"]["tarot_readings"].delete_many({
                "$or": [
                    {"user_id": user_id},
                    {"user_email": user_email},
                ]
            })
            return int(result.deleted_count)
        except Exception as exc:
            print(f"Tarot reading MongoDB user delete failed, falling back to JSON: {exc}")

    try:
        with TAROT_READINGS_PATH.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        data = []

    if not isinstance(data, list):
        data = []

    next_data = [
        item for item in data
        if not (
            isinstance(item, dict)
            and (item.get("user_id") == user_id or item.get("user_email") == user_email)
        )
    ]
    deleted_count = len(data) - len(next_data)
    TAROT_READINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with TAROT_READINGS_PATH.open("w", encoding="utf-8") as file:
        json.dump(next_data, file, ensure_ascii=False, indent=2)

    return deleted_count


@app.get("/")
def root():
    return {"status": "ok", "service": "NoteFlow AI"}


@app.post("/auth/register")
async def register_user(request: RegisterRequest):
    # Registration is temporarily disabled. Keep the original creation flow below
    # so it can be restored quickly when signups are allowed again.
    raise HTTPException(status_code=403, detail="현재 회원가입은 제한되어 있습니다.")

    email = _normalize_email(request.email)
    name = request.name.strip() if request.name else email.split("@", 1)[0]
    _validate_email(email)

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    if user_store.get_by_email(email):
        raise HTTPException(status_code=400, detail="Email is already registered")

    user = {
        "user_id": uuid.uuid4().hex,
        "email": email,
        "name": name,
        "hashed_password": hash_password(request.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "credits": 0,
    }

    try:
        created_user = user_store.create_user(user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "message": "User registered successfully",
        "user": _public_user(created_user),
    }


@app.post("/auth/login")
async def login_user(request: LoginRequest):
    email = _normalize_email(request.email)
    user = user_store.get_by_email(email)

    if not user or not verify_password(request.password, str(user.get("hashed_password", ""))):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    public_user = _public_user(user)
    access_token = create_access_token(
        subject=user["user_id"],
        extra_claims={"email": user["email"]},
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": public_user,
    }


@app.get("/auth/google/login")
async def google_login():
    config = _google_oauth_config()
    params = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    authorization_url = "https://accounts.google.com/o/oauth2/v2/auth"
    return RedirectResponse(
        url=f"{authorization_url}?{urllib.parse.urlencode(params)}",
        status_code=302,
    )


@app.get("/auth/google/callback")
async def google_callback(code: Optional[str] = Query(default=None)):
    if not code:
        return _google_oauth_failed_redirect()

    try:
        config = _google_oauth_config()
        token_response = _post_form(
            "https://oauth2.googleapis.com/token",
            {
                "code": code,
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "redirect_uri": config["redirect_uri"],
                "grant_type": "authorization_code",
            },
        )
        access_token = str(token_response.get("access_token") or "")
        if not access_token:
            raise ValueError("Google access token was not returned")

        userinfo = _get_json(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {"Authorization": f"Bearer {access_token}"},
        )
        email = _normalize_email(str(userinfo.get("email") or ""))
        if not email:
            raise ValueError("Google userinfo did not include an email")

        user = _upsert_google_user(
            email=email,
            name=str(userinfo.get("name") or ""),
            picture=str(userinfo.get("picture") or ""),
        )
        app_token = _issue_user_token(user)
        callback_url = f"{_frontend_url()}/auth/callback?{urllib.parse.urlencode({'token': app_token})}"
        return RedirectResponse(url=callback_url, status_code=302)
    except ValueError:
        return _google_oauth_failed_redirect()


@app.get("/auth/kakao/login")
async def kakao_login():
    config = _kakao_oauth_config()
    params = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "response_type": "code",
    }
    authorization_url = "https://kauth.kakao.com/oauth/authorize"
    return RedirectResponse(
        url=f"{authorization_url}?{urllib.parse.urlencode(params)}",
        status_code=302,
    )


@app.get("/auth/kakao/callback")
async def kakao_callback(code: Optional[str] = Query(default=None)):
    if not code:
        return _kakao_oauth_failed_redirect()

    try:
        config = _kakao_oauth_config()
        token_response = _post_form(
            "https://kauth.kakao.com/oauth/token",
            {
                "code": code,
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "redirect_uri": config["redirect_uri"],
                "grant_type": "authorization_code",
            },
        )
        access_token = str(token_response.get("access_token") or "")
        if not access_token:
            raise ValueError("Kakao access token was not returned")

        userinfo = _get_json(
            "https://kapi.kakao.com/v2/user/me",
            {"Authorization": f"Bearer {access_token}"},
        )
        provider_id = str(userinfo.get("id") or "").strip()
        if not provider_id:
            raise ValueError("Kakao userinfo did not include id")

        kakao_account = userinfo.get("kakao_account")
        if not isinstance(kakao_account, dict):
            kakao_account = {}

        email = _normalize_email(str(kakao_account.get("email") or ""))

        profile = kakao_account.get("profile")
        if not isinstance(profile, dict):
            profile = {}

        user = _upsert_kakao_user(
            provider_id=provider_id,
            email=email,
            name=str(profile.get("nickname") or ""),
            picture=str(profile.get("profile_image_url") or ""),
        )
        app_token = _issue_user_token(user)
        callback_url = f"{_frontend_url()}/auth/callback?{urllib.parse.urlencode({'token': app_token})}"
        return RedirectResponse(url=callback_url, status_code=302)
    except ValueError:
        return _kakao_oauth_failed_redirect()


@app.get("/auth/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {"user": _public_user(current_user)}


@app.get("/credits/me")
async def get_my_credits(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "credits": current_user.get("credits", 0) or 0,
        "user": _public_user(current_user),
    }


@app.get("/reviews")
async def list_reviews(
    type: Optional[Literal["review", "question"]] = Query(default=None),
    q: str = Query(default="", max_length=120),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    reviews = review_store.list_public(type_filter=type, limit=limit, query_text=q)
    return {"reviews": [_public_review(review, current_user) for review in reviews]}


@app.get("/reviews/stats")
async def get_review_stats():
    return review_store.stats()


@app.get("/reviews/{review_id}")
async def get_review(
    review_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    review = review_store.get_public(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"review": _public_review(review, current_user)}


@app.post("/reviews")
async def create_review(
    request: ReviewCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    now = datetime.now(timezone.utc).isoformat()
    identity = _user_identity(current_user)
    display_name = str(current_user.get("name") or "").strip()
    if not display_name:
        display_name = identity["user_email"].split("@")[0] if identity["user_email"] else "AI Note 사용자"

    rating = request.rating
    if request.type == "review" and rating is None:
        rating = 5
    if request.type == "question":
        rating = rating if rating is not None else None

    record = {
        "review_id": uuid.uuid4().hex,
        "user_id": identity["user_id"],
        "user_email": identity["user_email"],
        "display_name": display_name,
        "type": request.type,
        "rating": rating,
        "title": request.title.strip(),
        "content": request.content.strip(),
        "answer": "",
        "answer_by": "",
        "answer_at": None,
        "status": "open",
        "created_at": now,
        "updated_at": now,
    }
    saved_review = review_store.create(record)
    return {"review": _public_review(saved_review, current_user)}


@app.put("/reviews/{review_id}")
async def update_review(
    review_id: str,
    request: ReviewUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    review = review_store.get(review_id)
    if not review or review.get("status") == "hidden":
        raise HTTPException(status_code=404, detail="Review not found")
    is_admin = _is_admin_user(current_user)
    if not is_admin and not _review_belongs_to_user(review, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to update this review")
    if not is_admin and review.get("status") == "answered":
        raise HTTPException(status_code=400, detail="Answered reviews cannot be edited")

    next_type = request.type or str(review.get("type") or "review")
    updates: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if request.type is not None:
        updates["type"] = request.type
    if request.title is not None:
        updates["title"] = request.title.strip()
    if request.content is not None:
        updates["content"] = request.content.strip()
    if next_type == "review":
        updates["rating"] = request.rating if request.rating is not None else review.get("rating") or 5
    else:
        updates["rating"] = request.rating if request.rating is not None else None

    updated_review = review_store.update(review_id, updates)
    if not updated_review:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"review": _public_review(updated_review, current_user)}


@app.delete("/reviews/{review_id}")
async def delete_review(
    review_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    review = review_store.get(review_id)
    if not review or review.get("status") == "hidden":
        raise HTTPException(status_code=404, detail="Review not found")
    if not _is_admin_user(current_user) and not _review_belongs_to_user(review, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to delete this review")

    hidden_review = review_store.hide(review_id, datetime.now(timezone.utc).isoformat())
    if not hidden_review:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review hidden", "review_id": review_id}


@app.post("/reviews/{review_id}/answer")
async def answer_review(
    review_id: str,
    request: ReviewAnswerRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    require_admin_user(current_user)
    review = review_store.get(review_id)
    if not review or review.get("status") == "hidden":
        raise HTTPException(status_code=404, detail="Review not found")

    answer_by = str(current_user.get("name") or current_user.get("email") or ADMIN_EMAIL)
    answered_review = review_store.answer(
        review_id=review_id,
        answer=request.answer.strip(),
        answer_by=answer_by,
        answer_at=datetime.now(timezone.utc).isoformat(),
    )
    if not answered_review:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"review": _public_review(answered_review, current_user)}


@app.get("/payments/products")
async def list_payment_products(current_user: Dict[str, Any] = Depends(get_current_user)):
    payment_store.create_default_credit_products()
    return payment_store.get_credit_products()


@app.post("/payments/prepare")
async def prepare_payment(
    request: PaymentPrepareRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    payment_store.create_default_credit_products()
    product = payment_store.get_product(request.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Payment product not found")

    saved_payment = payment_store.create_payment(_build_ready_payment(product, current_user))

    return {
        "payment_id": saved_payment["payment_id"],
        "product_id": saved_payment["product_id"],
        "product_name": saved_payment["product_name"],
        "plan_name": saved_payment.get("plan_name"),
        "base_credits": saved_payment["base_credits"],
        "bonus_credits": saved_payment["bonus_credits"],
        "credits": saved_payment["credits"],
        "amount": saved_payment["amount"],
        "amount_cents": saved_payment["amount_cents"],
        "currency": saved_payment["currency"],
        "status": saved_payment["status"],
        "provider": saved_payment["provider"],
    }


@app.post("/payments/checkout")
async def create_payment_checkout(
    checkout_request: PaymentCheckoutRequest,
    http_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    payment_store.create_default_credit_products()
    product = payment_store.get_product(checkout_request.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Payment product not found")

    selected_provider = (checkout_request.provider or product.get("provider") or os.getenv("PAYMENT_PROVIDER", "toss")).strip().lower()
    product_provider = str(product.get("provider") or "").strip().lower()
    if product_provider and selected_provider != product_provider:
        raise HTTPException(status_code=400, detail="Payment provider does not match product")

    if selected_provider != "toss" and not _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="해외 결제 기능은 현재 준비 중입니다.")

    try:
        checkout_service = _get_payment_service(selected_provider)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        frontend_origin = (
            _normalize_frontend_origin(checkout_request.frontend_origin)
            or _request_origin(http_request)
        )
        payment = checkout_service.create_checkout(
            product,
            current_user,
            frontend_origin=frontend_origin,
            success_url=checkout_request.success_url,
            fail_url=checkout_request.fail_url,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout: {exc}") from exc

    return {
        "payment_id": payment["payment_id"],
        "product_id": payment.get("product_id"),
        "product_name": payment.get("product_name"),
        "plan_name": payment.get("plan_name"),
        "base_credits": payment.get("base_credits"),
        "bonus_credits": payment.get("bonus_credits"),
        "credits": payment.get("credits"),
        "amount": payment.get("amount"),
        "amount_cents": payment.get("amount_cents"),
        "currency": payment.get("currency"),
        "region": payment.get("region"),
        "checkout_url": payment.get("checkout_url"),
        "provider": payment.get("provider"),
        "order_id": payment.get("order_id"),
        "provider_payment_id": payment.get("provider_payment_id"),
        "status": payment.get("status"),
    }


@app.post("/payments/toss/confirm")
async def confirm_toss_payment(
    request: TossPaymentConfirmRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    payment = payment_store.get_payment(request.payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.get("provider") != "toss":
        raise HTTPException(status_code=400, detail="Payment is not a Toss payment")

    identity = _user_identity(current_user)
    if payment.get("user_id") != identity["user_id"] and not _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Not allowed to confirm this payment")

    if str(payment.get("order_id") or "") != request.order_id:
        raise HTTPException(status_code=400, detail="Toss order_id mismatch")

    try:
        payment_amount = float(payment.get("amount", 0) or 0)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Stored payment amount is invalid")

    if abs(payment_amount - float(request.amount)) > 0.000001:
        raise HTTPException(status_code=400, detail="Toss amount mismatch")

    if payment.get("status") not in {"ready", "pending", "paid"}:
        raise HTTPException(status_code=400, detail="Payment is not ready to confirm")

    # 실제 Toss API 승인 호출은 다음 단계에서 연결.
    # TOSS_PAYMENTS_ENV, TOSS_TEST_SECRET_KEY, TOSS_LIVE_SECRET_KEY 기준으로
    # Toss Confirm API를 먼저 호출한 뒤 이 성공 처리 로직을 재사용하면 됩니다.
    try:
        result = _get_payment_service_for_payment(payment).complete_payment_success(request.payment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Toss confirm failed: {exc}") from exc

    confirmed_payment = result["payment"]
    credit_usage = result.get("credit_usage") or {}
    owner = user_store.get_by_id(str(confirmed_payment.get("user_id") or ""))
    current_credits = credit_usage.get("credits_after")
    if current_credits is None and owner:
        current_credits = owner.get("credits", 0) or 0

    return {
        "payment_id": confirmed_payment.get("payment_id"),
        "order_id": confirmed_payment.get("order_id"),
        "provider": confirmed_payment.get("provider"),
        "status": confirmed_payment.get("status"),
        "amount": confirmed_payment.get("amount"),
        "credits": confirmed_payment.get("credits"),
        "current_credits": current_credits,
        "already_paid": bool(credit_usage.get("already_paid")),
    }


@app.post("/payments/webhook/toss")
async def toss_payment_webhook(request: Request):
    try:
        payload = await request.json()
    except Exception:
        payload = {"raw_body": (await request.body()).decode("utf-8", errors="replace")}

    signature = request.headers.get("Toss-Signature") or request.headers.get("TossPayments-Signature")
    event = TossProvider().webhook(payload, signature)

    return {
        "message": "Toss webhook received",
        "event": event,
    }


@app.post("/payments/mock/success")
async def mock_payment_success(
    request: MockPaymentSuccessRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    payment = payment_store.get_payment(request.payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    identity = _user_identity(current_user)
    if payment.get("user_id") != identity["user_id"] and not _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Not allowed to complete this payment")
    if payment.get("provider") != "mock":
        raise HTTPException(status_code=400, detail="Payment is not a mock payment")

    try:
        result = _get_payment_service_for_payment(payment).handle_webhook_success(request.payment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Mock payment success failed: {exc}") from exc

    return {
        "message": "Mock payment completed",
        **result,
    }


@app.post("/payments/webhook/mock")
async def mock_payment_webhook(request: MockPaymentSuccessRequest):
    payment = payment_store.get_payment(request.payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.get("provider") != "mock":
        raise HTTPException(status_code=400, detail="Payment is not a mock payment")

    try:
        result = _get_payment_service_for_payment(payment).handle_webhook_success(request.payment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Mock webhook failed: {exc}") from exc

    return {
        "message": "Mock webhook processed",
        **result,
    }


@app.post("/payments/webhook/stripe")
async def stripe_payment_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(default=None, alias="stripe-signature"),
):
    stripe_service = _get_payment_service("stripe")
    if stripe_service.provider.name != "stripe":
        raise HTTPException(status_code=400, detail="Stripe provider is not enabled")

    payload = await request.body()
    try:
        event = stripe_service.provider.webhook(payload, stripe_signature)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid Stripe webhook: {exc}") from exc

    if event.get("status") == "ignored":
        return {
            "message": "Stripe webhook ignored",
            "event_type": event.get("event_type"),
        }

    payment_id = str(event.get("payment_id") or "").strip()
    if not payment_id:
        raise HTTPException(status_code=400, detail="Stripe webhook missing payment_id")

    try:
        result = stripe_service.handle_webhook_success(payment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Stripe webhook processing failed: {exc}") from exc

    return {
        "message": "Stripe webhook processed",
        "event_type": event.get("event_type"),
        **result,
    }


@app.get("/payments/me")
async def list_my_payments(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    identity = _user_identity(current_user)
    return payment_store.get_user_payments(identity["user_id"], limit=limit)


@app.get("/payments/history")
async def list_payment_history(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    identity = _user_identity(current_user)
    return payment_store.get_user_payments(identity["user_id"], limit=limit)


@app.get("/credits/transactions")
async def list_credit_transactions(
    limit: int = Query(default=50, ge=1, le=200),
    include_all: bool = Query(default=False),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    can_include_all = include_all and _is_admin_user(current_user)
    identity = _user_identity(current_user)
    transactions = credit_store.list_transactions(
        user_id=identity["user_id"],
        user_email=identity["user_email"],
        include_all=can_include_all,
        limit=limit,
    )
    return {"transactions": [_format_credit_transaction(transaction) for transaction in transactions]}


@app.post("/credits/admin/adjust")
async def adjust_user_credits(
    request: AdminCreditAdjustRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    require_admin_user(current_user)

    if request.amount == 0:
        raise HTTPException(status_code=400, detail="Credit adjustment amount cannot be zero")

    normalized_email = _normalize_email(request.email)
    target_user = user_store.get_by_email(normalized_email)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = user_store.update_credits(str(target_user["user_id"]), request.amount)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")

    balance_after = int(updated_user.get("credits", 0) or 0)
    transaction = {
        "transaction_id": uuid.uuid4().hex,
        "user_id": target_user["user_id"],
        "user_email": normalized_email,
        "type": "adjust",
        "amount": request.amount,
        "balance_after": balance_after,
        "description": request.description,
        "metadata": {
            "admin_user_id": current_user["user_id"],
            "admin_email": current_user["email"],
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    saved_transaction = credit_store.append_transaction(transaction)

    return {
        "message": "크레딧이 조정되었습니다.",
        "user": _public_user(updated_user),
        "transaction": saved_transaction,
    }


@app.delete("/auth/me")
async def delete_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    if _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="관리자 계정은 탈퇴할 수 없습니다.")

    identity = _user_identity(current_user)
    result_delete = result_store.delete_user_records(
        user_id=identity["user_id"],
        user_email=identity["user_email"],
    )
    deleted_results = result_delete.get("deleted", {})
    document_records = result_delete.get("documents", [])
    if not isinstance(document_records, list):
        document_records = []

    deleted_uploaded_files = 0
    deleted_chroma_chunks = 0
    deleted_file_ids: set[str] = set()

    for document in document_records:
        if not isinstance(document, dict):
            continue

        file_id = str(document.get("file_id", ""))
        upload_path_value = document.get("upload_path")

        if file_id:
            deleted_file_ids.add(file_id)

        if upload_path_value:
            upload_path = Path(str(upload_path_value))
        elif file_id:
            upload_path = UPLOAD_DIR / f"{file_id}.pdf"
        else:
            upload_path = None

        if upload_path and upload_path.exists() and upload_path.is_file():
            upload_path.unlink()
            deleted_uploaded_files += 1

        if file_id:
            try:
                deleted_chroma_chunks += rag_service.delete_documents_by_file_id(
                    file_id,
                    collection_name="noteflow",
                )
            except Exception as exc:
                print(f"Failed to delete Chroma chunks for withdrawn user file_id={file_id}: {exc}")

    for file_id, file_record in list(uploaded_files.items()):
        if not _record_belongs_to_user(file_record, current_user):
            continue

        if file_id not in deleted_file_ids:
            upload_path_value = file_record.get("upload_path")
            upload_path = Path(str(upload_path_value)) if upload_path_value else UPLOAD_DIR / f"{file_id}.pdf"
            if upload_path.exists() and upload_path.is_file():
                upload_path.unlink()
                deleted_uploaded_files += 1
            try:
                deleted_chroma_chunks += rag_service.delete_documents_by_file_id(
                    file_id,
                    collection_name="noteflow",
                )
            except Exception as exc:
                print(f"Failed to delete Chroma chunks for withdrawn in-memory file_id={file_id}: {exc}")
        uploaded_files.pop(file_id, None)

    tarot_deleted_count = _delete_tarot_reading_records_for_user(
        identity["user_id"],
        identity["user_email"],
    )
    user_deleted_count = user_store.delete_user(
        identity["user_id"],
        identity["user_email"],
    )

    return {
        "message": "회원탈퇴가 완료되었습니다.",
        "deleted": {
            "user": user_deleted_count,
            "documents": int(deleted_results.get("documents", 0)),
            "chat_history": int(deleted_results.get("chat_history", 0)),
            "summaries": int(deleted_results.get("summaries", 0)),
            "keywords": int(deleted_results.get("keywords", 0)),
            "tarot_readings": tarot_deleted_count,
            "uploaded_files": deleted_uploaded_files,
            "chroma_chunks": deleted_chroma_chunks,
        },
    }


@app.post("/tarot/reading", response_model=TarotReadingResponse)
async def create_tarot_reading(
    request: TarotReadingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    tarot_policy = _get_tarot_credit_policy(request.category, current_user)
    credit_cost = float(tarot_policy["credit_cost"])
    current_credits = float(current_user.get("credits", 0) or 0)
    if current_credits < credit_cost:
        raise HTTPException(
            status_code=402,
            detail=_format_credit_shortage(credit_cost, current_credits),
        )

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured. Use local tarot reading fallback.",
        )

    cards_payload = [
        {
            "position": card.position,
            "name": card.name,
            "englishName": card.englishName,
            "keywords": card.keywords,
            "uprightMeaning": card.uprightMeaning,
        }
        for card in request.cards
    ]
    today_label = datetime.now(timezone.utc).astimezone().strftime("%Y년 %m월 %d일")
    category_guides = {
        "오늘의 운세": "오늘 하루의 흐름, 감정 변화, 선택의 순간, 주의할 점을 중심으로 해석하세요. overallSummary에는 반드시 오늘 날짜를 자연스럽게 포함하세요.",
        "연애운": "관계의 흐름, 감정, 상대와의 거리감, 소통 방식, 선택의 타이밍을 중심으로 해석하세요.",
        "취업/진로운": "일, 진로 선택, 준비 상태, 기회, 방향성, 현실적인 다음 행동을 중심으로 해석하세요.",
        "재물운": "돈의 흐름, 소비와 절약, 기회, 신중함, 무리하지 않는 판단을 중심으로 해석하세요. 투자 확정 조언은 피하세요.",
        "학업운": "집중력, 공부 흐름, 시험과 과제, 꾸준함, 학습 전략을 중심으로 해석하세요.",
        "자유 질문": "사용자의 question을 최우선 주제로 삼고, 모든 항목을 그 질문에 직접 연결해 해석하세요.",
    }
    category_guide = category_guides.get(
        request.category,
        "요청된 카테고리를 해석의 중심 주제로 삼고, 모든 항목을 그 관점에 맞춰 작성하세요.",
    )
    theme_label = "요정 카드" if request.theme == "fairy" else "마녀 카드"
    normalized_birth_date = (request.birth_date or "").strip()
    calendar_label = "음력" if request.calendar_type == "lunar" else "양력"
    personalization_text = (
        f"사용자 생년월일: {normalized_birth_date} ({calendar_label}). "
        "이 정보는 의학적, 과학적, 운명론적 확정 근거가 아니라 재미와 자기성찰을 위한 개인화 참고 정보로만 부드럽게 반영하세요."
        if normalized_birth_date
        else "사용자 생년월일 정보 없음. 생년월일 기반 개인화 표현은 쓰지 마세요."
    )
    prompt = f"""
당신은 한국어로 따뜻하고 현실적인 타로 리딩을 작성하는 도우미입니다.
아래 3장 카드 정보를 바탕으로 과거/현재/미래 흐름을 해석하세요.
요청 category는 반드시 해석의 중심 주제입니다. 모든 JSON 항목은 category 관점에서 작성하세요.
다른 카테고리처럼 보이는 일반 해석을 쓰지 말고, 아래 카테고리별 가이드를 우선 적용하세요.

주의:
- 지나치게 단정하거나 불안감을 주지 마세요.
- 건강, 법률, 투자, 진로 결정은 확정적으로 지시하지 말고 참고용 메시지로 작성하세요.
- 사용자가 스스로 선택할 수 있도록 부드러운 조언으로 표현하세요.
- 각 JSON 값은 짧은 1~2문장으로 작성하세요.
- 반드시 JSON 객체만 반환하세요. 마크다운 코드블록이나 추가 설명은 쓰지 마세요.
- 자유 질문이고 질문이 제공되었다면 question의 핵심 표현을 해석에 반드시 반영하세요.
- 오늘의 운세라면 overallSummary에 "{today_label}" 날짜를 자연스럽게 포함하세요.
- 생년월일 정보가 제공된 경우 재미와 자기성찰용 개인화 참고 정보로만 반영하고, 성격이나 미래를 확정적으로 단정하지 마세요.

서버 기준 오늘 날짜: {today_label}
카테고리: {request.category}
카테고리별 해석 가이드: {category_guide}
카드 테마: {theme_label}
질문: {request.question or "특정 질문 없음"}
개인화 정보: {personalization_text}
카드:
{json.dumps(cards_payload, ensure_ascii=False)}

반환 JSON 스키마:
{{
  "overallSummary": "category 관점의 전체 흐름 요약",
  "pastInsight": "category 관점에서 본 과거의 원인",
  "presentInsight": "category 관점에서 본 현재의 핵심",
  "futureInsight": "category 관점에서 본 미래 가능성",
  "advice": "category 관점의 조언",
  "caution": "category 관점의 주의점",
  "finalMessage": "category와 question을 반영한 따뜻한 한 줄 메시지"
}}
""".strip()

    try:
        model = rag_service._get_chat_model()
        message = model.invoke(prompt)
        content = str(getattr(message, "content", "")).strip()
        parsed = _parse_json_object(content)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI tarot reading failed. Use local tarot reading fallback. Reason: {exc}",
        ) from exc

    required_fields = (
        "overallSummary",
        "pastInsight",
        "presentInsight",
        "futureInsight",
        "advice",
        "caution",
        "finalMessage",
    )
    missing_fields = [field for field in required_fields if not str(parsed.get(field, "")).strip()]
    if missing_fields:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI tarot reading response missing fields: {', '.join(missing_fields)}. Use local tarot reading fallback.",
        )

    return {
        **{field: str(parsed[field]).strip() for field in required_fields},
        "source": "openai",
    }


@app.post("/tarot/readings")
async def save_tarot_reading(
    request: SaveTarotReadingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    should_charge = request.source == "openai"
    tarot_policy = (
        _get_tarot_credit_policy(request.category, current_user)
        if should_charge
        else {"credit_cost": 0, "free_daily": False}
    )
    credit_cost = float(tarot_policy["credit_cost"])
    free_daily = bool(tarot_policy["free_daily"])
    credits_before = float(current_user.get("credits", 0) or 0)
    if credits_before < credit_cost:
        raise HTTPException(
            status_code=402,
            detail=_format_credit_shortage(credit_cost, credits_before),
        )

    created_at = datetime.now(timezone.utc).isoformat()
    reading_id = uuid.uuid4().hex
    normalized_birth_date = (request.birth_date or "").strip()
    record = {
        "reading_id": reading_id,
        "category": request.category,
        "question": request.question,
        "theme": request.theme,
        "birth_date": normalized_birth_date or None,
        "calendar_type": request.calendar_type if normalized_birth_date else None,
        "cards": [card.dict() for card in request.cards],
        "reading": request.reading.dict(),
        "source": request.source,
        "created_at": created_at,
        **_user_identity(current_user),
    }

    try:
        _save_tarot_reading_record(record)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save tarot reading: {exc}",
        ) from exc

    updated_user = current_user
    credits_after = credits_before
    if credit_cost > 0:
        updated_user = user_store.update_credits(str(current_user["user_id"]), -credit_cost)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        credits_after = float(updated_user.get("credits", 0) or 0)

    if should_charge:
        identity = _user_identity(updated_user)
        tarot_amount = -credit_cost
        tarot_status = "free" if credit_cost == 0 else "charged"
        tarot_usage_label = "무료 이용" if credit_cost == 0 else _format_credit_delta(tarot_amount)
        credit_store.append_transaction({
            "transaction_id": uuid.uuid4().hex,
            "user_id": identity["user_id"],
            "user_email": identity["user_email"],
            "type": "usage",
            "service": "tarot",
            "service_type": "tarot",
            "action": "tarot_today" if _is_today_tarot_category(request.category) else "tarot_reading",
            "title": "AI 타로",
            "amount": tarot_amount,
            "credits_before": credits_before,
            "credits_after": credits_after,
            "description": f"AI 타로 · {request.category} · {tarot_usage_label}",
            "status": tarot_status,
            "metadata": {
                "category": request.category,
                "reading_id": reading_id,
                "credit_cost": credit_cost,
                "pricing_rule": TAROT_PRICING_RULE,
                "free_daily": free_daily,
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return {
        "message": "타로 결과가 저장되었습니다.",
        "reading_id": reading_id,
        "created_at": created_at,
        "credit_usage": {
            "service": "tarot",
            "category": request.category,
            "credit_cost": credit_cost,
            "free_daily": free_daily,
            "credits_before": credits_before,
            "credits_after": credits_after,
        },
    }


@app.get("/tarot/readings")
async def list_tarot_readings(
    current_user: Dict[str, Any] = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=100),
):
    return {"readings": _list_tarot_reading_records(current_user, limit)}


@app.delete("/tarot/readings/{reading_id}")
async def delete_tarot_reading(
    reading_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    deleted_count = _delete_tarot_reading_record(reading_id, current_user)
    if deleted_count <= 0:
        raise HTTPException(status_code=404, detail="Tarot reading not found")

    return {
        "message": "타로 기록이 삭제되었습니다.",
        "reading_id": reading_id,
        "deleted_count": deleted_count,
    }


@app.get("/admin/dashboard")
async def get_admin_dashboard(current_user: Dict[str, Any] = Depends(get_current_user)):
    if not _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    result_counts = result_store.count_all()
    return {
        "total_users": user_store.count_users(),
        **result_counts,
    }


@app.post("/auth/logout")
async def logout_user():
    return {"message": "Logged out successfully"}


@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    require_admin_user(current_user)

    file_id = uuid.uuid4().hex
    original_filename = file.filename or ""

    try:
        extractor = get_extractor(original_filename, file.content_type)
    except ValueError as exc:
        await file.close()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    filename = original_filename or f"{file_id}{extractor.file_extension}"
    dest_path = UPLOAD_DIR / f"{file_id}{extractor.file_extension}"
    created_at = datetime.now(timezone.utc).isoformat()

    try:
        with dest_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    try:
        extracted = extractor.extract(dest_path)
    except ExtractionError as exc:
        if dest_path.exists():
            dest_path.unlink()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        if dest_path.exists():
            dest_path.unlink()
        raise HTTPException(status_code=400, detail=f"Failed to read {extractor.file_type} document: {exc}") from exc

    page_count = extracted.page_count
    credit_details = get_document_credit_details(page_count, extracted.metadata)
    credit_cost = float(credit_details["credit_cost"])
    pricing_rule = str(credit_details["pricing_rule"])
    credit_rule = str(credit_details["rule"])
    basis_type = str(credit_details["basis_type"])
    basis_count = credit_details["basis_count"]
    sheet_count = credit_details["sheet_count"]
    sheet_page_counts = credit_details["sheet_page_counts"]

    credits_before = float(current_user.get("credits", 0) or 0)
    if credit_cost > credits_before:
        if dest_path.exists():
            dest_path.unlink()
        raise HTTPException(
            status_code=402,
            detail=(
                "크레딧이 부족합니다. "
                f"필요한 크레딧: {_format_credit_amount(credit_cost)}, "
                f"보유 크레딧: {_format_credit_amount(credits_before)}"
            ),
        )

    text = extracted.text

    if not text or not text.strip():
        if dest_path.exists():
            dest_path.unlink()

        raise HTTPException(
            status_code=400,
            detail=f"No readable text found in {extractor.file_type}.",
        )

    chunks = rag_service.split_text(text)

    if not chunks:
        if dest_path.exists():
            dest_path.unlink()

        raise HTTPException(
            status_code=400,
            detail=f"No text chunks were created from this {extractor.file_type}.",
        )

    rag_service.ingest_documents(
        chunks,
        collection_name="noteflow",
        metadatas=[
            {
                "file_id": file_id,
                "filename": filename,
                "file_type": extractor.file_type,
                "chunk_index": index,
                "created_at": created_at,
            }
            for index, _ in enumerate(chunks)
        ],
    )

    uploaded_files[file_id] = {
        "file_id": file_id,
        "filename": filename,
        "file_type": extractor.file_type,
        "content_type": file.content_type,
        "upload_path": str(dest_path),
        "created_at": created_at,
        "text_length": len(text),
        "chunk_count": len(chunks),
        "page_count": page_count,
        "credit_basis_type": basis_type,
        "credit_basis_count": basis_count,
        "sheet_count": sheet_count,
        "sheet_page_counts": sheet_page_counts,
        "status": "ready",
        **_user_identity(current_user),
    }
    document_record = {
        "file_id": file_id,
        "filename": filename,
        "file_type": extractor.file_type,
        "content_type": file.content_type,
        "upload_path": str(dest_path),
        "text_length": len(text),
        "chunk_count": len(chunks),
        "page_count": page_count,
        "credit_basis_type": basis_type,
        "credit_basis_count": basis_count,
        "sheet_count": sheet_count,
        "sheet_page_counts": sheet_page_counts,
        "status": "ready",
        "created_at": created_at,
        **_user_identity(current_user),
    }
    _safe_save_result("documents", document_record)

    updated_user = current_user
    credits_after = credits_before
    if credit_cost > 0:
        updated_user = user_store.update_credits(str(current_user["user_id"]), -credit_cost)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")

        credits_after = float(updated_user.get("credits", 0) or 0)
        identity = _user_identity(updated_user)
        upload_page_label = _format_page_label(page_count)
        upload_description_parts = ["문서 업로드", filename]
        if upload_page_label:
            upload_description_parts.append(upload_page_label)
        credit_store.append_transaction({
            "transaction_id": uuid.uuid4().hex,
            "user_id": identity["user_id"],
            "user_email": identity["user_email"],
            "type": "usage",
            "service": "document_assistant",
            "service_type": "upload",
            "action": "document_upload",
            "title": "문서 업로드",
            "amount": -credit_cost,
            "credits_before": credits_before,
            "credits_after": credits_after,
            "description": " · ".join(upload_description_parts),
            "status": "charged",
            "metadata": {
                "file_id": file_id,
                "filename": filename,
                "file_type": extractor.file_type,
                "page_count": page_count,
                "credit_cost": credit_cost,
                "pricing_rule": pricing_rule,
                "rule": credit_rule,
                "basis_type": basis_type,
                "basis_count": basis_count,
                "sheet_count": sheet_count,
                "sheet_page_counts": sheet_page_counts,
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return JSONResponse(
        {
            "file_id": file_id,
            "filename": filename,
            "file_type": extractor.file_type,
            "text_length": len(text),
            "chunk_count": len(chunks),
            "page_count": page_count,
            "status": "ready",
            "created_at": created_at,
            "credit_usage": {
                "service": "document_assistant",
                "page_count": page_count,
                "file_type": extractor.file_type,
                "credit_cost": credit_cost,
                "rule": credit_rule,
                "basis_type": basis_type,
                "basis_count": basis_count,
                "sheet_count": sheet_count,
                "sheet_page_counts": sheet_page_counts,
                "credits_before": credits_before,
                "credits_after": credits_after,
            },
        }
    )


@app.post("/query")
async def query_notes(
    request: QueryRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    require_admin_user(current_user)

    question = request.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="question must not be empty")

    if not request.file_id and not _is_admin_user(current_user):
        raise HTTPException(status_code=400, detail="file_id is required")

    if request.file_id:
        _get_file_record(request.file_id, current_user)

    try:
        result = rag_service.answer_question(
            question,
            collection_name="noteflow",
            file_id=request.file_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    created_at = datetime.now(timezone.utc).isoformat()
    chat_record = {
        "file_id": request.file_id,
        "filename": _filename_for_file_id(request.file_id, current_user),
        "question": question,
        "answer": result.get("answer", ""),
        "sources": result.get("sources", []),
        "created_at": created_at,
        **_user_identity(current_user),
    }

    chat_history.append(chat_record)
    _safe_save_result("chat_results", chat_record)

    return result


@app.get("/history")
async def get_history(
    current_user: Dict[str, Any] = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=500),
):
    require_admin_user(current_user)

    identity = _user_identity(current_user)
    history = result_store.list_chat_history(
        user_id=identity["user_id"],
        user_email=identity["user_email"],
        include_all=_is_admin_user(current_user),
        limit=limit,
    )
    return {"history": history}


@app.delete("/history")
async def clear_history(current_user: Dict[str, Any] = Depends(get_current_user)):
    require_admin_user(current_user)

    if _is_admin_user(current_user):
        chat_history.clear()
        return {"message": "Chat history cleared"}

    chat_history[:] = [
        item for item in chat_history
        if not _record_belongs_to_user(item, current_user)
    ]
    return {"message": "Chat history cleared"}


@app.get("/files")
async def list_files(current_user: Dict[str, Any] = Depends(get_current_user)):
    require_admin_user(current_user)

    identity = _user_identity(current_user)
    files = result_store.list_documents(
        user_id=identity["user_id"],
        user_email=identity["user_email"],
        include_all=_is_admin_user(current_user),
    )
    files = sorted(
        files,
        key=lambda item: str(item.get("created_at") or item.get("uploaded_at") or ""),
        reverse=True,
    )
    return {"files": files}


@app.get("/files/{file_id}")
async def get_file(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return _get_file_record(file_id, current_user)


@app.patch("/files/{file_id}")
async def update_file_metadata(
    file_id: str,
    request: UpdateFileMetadataRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    _get_file_record(file_id, current_user)
    identity = _user_identity(current_user)
    updates = _metadata_updates(request, ["display_name", "memo"])

    updated_record = result_store.update_document_metadata(
        file_id=file_id,
        updates=updates,
        user_id=identity["user_id"],
        user_email=identity["user_email"],
        include_all=_is_admin_user(current_user),
    )

    if not updated_record:
        raise HTTPException(status_code=404, detail="File not found")

    if file_id in uploaded_files:
        uploaded_files[file_id].update(updates)

    return {"document": updated_record}


@app.get("/results")
async def get_results(current_user: Dict[str, Any] = Depends(get_current_user)):
    return _filter_records_for_user(result_store.load(), current_user)


@app.patch("/records/{record_type}/{record_id}")
async def update_record_metadata(
    record_type: Literal["summaries", "keywords", "chats"],
    record_id: str,
    request: UpdateRecordMetadataRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    category_by_record_type = {
        "summaries": "summary_results",
        "keywords": "keyword_results",
        "chats": "chat_results",
    }
    identity = _user_identity(current_user)
    updates = _metadata_updates(request, ["display_title", "memo"])
    updated_record = result_store.update_record_metadata(
        category=category_by_record_type[record_type],
        record_id=record_id,
        updates=updates,
        user_id=identity["user_id"],
        user_email=identity["user_email"],
        include_all=_is_admin_user(current_user),
    )

    if not updated_record:
        raise HTTPException(status_code=404, detail="Record not found")

    return {"record": updated_record}


@app.delete("/records/{record_type}/{record_id}")
async def delete_record_metadata(
    record_type: Literal["summaries", "keywords", "chats"],
    record_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    category_by_record_type = {
        "summaries": "summary_results",
        "keywords": "keyword_results",
        "chats": "chat_results",
    }
    identity = _user_identity(current_user)
    target_record = result_store.get_record_by_created_at(
        category=category_by_record_type[record_type],
        record_id=record_id,
        user_id=identity["user_id"],
        user_email=identity["user_email"],
        include_all=_is_admin_user(current_user),
    )

    if not target_record:
        raise HTTPException(status_code=404, detail="Record not found")

    file_id = str(target_record.get("file_id", "")).strip()
    if not file_id:
        raise HTTPException(status_code=404, detail="Record file_id not found")

    deleted = result_store.delete_ai_records_by_file_id(
        file_id=file_id,
        user_id=identity["user_id"],
        user_email=identity["user_email"],
        include_all=_is_admin_user(current_user),
    )

    return {
        "message": "문서 및 관련 AI 기록이 삭제되었습니다.",
        "file_id": file_id,
        "deleted": deleted,
    }


@app.get("/results/{file_id}")
async def get_file_results(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    file_record = _get_file_record(file_id, current_user)
    file_results = result_store.get_by_file_id(file_id)
    file_results = _filter_records_for_user(file_results, current_user)
    filename = file_record.get("filename") or _filename_for_file_id(file_id, current_user)

    return {
        "file_id": file_id,
        "filename": filename,
        **file_results,
    }


@app.delete("/results/{file_id}")
async def delete_file_results(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    require_admin_user(current_user)

    file_record = _get_file_record(file_id, current_user)
    filename = file_record.get("filename") or _filename_for_file_id(file_id, current_user)
    deleted_counts = result_store.delete_by_file_id(file_id)

    return {
        "message": "Result history deleted",
        "file_id": file_id,
        "filename": filename,
        "deleted": deleted_counts,
    }


@app.get("/analysis")
async def get_analysis(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "analysis": [
            {
                "file_id": file_record["file_id"],
                "filename": file_record["filename"],
                "text_length": file_record.get("text_length", 0),
                "chunk_count": file_record.get("chunk_count", 0),
                "uploaded_at": file_record.get("created_at"),
                "status": file_record.get("status", "unknown"),
            }
            for file_record in uploaded_files.values()
            if _record_belongs_to_user(file_record, current_user)
        ]
    }


@app.post("/convert")
async def convert_document(
    file: UploadFile = File(...),
    target_format: ConvertTarget = Form(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    original_filename = file.filename or "uploaded"
    suffix = Path(original_filename).suffix.lower()
    source_type = source_type_from_filename(original_filename)
    if not is_supported_type(source_type):
        raise HTTPException(status_code=400, detail="Unsupported source file type. Use PDF, TXT, XLSX, or HWPX.")

    unique_id = uuid.uuid4().hex
    source_path = CONVERSION_DIR / f"source_{unique_id}{suffix or '.bin'}"

    try:
        with source_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    try:
        conversion = convert_file(
            source_path=source_path,
            source_type=source_type,
            target_type=target_format,
            user_id=str(current_user["user_id"]),
            filename=original_filename,
        )
    except UnsupportedConversionError as exc:
        return JSONResponse(
            status_code=200,
            content={
                "status": "unsupported",
                "message": str(exc),
                "original_filename": original_filename,
                "target_format": target_format,
            },
        )
    except ConversionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if source_path.exists():
            source_path.unlink()

    credit_cost = conversion.credit_cost
    credits_before = float(current_user.get("credits", 0) or 0)
    if credit_cost > credits_before:
        if conversion.output_path.exists():
            conversion.output_path.unlink()
        raise HTTPException(
            status_code=402,
            detail=(
                "Insufficient credits. "
                f"Required: {_format_credit_amount(credit_cost)}, "
                f"available: {_format_credit_amount(credits_before)}"
            ),
        )

    updated_user = current_user
    credits_after = credits_before
    if credit_cost > 0:
        updated_user = user_store.update_credits(str(current_user["user_id"]), -credit_cost)
        if not updated_user:
            if conversion.output_path.exists():
                conversion.output_path.unlink()
            raise HTTPException(status_code=404, detail="User not found")
        credits_after = float(updated_user.get("credits", 0) or 0)

        identity = _user_identity(updated_user)
        conversion_page_label = _format_page_label(conversion.page_count)
        conversion_description_parts = [
            "파일 변환",
            original_filename,
            f"{conversion.original_type.upper()} → {conversion.target_type.upper()}",
        ]
        if conversion_page_label:
            conversion_description_parts.append(conversion_page_label)
        credit_store.append_transaction({
            "transaction_id": uuid.uuid4().hex,
            "user_id": identity["user_id"],
            "user_email": identity["user_email"],
            "type": "usage",
            "service": "file_conversion",
            "service_type": "convert",
            "action": "file_convert",
            "title": "파일 변환",
            "amount": -credit_cost,
            "credits_before": credits_before,
            "credits_after": credits_after,
            "description": " · ".join(conversion_description_parts),
            "status": "charged",
            "metadata": {
                "conversion_id": conversion.conversion_id,
                "original_filename": original_filename,
                "original_type": conversion.original_type,
                "target_type": conversion.target_type,
                "page_count": conversion.page_count,
                "credit_cost": credit_cost,
                "pricing_rule": "file_conversion_page_based_v1",
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    identity = _user_identity(updated_user)
    created_at = datetime.now(timezone.utc).isoformat()
    display_filename = next_display_filename(
        store=converted_document_store,
        user_id=identity["user_id"],
        user_email=identity["user_email"],
        original_filename=original_filename,
        target_type=conversion.target_type,
    )
    record = converted_document_store.append({
        "conversion_id": conversion.conversion_id,
        "user_id": identity["user_id"],
        "user_email": identity["user_email"],
        "original_filename": original_filename,
        "original_type": conversion.original_type,
        "target_type": conversion.target_type,
        "target_format": conversion.target_format,
        "output_filename": conversion.output_filename,
        "display_filename": display_filename,
        "output_path": str(conversion.output_path),
        "page_count": conversion.page_count,
        "credit_cost": credit_cost,
        "status": conversion.status,
        "message": conversion.message,
        "created_at": created_at,
    })

    download_url = f"/convert/download/{conversion.conversion_id}"
    return {
        "status": "success",
        "conversion_id": conversion.conversion_id,
        "original_filename": original_filename,
        "converted_filename": conversion.output_filename,
        "output_filename": conversion.output_filename,
        "display_filename": display_filename,
        "original_type": conversion.original_type,
        "target_type": conversion.target_type,
        "target_format": conversion.target_type,
        "page_count": conversion.page_count,
        "credit_cost": credit_cost,
        "message": conversion.message,
        "download_url": download_url,
        "record": record,
        "credit_usage": {
            "service": "file_conversion",
            "page_count": conversion.page_count,
            "credit_cost": credit_cost,
            "credits_before": credits_before,
            "credits_after": credits_after,
        },
    }


@app.get("/convert/history")
async def get_conversion_history(
    current_user: Dict[str, Any] = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=200),
):
    identity = _user_identity(current_user)
    history = converted_document_store.list_for_user(
        user_id=identity["user_id"],
        user_email=identity["user_email"],
        limit=limit,
    )
    return {"history": format_history(history)}


@app.get("/convert/targets/{source_type}")
async def get_conversion_targets(source_type: str):
    return {"source_type": source_type, "targets": get_supported_targets(source_type)}


@app.get("/convert/download/{conversion_id}")
async def download_converted_document(
    conversion_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    identity = _user_identity(current_user)
    try:
        download_file = resolve_converted_download(
            store=converted_document_store,
            conversion_id=conversion_id,
            user_id=identity["user_id"],
            user_email=identity["user_email"],
        )
    except DownloadNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FileResponse(
        path=download_file.path,
        filename=download_file.filename,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": (
                "attachment; "
                f"filename*=UTF-8''{urllib.parse.quote(download_file.filename)}"
            )
        },
    )


@app.get("/downloads/{filename}")
async def download_conversion(filename: str):
    safe_name = Path(filename).name
    file_path = CONVERSION_DIR / safe_name

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Converted file not found")

    return FileResponse(
        path=file_path,
        filename=safe_name,
        media_type="application/octet-stream",
    )


@app.post("/summary")
async def summarize_document(
    request: SummaryRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    require_admin_user(current_user)

    text = _read_uploaded_file_text(request.file_id, current_user)

    try:
        summary = rag_service.summarize_text(text, request.summary_type)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    file_record = _get_file_record(request.file_id, current_user)
    created_at = datetime.now(timezone.utc).isoformat()
    summary_record = {
        "file_id": request.file_id,
        "filename": file_record["filename"],
        "summary_type": request.summary_type,
        "summary": summary,
        "created_at": created_at,
        **_user_identity(current_user),
    }
    _safe_save_result("summary_results", summary_record)

    return {
        "file_id": request.file_id,
        "filename": file_record["filename"],
        "summary_type": request.summary_type,
        "summary": summary,
        "created_at": created_at,
    }


@app.post("/keywords")
async def extract_keywords(
    request: KeywordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    require_admin_user(current_user)

    text = _read_uploaded_file_text(request.file_id, current_user)

    try:
        result = rag_service.extract_keywords_from_text(
            text,
            count=request.count,
            scope=request.scope,
        )
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    file_record = _get_file_record(request.file_id, current_user)
    created_at = datetime.now(timezone.utc).isoformat()
    keyword_record = {
        "file_id": request.file_id,
        "filename": file_record["filename"],
        "count": request.count,
        "scope": request.scope,
        "keywords": result.get("keywords", []),
        "topics": result.get("topics", []),
        "created_at": created_at,
        **_user_identity(current_user),
    }
    _safe_save_result("keyword_results", keyword_record)

    return {
        "file_id": request.file_id,
        "filename": file_record["filename"],
        "count": request.count,
        "scope": request.scope,
        "keywords": result.get("keywords", []),
        "topics": result.get("topics", []),
        "created_at": created_at,
    }


@app.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    require_admin_user(current_user)

    file_record = _get_file_record(file_id, current_user)
    uploaded_files.pop(file_id, None)

    filename = file_record["filename"]
    upload_path_value = file_record.get("upload_path")

    if upload_path_value and Path(upload_path_value).exists():
        upload_path = Path(upload_path_value)
        upload_path.unlink()

    deleted_chunks = 0
    deleted_results = {"summaries": 0, "keywords": 0, "chats": 0}

    try:
        deleted_chunks = rag_service.delete_documents_by_file_id(
            file_id,
            collection_name="noteflow",
        )
    except Exception as exc:
        return {
            "message": "File deleted, but related Chroma chunks could not be deleted",
            "file_id": file_id,
            "filename": filename,
            "deleted_chunks": deleted_chunks,
            "deleted_results": deleted_results,
            "chroma_delete_error": str(exc),
        }

    try:
        deleted_results = result_store.delete_by_file_id(file_id)
    except Exception as exc:
        return {
            "message": "File deleted, but related result history could not be deleted",
            "file_id": file_id,
            "filename": filename,
            "deleted_chunks": deleted_chunks,
            "deleted_results": deleted_results,
            "result_delete_error": str(exc),
        }

    return {
        "message": "File deleted",
        "file_id": file_id,
        "filename": filename,
        "deleted_chunks": deleted_chunks,
        "deleted_results": deleted_results,
    }
