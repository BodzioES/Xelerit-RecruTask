from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import settings
from app.core.exceptions import UnauthorizedError

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def create_access_token(subject: UUID, role: str) -> tuple[str, int]:
    """Return the signed JWT and its lifetime in seconds."""
    expires_in = settings.access_token_expire_minutes * 60
    now = datetime.now(UTC)
    payload = {
        "sub": str(subject),
        "role": role,
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, expires_in


def decode_access_token(token: str) -> dict[str, object]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except InvalidTokenError as exc:
        raise UnauthorizedError("Invalid or expired access token") from exc
