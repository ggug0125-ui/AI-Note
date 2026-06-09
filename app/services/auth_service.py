"""Password hashing and JWT helpers for NoteFlow AI."""

import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from jose import JWTError, jwt


DEFAULT_SECRET = "change-this-dev-secret"
DEFAULT_ALGORITHM = "HS256"
DEFAULT_EXPIRE_MINUTES = 60 * 24
HASH_NAME = "sha256"
HASH_ITERATIONS = 260_000
SALT_BYTES = 16


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(HASH_NAME, password.encode("utf-8"), salt, HASH_ITERATIONS)
    return f"pbkdf2_{HASH_NAME}${HASH_ITERATIONS}${_b64encode(salt)}${_b64encode(digest)}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        algorithm, iterations, encoded_salt, encoded_digest = hashed_password.split("$", 3)
        if algorithm != f"pbkdf2_{HASH_NAME}":
            return False
        salt = _b64decode(encoded_salt)
        expected_digest = _b64decode(encoded_digest)
        actual_digest = hashlib.pbkdf2_hmac(
            HASH_NAME,
            plain_password.encode("utf-8"),
            salt,
            int(iterations),
        )
    except (ValueError, TypeError):
        return False

    return hmac.compare_digest(actual_digest, expected_digest)


def jwt_secret_key() -> str:
    return os.getenv("JWT_SECRET_KEY", DEFAULT_SECRET)


def jwt_algorithm() -> str:
    return os.getenv("JWT_ALGORITHM", DEFAULT_ALGORITHM)


def access_token_expire_minutes() -> int:
    raw_value = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(DEFAULT_EXPIRE_MINUTES))
    try:
        return int(raw_value)
    except ValueError:
        return DEFAULT_EXPIRE_MINUTES


def create_access_token(subject: str, extra_claims: Dict[str, Any] | None = None) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=access_token_expire_minutes())
    payload: Dict[str, Any] = {
        "sub": subject,
        "exp": expires_at,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, jwt_secret_key(), algorithm=jwt_algorithm())


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, jwt_secret_key(), algorithms=[jwt_algorithm()])
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc
