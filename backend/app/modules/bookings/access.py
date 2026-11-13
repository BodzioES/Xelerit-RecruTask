import hashlib
import secrets
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, UnauthorizedError
from app.modules.bookings.models import Booking
from app.modules.bookings.queries import booking_load_options, get_booking
from app.modules.users.models import User


def create_guest_token() -> tuple[str, str]:
    """Return the opaque token shown once and the hash stored in the database."""
    token = secrets.token_urlsafe(32)
    return token, hash_guest_token(token)


def hash_guest_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_booking_for_access(
    db: Session,
    booking_id: UUID,
    *,
    provider: User | None,
    token: str | None,
) -> Booking:
    """Allow the Provider or a guest holding the booking's access token."""
    if provider is not None:
        return get_booking(db, booking_id)

    if not token:
        raise UnauthorizedError("Booking access token required")

    booking = db.scalar(
        select(Booking)
        .options(*booking_load_options())
        .where(
            Booking.id == booking_id,
            Booking.access_token_hash == hash_guest_token(token),
        )
    )
    if booking is None:
        raise NotFoundError("Booking not found")
    return booking


def get_booking_for_guest(db: Session, booking_id: UUID, token: str | None) -> Booking:
    if not token:
        raise UnauthorizedError("Booking access token required")
    return get_booking_for_access(db, booking_id, provider=None, token=token)
