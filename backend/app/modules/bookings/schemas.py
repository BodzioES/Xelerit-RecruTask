from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.core.config import settings
from app.db.enums import (
    BookingActor,
    BookingStatus,
    EmployeeRole,
    LocationType,
    PropertyType,
    ServiceType,
)

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
MOVING_LOCATIONS = frozenset({LocationType.LOADING, LocationType.UNLOADING})
RENTAL_LOCATIONS = frozenset({LocationType.PICKUP, LocationType.RETURN})
FLOOR_PROPERTY_TYPES = frozenset({PropertyType.APARTMENT, PropertyType.OFFICE, PropertyType.RETAIL})


class BookingLocationInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    location_type: LocationType
    address: str = Field(min_length=1, max_length=500)
    latitude: Decimal = Field(ge=Decimal("-90"), le=Decimal("90"))
    longitude: Decimal = Field(ge=Decimal("-180"), le=Decimal("180"))
    place_id: str | None = Field(default=None, max_length=255)
    instructions: str | None = Field(default=None, max_length=2000)


class BookingItemInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    item_name: str = Field(min_length=1, max_length=200)
    quantity: int = Field(default=1, ge=1, le=999)
    description: str | None = Field(default=None, max_length=2000)


class BookingMovingDetailsInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    property_type: PropertyType
    floor: int | None = Field(default=None, ge=0, le=200)
    has_elevator: bool | None = None
    needs_carry_in: bool = False
    needs_carry_out: bool = False
    boxes_count: int | None = Field(default=None, ge=0, le=10000)
    items_description: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_elevator(self) -> "BookingMovingDetailsInput":
        # Apartments, offices and retail units always have a storey, so the
        # customer must supply it instead of the Provider guessing the access.
        if self.property_type in FLOOR_PROPERTY_TYPES and self.floor is None:
            raise ValueError("floor is required for this property type")
        if self.has_elevator is not None and self.floor is None:
            raise ValueError("has_elevator requires floor")
        if self.floor is not None and self.floor > 0 and self.has_elevator is None:
            raise ValueError("has_elevator is required when floor is above ground")
        return self


class BookingCreate(BaseModel):
    """Guest booking request. Prices and resources are resolved by the server."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    customer_first_name: str = Field(min_length=1, max_length=100)
    customer_last_name: str = Field(min_length=1, max_length=100)
    customer_email: str = Field(min_length=3, max_length=320, pattern=EMAIL_PATTERN)
    customer_phone: str = Field(min_length=5, max_length=40)

    service_type: ServiceType
    start_datetime: AwareDatetime
    end_datetime: AwareDatetime
    vehicle_id: UUID | None = None
    helpers: int = Field(default=0, ge=0, le=settings.max_moving_helpers)
    additional_service: bool = False
    customer_notes: str | None = Field(default=None, max_length=2000)

    locations: list[BookingLocationInput] = Field(min_length=2, max_length=2)
    items: list[BookingItemInput] = Field(default_factory=list, max_length=50)
    moving_details: BookingMovingDetailsInput | None = None

    @model_validator(mode="after")
    def validate_booking_request(self) -> "BookingCreate":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime")
        self.start_datetime = self.start_datetime.astimezone(UTC)
        self.end_datetime = self.end_datetime.astimezone(UTC)
        if self.start_datetime <= datetime.now(UTC):
            raise ValueError("start_datetime must be in the future")

        self._validate_locations()
        self._validate_service_details()
        return self

    def _validate_locations(self) -> None:
        actual = {location.location_type for location in self.locations}
        if len(actual) != len(self.locations):
            raise ValueError("locations must not repeat a location_type")

        expected = (
            RENTAL_LOCATIONS if self.service_type == ServiceType.SELF_DRIVE else MOVING_LOCATIONS
        )
        if actual != expected:
            allowed = ", ".join(sorted(item.value for item in expected))
            raise ValueError(f"locations must contain exactly: {allowed}")

    def _validate_service_details(self) -> None:
        if self.service_type == ServiceType.SELF_DRIVE:
            if self.vehicle_id is None:
                raise ValueError("vehicle_id is required for self_drive")
            if self.helpers:
                raise ValueError("helpers are only available for full_moving")
            if self.items:
                raise ValueError("items are not available for self_drive")
            if self.moving_details is not None:
                raise ValueError("moving_details are only available for full_moving")
        elif self.service_type == ServiceType.VAN_DRIVER:
            if self.helpers:
                raise ValueError("helpers are only available for full_moving")
            if self.moving_details is not None:
                raise ValueError("moving_details are only available for full_moving")
        elif self.moving_details is None:
            raise ValueError("moving_details are required for full_moving")


class BookingVehicleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    brand: str
    model: str
    year: int
    category: str
    cargo_volume: Decimal
    payload: int
    seats: int
    image_url: str | None


class BookingLocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    location_type: LocationType
    address: str
    latitude: Decimal
    longitude: Decimal
    place_id: str | None
    instructions: str | None


class EmployeeSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    role: EmployeeRole


class BookingAssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    employee_id: UUID
    is_released: bool
    assigned_at: datetime
    employee: EmployeeSummaryRead


class BookingItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    item_name: str
    quantity: int
    description: str | None


class BookingMovingDetailsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    property_type: PropertyType
    floor: int | None
    has_elevator: bool | None
    needs_carry_in: bool
    needs_carry_out: bool
    boxes_count: int | None
    items_description: str | None


class BookingEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    previous_status: BookingStatus | None
    new_status: BookingStatus
    changed_by: BookingActor
    note: str | None
    created_at: datetime


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    booking_number: str
    customer_id: UUID | None
    customer_first_name: str
    customer_last_name: str
    customer_email: str
    customer_phone: str
    service_type: ServiceType
    start_datetime: datetime
    end_datetime: datetime
    status: BookingStatus
    base_price: Decimal
    extras_price: Decimal
    total_price: Decimal
    distance_km: Decimal | None
    duration_minutes: int
    helpers_requested: int
    customer_notes: str | None
    vehicle: BookingVehicleRead | None
    locations: list[BookingLocationRead]
    assignments: list[BookingAssignmentRead]
    items: list[BookingItemRead]
    moving_details: BookingMovingDetailsRead | None
    events: list[BookingEventRead]
    created_at: datetime
    updated_at: datetime


class BookingCreatedRead(BookingRead):
    access_token: str


class BookingSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    booking_number: str
    service_type: ServiceType
    status: BookingStatus
    customer_first_name: str
    customer_last_name: str
    start_datetime: datetime
    end_datetime: datetime
    total_price: Decimal
    vehicle: BookingVehicleRead | None


class BookingCancelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    reason: str | None = Field(default=None, max_length=1000)


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
    upcoming_bookings: list[BookingSummaryRead]
    active_bookings: list[BookingSummaryRead]
    available_vehicles: list[BookingVehicleRead]
