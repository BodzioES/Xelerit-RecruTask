from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.db.enums import EmployeeRole


class AvailabilityReason(StrEnum):
    """Why a resource cannot be used for the requested window."""

    INACTIVE = "inactive"
    BOOKING_CONFLICT = "booking_conflict"
    UNAVAILABILITY = "unavailability"


class AvailabilityWindow(BaseModel):
    """A timezone-aware, half-open interval requested by a guest or the Provider."""

    start_datetime: AwareDatetime
    end_datetime: AwareDatetime

    @model_validator(mode="after")
    def normalize_window(self) -> "AvailabilityWindow":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime")
        self.start_datetime = self.start_datetime.astimezone(UTC)
        self.end_datetime = self.end_datetime.astimezone(UTC)
        return self


class AvailableVehicleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    brand: str
    model: str
    year: int
    category: str
    cargo_volume: Decimal
    cargo_length_cm: int | None
    cargo_width_cm: int | None
    cargo_height_cm: int | None
    payload: int
    seats: int
    description: str | None
    image_url: str | None
    hourly_price: Decimal
    daily_price: Decimal


class AvailableEmployeeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    role: EmployeeRole


class ResourceAvailabilityRead(BaseModel):
    id: UUID
    available: bool
    reason: AvailabilityReason | None = None


class AvailabilityCheckRequest(AvailabilityWindow):
    model_config = ConfigDict(extra="forbid")

    vehicle_id: UUID | None = None
    employee_ids: list[UUID] = Field(default_factory=list, max_length=20)

    @field_validator("employee_ids")
    @classmethod
    def reject_duplicate_employees(cls, value: list[UUID]) -> list[UUID]:
        if len(set(value)) != len(value):
            raise ValueError("employee_ids must not contain duplicates")
        return value


class AvailabilityCheckResponse(BaseModel):
    start_datetime: datetime
    end_datetime: datetime
    buffer_minutes: int
    available: bool
    vehicle: ResourceAvailabilityRead | None = None
    employees: list[ResourceAvailabilityRead] = Field(default_factory=list)


class UnavailabilityCreate(AvailabilityWindow):
    model_config = ConfigDict(extra="forbid")

    reason: str | None = Field(default=None, max_length=255)

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class VehicleUnavailabilityRead(UnavailabilityCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    vehicle_id: UUID
    created_at: datetime


class EmployeeUnavailabilityRead(UnavailabilityCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    employee_id: UUID
    created_at: datetime
