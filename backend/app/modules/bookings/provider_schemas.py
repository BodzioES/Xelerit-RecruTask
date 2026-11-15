from datetime import UTC, datetime
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

from app.db.enums import BookingStatus
from app.modules.bookings.schemas import BookingSummaryRead, BookingVehicleRead


class BookingStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    status: BookingStatus
    note: str | None = Field(default=None, max_length=1000)


class AssignResourcesRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vehicle_id: UUID | None = None
    employee_ids: list[UUID] | None = Field(default=None, max_length=20)

    @field_validator("employee_ids")
    @classmethod
    def reject_duplicate_employees(cls, value: list[UUID] | None) -> list[UUID] | None:
        if value is not None and len(set(value)) != len(value):
            raise ValueError("employee_ids must not contain duplicates")
        return value

    @model_validator(mode="after")
    def require_any_resource(self) -> "AssignResourcesRequest":
        if self.vehicle_id is None and self.employee_ids is None:
            raise ValueError("Provide vehicle_id, employee_ids or both")
        return self


class DashboardRead(BaseModel):
    new_bookings: list[BookingSummaryRead]
    overdue_bookings: list[BookingSummaryRead]
    upcoming_bookings: list[BookingSummaryRead]
    active_bookings: list[BookingSummaryRead]
    available_vehicles: list[BookingVehicleRead]


class BookingReschedule(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    start_datetime: AwareDatetime
    end_datetime: AwareDatetime
    note: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def validate_window(self) -> "BookingReschedule":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime")
        self.start_datetime = self.start_datetime.astimezone(UTC)
        self.end_datetime = self.end_datetime.astimezone(UTC)
        if self.start_datetime <= datetime.now(UTC):
            raise ValueError("start_datetime must be in the future")
        return self
