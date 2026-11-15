from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import UnaryExpression

from app.db.enums import BookingStatus
from app.modules.availability.service import list_available_vehicles
from app.modules.bookings.models import Booking
from app.modules.bookings.provider_schemas import DashboardRead
from app.modules.bookings.queries import summary_load_options
from app.modules.bookings.schemas import BookingSummaryRead, BookingVehicleRead


def dashboard(db: Session) -> DashboardRead:
    now = datetime.now(UTC)
    new_bookings = _summary_list(
        db,
        statuses=[BookingStatus.PENDING],
        order_by=Booking.created_at.desc(),
    )
    scheduled = [BookingStatus.CONFIRMED, BookingStatus.READY_FOR_PICKUP]
    # Confirmed jobs whose start time passed without "Start service" must stay visible.
    overdue = _summary_list(
        db,
        statuses=scheduled,
        start_before=now,
        order_by=Booking.start_datetime.asc(),
    )
    upcoming = _summary_list(
        db,
        statuses=scheduled,
        start_after=now,
        order_by=Booking.start_datetime.asc(),
    )
    active = _summary_list(
        db,
        statuses=[BookingStatus.IN_PROGRESS],
        order_by=Booking.start_datetime.asc(),
    )
    vehicles = list_available_vehicles(db, now, now + timedelta(hours=1))[:10]

    return DashboardRead(
        new_bookings=[BookingSummaryRead.model_validate(item) for item in new_bookings],
        overdue_bookings=[BookingSummaryRead.model_validate(item) for item in overdue],
        upcoming_bookings=[BookingSummaryRead.model_validate(item) for item in upcoming],
        active_bookings=[BookingSummaryRead.model_validate(item) for item in active],
        available_vehicles=[BookingVehicleRead.model_validate(item) for item in vehicles],
    )


def _summary_list(
    db: Session,
    *,
    statuses: list[BookingStatus],
    order_by: UnaryExpression[datetime],
    start_after: datetime | None = None,
    start_before: datetime | None = None,
    limit: int = 10,
) -> list[Booking]:
    statement = select(Booking).options(*summary_load_options()).where(Booking.status.in_(statuses))
    if start_after is not None:
        statement = statement.where(Booking.start_datetime >= start_after)
    if start_before is not None:
        statement = statement.where(Booking.start_datetime < start_before)
    statement = statement.order_by(order_by).limit(limit)
    return list(db.scalars(statement))
