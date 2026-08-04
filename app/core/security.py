import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

import jwt

from app.config import settings

PBKDF2_ITERATIONS = 200_000
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2${PBKDF2_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iterations_str, salt_b64, hash_b64 = stored.split("$")
        if scheme != "pbkdf2":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            base64.b64decode(salt_b64),
            int(iterations_str),
        )
        return hmac.compare_digest(dk, base64.b64decode(hash_b64))
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    expires = datetime.now(UTC) + timedelta(hours=settings.auth_token_expire_hours)
    payload = {"sub": user_id, "exp": expires}
    return jwt.encode(payload, settings.auth_secret_key, algorithm=ALGORITHM)


def verify_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.auth_secret_key, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        return str(sub) if sub else None
    except jwt.PyJWTError:
        return None
