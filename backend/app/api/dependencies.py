from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db.enums import UserRole
from app.db.session import get_db
from app.modules.users.models import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise UnauthorizedError("Authentication required")

    payload = decode_access_token(credentials.credentials)
    try:
        user_id = UUID(str(payload.get("sub")))
    except ValueError as exc:
        raise UnauthorizedError("Invalid access token") from exc

    user = db.get(User, user_id)
    if user is None:
        raise UnauthorizedError("Invalid access token")
    return user


def get_current_provider(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.PROVIDER:
        raise ForbiddenError("Provider access required")
    return user


def get_optional_provider(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Return the Provider for a valid bearer token, or None when none was sent."""
    if credentials is None:
        return None
    user = get_current_user(credentials, db)
    if user.role != UserRole.PROVIDER:
        raise ForbiddenError("Provider access required")
    return user


def get_booking_token(
    x_booking_token: Annotated[str | None, Header(alias="X-Booking-Token")] = None,
    token: Annotated[str | None, Query()] = None,
) -> str | None:
    """Read the guest access token from a header or from a shareable link."""
    return x_booking_token or token
