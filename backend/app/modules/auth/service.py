from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedError
from app.core.security import verify_password
from app.db.enums import UserRole
from app.modules.users.models import User


def authenticate_provider(db: Session, email: str, password: str) -> User:
    """Return the Provider matching the credentials or raise a generic 401."""
    user = db.scalar(select(User).where(func.lower(User.email) == email.lower()))
    if (
        user is None
        or user.role != UserRole.PROVIDER
        or user.password_hash is None
        or not verify_password(password, user.password_hash)
    ):
        raise UnauthorizedError("Invalid email or password")
    return user
