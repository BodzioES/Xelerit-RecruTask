from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Load, Session, joinedload, selectinload

from app.core.exceptions import NotFoundError
from app.modules.bookings.models import Booking, BookingEmployee


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
