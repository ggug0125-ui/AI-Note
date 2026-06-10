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
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.services.conversion_service import ConversionError, UnsupportedConversionError, convert_file
from app.services.auth_service import create_access_token, decode_access_token, hash_password, verify_password
from app.services.rag_service import RAGService
from app.services.result_store import ResultStore
from app.services.user_store import UserStore


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / "backend" / ".env", override=False)

UPLOAD_DIR = BASE_DIR / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_PATH = BASE_DIR / "backend" / "data" / "results.json"
USERS_PATH = BASE_DIR / "backend" / "data" / "users.json"
CONVERSION_DIR = BASE_DIR / "backend" / "data" / "conversions"
CONVERSION_DIR.mkdir(parents=True, exist_ok=True)

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
bearer_scheme = HTTPBearer(auto_error=False)
ADMIN_EMAIL = "ggug0125@gmail.com"
ADMIN_NAME = "관리자"
ADMIN_PASSWORD = "102121200"

# In-memory state for this starter backend.
# These values reset when the FastAPI server restarts.
chat_history: List[Dict[str, Any]] = []
uploaded_files: Dict[str, Dict[str, Any]] = {}


SummaryType = Literal["핵심 요약", "회의록 요약", "보고서 요약", "액션아이템"]
ConvertTarget = Literal["csv", "pdf", "txt"]


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


def _public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    is_admin = _normalize_email(str(user["email"])) == _normalize_email(ADMIN_EMAIL)
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": "admin" if is_admin else "user",
        "plan": "Admin" if is_admin else "Free",
    }


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _validate_email(email: str) -> None:
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Invalid email address")


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
    if not upload_path_value:
        raise HTTPException(status_code=404, detail="Uploaded PDF file is missing on disk")

    upload_path = Path(upload_path_value)

    if not upload_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded PDF file is missing on disk")

    text = rag_service.extract_text_from_pdf(str(upload_path))
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="No readable text found in PDF")

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


@app.get("/")
def root():
    return {"status": "ok", "service": "NoteFlow AI"}


@app.post("/auth/register")
async def register_user(request: RegisterRequest):
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


@app.get("/auth/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {"user": _public_user(current_user)}


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

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    file_id = uuid.uuid4().hex
    filename = file.filename or f"{file_id}.pdf"
    dest_path = UPLOAD_DIR / f"{file_id}.pdf"
    created_at = datetime.now(timezone.utc).isoformat()

    try:
        with dest_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    text = rag_service.extract_text_from_pdf(str(dest_path))

    if not text or not text.strip():
        if dest_path.exists():
            dest_path.unlink()

        raise HTTPException(
            status_code=400,
            detail="No readable text found in PDF. This may be a scanned or image-based PDF.",
        )

    chunks = rag_service.split_text(text)

    if not chunks:
        if dest_path.exists():
            dest_path.unlink()

        raise HTTPException(
            status_code=400,
            detail="No text chunks were created from this PDF.",
        )

    rag_service.ingest_documents(
        chunks,
        collection_name="noteflow",
        metadatas=[
            {
                "file_id": file_id,
                "filename": filename,
                "chunk_index": index,
            }
            for index, _ in enumerate(chunks)
        ],
    )

    uploaded_files[file_id] = {
        "file_id": file_id,
        "filename": filename,
        "upload_path": str(dest_path),
        "created_at": created_at,
        "text_length": len(text),
        "chunk_count": len(chunks),
        "status": "ready",
        **_user_identity(current_user),
    }
    document_record = {
        "file_id": file_id,
        "filename": filename,
        "text_length": len(text),
        "chunk_count": len(chunks),
        "status": "ready",
        "created_at": created_at,
        **_user_identity(current_user),
    }
    _safe_save_result("documents", document_record)

    return JSONResponse(
        {
            "file_id": file_id,
            "filename": filename,
            "text_length": len(text),
            "chunk_count": len(chunks),
            "status": "ready",
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
    return {"files": files}


@app.get("/files/{file_id}")
async def get_file(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return _get_file_record(file_id, current_user)


@app.get("/results")
async def get_results(current_user: Dict[str, Any] = Depends(get_current_user)):
    return _filter_records_for_user(result_store.load(), current_user)


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
):
    original_filename = file.filename or "uploaded"
    suffix = Path(original_filename).suffix.lower()
    unique_id = uuid.uuid4().hex[:10]
    source_path = CONVERSION_DIR / f"source_{unique_id}{suffix}"

    try:
        with source_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        await file.close()

    try:
        converted_path = convert_file(
            source_path=source_path,
            original_filename=original_filename,
            target_format=target_format,
            output_dir=CONVERSION_DIR,
            unique_id=unique_id,
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

    download_url = f"http://127.0.0.1:8000/downloads/{converted_path.name}"
    return {
        "status": "success",
        "original_filename": original_filename,
        "converted_filename": converted_path.name,
        "target_format": target_format,
        "download_url": download_url,
    }


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
