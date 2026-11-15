from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError
from app.core.money import money
from app.db.enums import BookingActor, BookingStatus, LocationType, ServiceType
from app.modules.availability.service import employee_reason, vehicle_reason
from app.modules.bookings.assignment import commit_or_conflict
from app.modules.bookings.models import Booking, BookingEmployee, BookingEvent
from app.modules.bookings.provider_schemas import BookingReschedule
from app.modules.bookings.service import split_prices
from app.modules.pricing.schemas import PricingQuoteRead, PricingQuoteRequest, QuoteLocation
from app.modules.pricing.service import calculate_quote

# Once the service has started, moving it would rewrite what already happened.
RESCHEDULABLE = frozenset(
    {BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.READY_FOR_PICKUP}
)


def reschedule_booking(
    db: Session, booking: Booking, payload: BookingReschedule, *, provider_id: UUID
) -> Booking:
    """Move a booking to a new window, keeping its resources and recalculating the price."""
    if booking.status not in RESCHEDULABLE:
        raise ConflictError(f"A booking in status {booking.status.value} cannot be rescheduled")

    start, end = payload.start_datetime, payload.end_datetime
    active_assignments = [item for item in booking.assignments if not item.is_released]
    # Check before changing anything: a flush with a clash would hit the database guard first.
    _ensure_resources_free(db, booking, active_assignments, start, end)

    previous_window = _window_label(booking.start_datetime, booking.end_datetime)
    booking.start_datetime = start
    booking.end_datetime = end
    for item in active_assignments:
        item.start_datetime = start
        item.end_datetime = end

    _apply_quote(booking, calculate_quote(db, _quote_request(booking)))
    booking.events.append(
        BookingEvent(
            previous_status=booking.status,
            new_status=booking.status,
            changed_by=BookingActor.PROVIDER,
            changed_by_user_id=provider_id,
            note=payload.note or f"Rescheduled from {previous_window}",
        )
    )
    commit_or_conflict(db)
    return booking


def _ensure_resources_free(
    db: Session,
    booking: Booking,
    assignments: list[BookingEmployee],
    start: datetime,
    end: datetime,
) -> None:
    if booking.vehicle is not None:
        if vehicle_reason(db, booking.vehicle, start, end, exclude_booking_id=booking.id):
            raise ConflictError(
                "The assigned vehicle is not free in the new window. "
                "Change the vehicle first or pick another time."
            )
    for item in assignments:
        if employee_reason(db, item.employee, start, end, exclude_booking_id=booking.id):
            name = f"{item.employee.first_name} {item.employee.last_name}"
            raise ConflictError(f"{name} is not free in the new window")


def _quote_request(booking: Booking) -> PricingQuoteRequest:
    moving = booking.moving_details
    origin_type, destination_type = (
        (LocationType.PICKUP, LocationType.RETURN)
        if booking.service_type == ServiceType.SELF_DRIVE
        else (LocationType.LOADING, LocationType.UNLOADING)
    )
    return PricingQuoteRequest(
        service_type=booking.service_type,
        start_datetime=booking.start_datetime,
        end_datetime=booking.end_datetime,
        vehicle_id=booking.vehicle_id if booking.service_type == ServiceType.SELF_DRIVE else None,
        helpers=booking.helpers_requested,
        floor=moving.floor if moving else None,
        has_elevator=moving.has_elevator if moving else None,
        origin=_point(booking, origin_type),
        destination=_point(booking, destination_type),
    )


def _point(booking: Booking, location_type: LocationType) -> QuoteLocation | None:
    for location in booking.locations:
        if location.location_type == location_type:
            return QuoteLocation(latitude=location.latitude, longitude=location.longitude)
    return None


def _apply_quote(booking: Booking, quote: PricingQuoteRead) -> None:
    booking.base_price, booking.extras_price = split_prices(quote)
    booking.total_price = money(quote.total)
    booking.distance_km = quote.distance_km
    booking.duration_minutes = quote.duration_minutes


def _window_label(start: datetime, end: datetime) -> str:
    return f"{start:%Y-%m-%d %H:%M} – {end:%Y-%m-%d %H:%M} UTC"
