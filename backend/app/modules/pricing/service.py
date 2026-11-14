from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConfigurationError, NotFoundError, ValidationError
from app.core.geo import haversine_distance_km
from app.core.money import ZERO, money
from app.db.enums import ServiceType
from app.modules.locations.routing import route_distance_km
from app.modules.pricing.models import PricingRule
from app.modules.pricing.schemas import (
    PricingQuoteRead,
    PricingQuoteRequest,
    QuoteLine,
)
from app.modules.vehicles.models import Vehicle

CURRENCY = "PLN"
DistanceSource = Literal["routing", "haversine", "none"]


def calculate_quote(db: Session, payload: PricingQuoteRequest) -> PricingQuoteRead:
    """Price a request from the configured rules, entirely on the server.

    The quote is stateless: rules may change before the booking is created, and the
    booking endpoint must calculate the final price again inside its transaction.
    """
    rule = _get_rule(db, payload.service_type)
    vehicle = _get_vehicle(db, payload.vehicle_id) if payload.vehicle_id else None

    duration_minutes, requested_hours = _duration(payload.start_datetime, payload.end_datetime)
    billable_hours = max(requested_hours, rule.min_duration_hours)
    distance_km, distance_source = _route_distance(payload)

    if payload.service_type == ServiceType.SELF_DRIVE:
        lines = _self_drive_lines(rule, vehicle, billable_hours)
    else:
        lines = _service_lines(rule, payload, billable_hours, distance_km)

    return PricingQuoteRead(
        service_type=payload.service_type,
        currency=CURRENCY,
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        duration_minutes=duration_minutes,
        billable_hours=billable_hours,
        distance_km=distance_km,
        vehicle_id=vehicle.id if vehicle is not None else None,
        helpers=payload.helpers,
        lines=lines,
        total=sum((line.amount for line in lines), ZERO),
        distance_source=distance_source,
    )


def _get_rule(db: Session, service_type: ServiceType) -> PricingRule:
    rule = db.scalar(select(PricingRule).where(PricingRule.service_type == service_type))
    if rule is None:
        raise ConfigurationError(f"Pricing rules are not configured for {service_type.value}")
    return rule


def _get_vehicle(db: Session, vehicle_id: UUID) -> Vehicle:
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise NotFoundError("Vehicle not found")
    if not vehicle.is_active:
        raise ValidationError("Vehicle is not available")
    return vehicle


def _duration(start: datetime, end: datetime) -> tuple[int, int]:
    """Return whole billed minutes and requested hours, rounding any part up."""
    seconds = int((end - start).total_seconds())
    minutes = max(1, (seconds + 59) // 60)
    return minutes, (minutes + 59) // 60


def _route_distance(payload: PricingQuoteRequest) -> tuple[Decimal, DistanceSource]:
    if payload.origin is None or payload.destination is None:
        return ZERO, "none"

    routed = route_distance_km(
        payload.origin.latitude,
        payload.origin.longitude,
        payload.destination.latitude,
        payload.destination.longitude,
    )
    if routed is not None:
        return routed, "routing"

    return (
        haversine_distance_km(
            payload.origin.latitude,
            payload.origin.longitude,
            payload.destination.latitude,
            payload.destination.longitude,
        ),
        "haversine",
    )


def _self_drive_lines(
    rule: PricingRule, vehicle: Vehicle | None, billable_hours: int
) -> list[QuoteLine]:
    # A selected vehicle overrides the generic service rate. Zero means "not set".
    hourly_rate = rule.hourly_rate
    daily_rate = rule.daily_rate
    if vehicle is not None:
        hourly_rate = vehicle.hourly_price or rule.hourly_rate
        daily_rate = vehicle.daily_price or rule.daily_rate

    if daily_rate > 0 and billable_hours >= 24:
        days, remaining_hours = divmod(billable_hours, 24)
        # Never bill leftover hours for more than another full day.
        if remaining_hours and hourly_rate * remaining_hours >= daily_rate:
            days += 1
            remaining_hours = 0

        lines = [_line("daily_rate", "Daily rental", days, daily_rate)]
        if remaining_hours:
            lines.append(_line("hourly_rate", "Additional hours", remaining_hours, hourly_rate))
        return [line for line in lines if line.amount > 0]

    line = _line("hourly_rate", "Rental hours", billable_hours, hourly_rate)
    return [line] if line.amount > 0 else []


def _service_lines(
    rule: PricingRule,
    payload: PricingQuoteRequest,
    billable_hours: int,
    distance_km: Decimal,
) -> list[QuoteLine]:
    lines = [_line("base_price", "Base service fee", 1, rule.base_price)]
    lines.append(_line("hourly_rate", "Service hours", billable_hours, rule.hourly_rate))

    if distance_km > 0 and rule.price_per_km > 0:
        lines.append(
            _line(
                "distance",
                f"Route distance ({distance_km} km)",
                distance_km,
                rule.price_per_km,
            )
        )

    if payload.service_type == ServiceType.FULL_MOVING:
        lines.extend(_moving_lines(rule, payload))

    if payload.additional_service:
        lines.append(
            _line(
                "additional_service",
                "Additional service",
                1,
                rule.additional_service_price,
            )
        )

    return [line for line in lines if line.amount > 0]


def _moving_lines(rule: PricingRule, payload: PricingQuoteRequest) -> list[QuoteLine]:
    lines: list[QuoteLine] = []

    if payload.helpers and rule.helper_rate > 0:
        lines.append(_line("helpers", "Moving helpers", payload.helpers, rule.helper_rate))

    if payload.floor and rule.floor_surcharge > 0:
        lines.append(_line("floor", "Floor surcharge", payload.floor, rule.floor_surcharge))

    if payload.floor and payload.has_elevator is False and rule.no_elevator_surcharge > 0:
        lines.append(_line("no_elevator", "No elevator surcharge", 1, rule.no_elevator_surcharge))

    return lines


def _line(code: str, description: str, quantity: int | Decimal, unit_price: Decimal) -> QuoteLine:
    quantity_decimal = Decimal(quantity)
    return QuoteLine(
        code=code,
        description=description,
        quantity=quantity_decimal,
        unit_price=money(unit_price),
        amount=money(quantity_decimal * unit_price),
    )
