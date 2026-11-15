from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import ColumnElement, and_, or_, select
from sqlalchemy.orm import Load, Session, joinedload, selectinload

from app.core.exceptions import NotFoundError
from app.db.enums import BookingStatus
from app.modules.bookings.models import Booking, BookingEmployee

CLOSED_STATUSES = (BookingStatus.COMPLETED, BookingStatus.REJECTED, BookingStatus.CANCELLED)


def booking_load_options() -> tuple[Load, ...]:
    return (
        joinedload(Booking.vehicle),
        selectinload(Booking.locations),
        selectinload(Booking.assignments).selectinload(BookingEmployee.employee),
        selectinload(Booking.items),
        selectinload(Booking.moving_details),
        selectinload(Booking.handover),
        selectinload(Booking.events),
    )


def summary_load_options() -> tuple[Load, ...]:
    return (joinedload(Booking.vehicle),)


def get_booking(db: Session, booking_id: UUID) -> Booking:
    booking = db.scalar(
        select(Booking).options(*booking_load_options()).where(Booking.id == booking_id)
    )
    if booking is None:
        raise NotFoundError("Booking not found")
    return booking


def _open_booking_filter(now: datetime) -> ColumnElement[bool]:
    """Bookings that still need their resources: not closed and not over yet."""
    return and_(
        Booking.status.notin_(CLOSED_STATUSES),
        or_(Booking.end_datetime > now, Booking.status == BookingStatus.IN_PROGRESS),
    )


def vehicle_has_open_bookings(db: Session, vehicle_id: UUID) -> bool:
    statement = select(Booking.id).where(
        Booking.vehicle_id == vehicle_id,
        _open_booking_filter(datetime.now(UTC)),
    )
    return db.scalar(statement.limit(1)) is not None


def employee_has_open_bookings(db: Session, employee_id: UUID) -> bool:
    statement = (
        select(BookingEmployee.id)
        .join(Booking, Booking.id == BookingEmployee.booking_id)
        .where(
            BookingEmployee.employee_id == employee_id,
            BookingEmployee.is_released.is_(False),
            _open_booking_filter(datetime.now(UTC)),
        )
    )
    return db.scalar(statement.limit(1)) is not None
