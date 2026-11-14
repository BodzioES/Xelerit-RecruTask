from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    model_validator,
)

from app.core.config import settings
from app.db.enums import ServiceType


class QuoteLocation(BaseModel):
    """A coordinate pair used to derive the billable route distance."""

    model_config = ConfigDict(extra="forbid")

    latitude: Decimal = Field(ge=Decimal("-90"), le=Decimal("90"))
    longitude: Decimal = Field(ge=Decimal("-180"), le=Decimal("180"))


class PricingQuoteRequest(BaseModel):
    """Input for a server-side quote. The client never supplies a final price."""

    model_config = ConfigDict(extra="forbid")

    service_type: ServiceType
    start_datetime: AwareDatetime
    end_datetime: AwareDatetime
    vehicle_id: UUID | None = None
    helpers: int = Field(default=0, ge=0, le=settings.max_moving_helpers)
    floor: int | None = Field(default=None, ge=0)
    has_elevator: bool | None = None
    additional_service: bool = False
    origin: QuoteLocation | None = None
    destination: QuoteLocation | None = None

    @model_validator(mode="after")
    def validate_quote_request(self) -> "PricingQuoteRequest":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime")
        self.start_datetime = self.start_datetime.astimezone(UTC)
        self.end_datetime = self.end_datetime.astimezone(UTC)

        if self.service_type != ServiceType.FULL_MOVING:
            if self.helpers:
                raise ValueError("helpers are only available for full_moving")
            if self.floor is not None or self.has_elevator is not None:
                raise ValueError("floor and has_elevator are only available for full_moving")

        if (self.origin is None) != (self.destination is None):
            raise ValueError("origin and destination must be provided together")

        if self.has_elevator is not None and self.floor is None:
            raise ValueError("has_elevator requires floor")
        if self.floor is not None and self.floor > 0 and self.has_elevator is None:
            raise ValueError("has_elevator is required when floor is above ground")
        return self


class QuoteLine(BaseModel):
    """One visible component of the total price."""

    code: str
    description: str
    quantity: Decimal
    unit_price: Decimal
    amount: Decimal


class PricingQuoteRead(BaseModel):
    service_type: ServiceType
    currency: str
    start_datetime: datetime
    end_datetime: datetime
    duration_minutes: int
    billable_hours: int
    distance_km: Decimal
    vehicle_id: UUID | None
    helpers: int
    lines: list[QuoteLine]
    total: Decimal
    distance_source: Literal["routing", "haversine", "none"]


class PricingRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    service_type: ServiceType
    base_price: Decimal
    hourly_rate: Decimal
    daily_rate: Decimal
    price_per_km: Decimal
    helper_rate: Decimal
    floor_surcharge: Decimal
    no_elevator_surcharge: Decimal
    additional_service_price: Decimal
    min_duration_hours: int
    created_at: datetime
    updated_at: datetime


class PricingRuleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    base_price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    hourly_rate: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    daily_rate: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    price_per_km: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    helper_rate: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    floor_surcharge: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    no_elevator_surcharge: Decimal | None = Field(
        default=None, ge=0, max_digits=10, decimal_places=2
    )
    additional_service_price: Decimal | None = Field(
        default=None, ge=0, max_digits=10, decimal_places=2
    )
    min_duration_hours: int | None = Field(default=None, ge=1, le=168)

    @model_validator(mode="after")
    def require_a_change(self) -> "PricingRuleUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one pricing field")
        null_fields = {field for field in self.model_fields_set if getattr(self, field) is None}
        if null_fields:
            names = ", ".join(sorted(null_fields))
            raise ValueError(f"Fields cannot be null: {names}")
        return self
