from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Select, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import UnaryExpression

from app.core.exceptions import ConflictError, ValidationError
from app.core.money import ZERO, money
from app.db.enums import (
    BookingActor,
    BookingStatus,
    LocationType,
    ServiceType,
)
from app.modules.availability.service import list_available_vehicles
from app.modules.bookings import assignment, status
from app.modules.bookings.access import create_guest_token
from app.modules.bookings.models import (
    Booking,
    BookingEmployee,
    BookingEvent,
    BookingItem,
    BookingLocation,
    BookingMovingDetails,
)
from app.modules.bookings.queries import booking_load_options, summary_load_options
from app.modules.bookings.schemas import (
    BookingCreate,
    BookingLocationInput,
    BookingSummaryRead,
    BookingVehicleRead,
    DashboardRead,
)
from app.modules.locations.service import service_area_status
from app.modules.pricing.schemas import PricingQuoteRead, PricingQuoteRequest, QuoteLocation
from app.modules.pricing.service import calculate_quote

BASE_PRICE_CODES = frozenset({"base_price", "hourly_rate", "daily_rate", "distance"})


def create_booking(db: Session, payload: BookingCreate) -> tuple[Booking, str]:
    _validate_service_area(payload)
    quote = _calculate_quote(db, payload)
    token, token_hash = create_guest_token()
    base_price, extras_price = _split_prices(quote)

    booking = Booking(
        booking_number=_next_booking_number(db, payload.start_datetime),
        customer_first_name=payload.customer_first_name,
        customer_last_name=payload.customer_last_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        service_type=payload.service_type,
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        status=BookingStatus.PENDING,
        base_price=base_price,
        extras_price=extras_price,
        total_price=money(quote.total),
        distance_km=quote.distance_km,
        duration_minutes=quote.duration_minutes,
        customer_notes=payload.customer_notes,
        access_token_hash=token_hash,
    )
    db.add(booking)
    db.flush()

    booking.locations = [_location(item) for item in payload.locations]
    booking.items = [
        BookingItem(item_name=item.item_name, quantity=item.quantity, description=item.description)
        for item in payload.items
    ]
    if payload.moving_details is not None:
        booking.moving_details = _moving_details(payload)
    booking.events = [
        BookingEvent(
            previous_status=None,
            new_status=BookingStatus.PENDING,
            changed_by=BookingActor.CUSTOMER,
            note="Booking created",
        )
    ]

    assignment.assign_for_creation(
        db,
        booking,
        requested_vehicle_id=payload.vehicle_id,
        helpers=payload.helpers,
    )
    assignment.commit_or_conflict(db)
    return booking, token


def cancel_booking(db: Session, booking: Booking, reason: str | None) -> Booking:
    status.ensure_guest_cancel(booking)
    previous = booking.status
    booking.status = BookingStatus.CANCELLED
    status.release_assignments(booking)
    booking.events.append(
        BookingEvent(
            previous_status=previous,
            new_status=BookingStatus.CANCELLED,
            changed_by=BookingActor.CUSTOMER,
            note=reason or "Cancelled by the customer",
        )
    )
    _commit(db)
    return booking


def update_status(
    db: Session,
    booking: Booking,
    new_status: BookingStatus,
    *,
    provider_id: UUID,
    note: str | None,
) -> Booking:
    status.ensure_transition(booking, new_status)
    previous = booking.status
    booking.status = new_status
    if new_status in (BookingStatus.CANCELLED, BookingStatus.REJECTED):
        status.release_assignments(booking)
    booking.events.append(
        BookingEvent(
            previous_status=previous,
            new_status=new_status,
            changed_by=BookingActor.PROVIDER,
            changed_by_user_id=provider_id,
            note=note,
        )
    )
    _commit(db)
    return booking


def list_bookings(
    db: Session,
    *,
    booking_status: BookingStatus | None,
    service_type: ServiceType | None,
    employee_id: UUID | None,
    limit: int,
    offset: int,
) -> list[Booking]:
    statement = select(Booking).options(*booking_load_options())
    if booking_status is not None:
        statement = statement.where(Booking.status == booking_status)
    if service_type is not None:
        statement = statement.where(Booking.service_type == service_type)
    if employee_id is not None:
        statement = statement.where(Booking.id.in_(_assigned_booking_ids(employee_id)))
    statement = (
        statement.order_by(Booking.created_at.desc(), Booking.id).offset(offset).limit(limit)
    )
    return list(db.scalars(statement))


def _assigned_booking_ids(employee_id: UUID) -> Select[tuple[UUID]]:
    return select(BookingEmployee.booking_id).where(
        BookingEmployee.employee_id == employee_id,
        BookingEmployee.is_released.is_(False),
    )


def dashboard(db: Session) -> DashboardRead:
    now = datetime.now(UTC)
    new_bookings = _summary_list(
        db,
        statuses=[BookingStatus.PENDING],
        order_by=Booking.created_at.desc(),
    )
    upcoming = _summary_list(
        db,
        statuses=[BookingStatus.CONFIRMED, BookingStatus.READY_FOR_PICKUP],
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
    limit: int = 10,
) -> list[Booking]:
    statement = select(Booking).options(*summary_load_options()).where(Booking.status.in_(statuses))
    if start_after is not None:
        statement = statement.where(Booking.start_datetime >= start_after)
    statement = statement.order_by(order_by).limit(limit)
    return list(db.scalars(statement))


def _calculate_quote(db: Session, payload: BookingCreate) -> PricingQuoteRead:
    origin, destination = _route_points(payload)
    request = PricingQuoteRequest(
        service_type=payload.service_type,
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        vehicle_id=payload.vehicle_id,
        helpers=payload.helpers,
        floor=payload.moving_details.floor if payload.moving_details else None,
        has_elevator=payload.moving_details.has_elevator if payload.moving_details else None,
        additional_service=payload.additional_service,
        origin=QuoteLocation(latitude=origin.latitude, longitude=origin.longitude),
        destination=QuoteLocation(
            latitude=destination.latitude,
            longitude=destination.longitude,
        ),
    )
    return calculate_quote(db, request)


def _route_points(payload: BookingCreate) -> tuple[BookingLocationInput, BookingLocationInput]:
    if payload.service_type == ServiceType.SELF_DRIVE:
        pickup = _location_by_type(payload, LocationType.PICKUP)
        return pickup, _location_by_type(payload, LocationType.RETURN)
    loading = _location_by_type(payload, LocationType.LOADING)
    return loading, _location_by_type(payload, LocationType.UNLOADING)


def _location_by_type(payload: BookingCreate, location_type: LocationType) -> BookingLocationInput:
    for location in payload.locations:
        if location.location_type == location_type:
            return location
    raise ValidationError(f"Missing {location_type.value} location")


def _validate_service_area(payload: BookingCreate) -> None:
    for location in payload.locations:
        _, in_area = service_area_status(location.latitude, location.longitude)
        if not in_area:
            raise ValidationError(f"Location is outside the service area: {location.address}")


def _split_prices(quote: PricingQuoteRead) -> tuple[Decimal, Decimal]:
    base = sum(
        (line.amount for line in quote.lines if line.code in BASE_PRICE_CODES),
        ZERO,
    )
    return money(base), money(quote.total - base)


def _next_booking_number(db: Session, starts_at: datetime) -> str:
    value = db.execute(text("SELECT nextval('booking_number_seq')")).scalar_one()
    return f"MV-{starts_at.year}-{int(value):06d}"


def _location(item: BookingLocationInput) -> BookingLocation:
    return BookingLocation(
        location_type=item.location_type,
        address=item.address,
        latitude=item.latitude,
        longitude=item.longitude,
        place_id=item.place_id,
        instructions=item.instructions,
    )


def _moving_details(payload: BookingCreate) -> BookingMovingDetails:
    details = payload.moving_details
    if details is None:  # guarded by schema validation
        raise ValidationError("moving_details are required for full_moving")
    return BookingMovingDetails(
        property_type=details.property_type,
        floor=details.floor,
        has_elevator=details.has_elevator,
        needs_carry_in=details.needs_carry_in,
        needs_carry_out=details.needs_carry_out,
        boxes_count=details.boxes_count,
        items_description=details.items_description,
    )


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("Booking could not be updated") from exc
