from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

REQUIRED_UPDATE_FIELDS = frozenset(
    {
        "brand",
        "model",
        "year",
        "category",
        "cargo_volume",
        "payload",
        "seats",
        "hourly_price",
        "daily_price",
        "is_active",
    }
)


class VehicleBase(BaseModel):
    brand: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=80)
    year: int = Field(ge=1990, le=2100)
    category: str = Field(min_length=1, max_length=50)
    cargo_volume: Decimal = Field(gt=0, max_digits=6, decimal_places=2)
    payload: int = Field(gt=0)
    seats: int = Field(gt=0)
    description: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=500)
    hourly_price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    daily_price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)


class VehicleCreate(VehicleBase):
    is_active: bool = True


class VehicleUpdate(BaseModel):
    """Partial update. Nullable fields accept null to clear their value."""

    brand: str | None = Field(default=None, min_length=1, max_length=80)
    model: str | None = Field(default=None, min_length=1, max_length=80)
    year: int | None = Field(default=None, ge=1990, le=2100)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    cargo_volume: Decimal | None = Field(default=None, gt=0, max_digits=6, decimal_places=2)
    payload: int | None = Field(default=None, gt=0)
    seats: int | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=500)
    hourly_price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    daily_price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    is_active: bool | None = None

    @model_validator(mode="after")
    def reject_explicit_nulls(self) -> "VehicleUpdate":
        null_fields = REQUIRED_UPDATE_FIELDS & {
            field for field in self.model_fields_set if getattr(self, field) is None
        }
        if null_fields:
            names = ", ".join(sorted(null_fields))
            raise ValueError(f"Fields cannot be null: {names}")
        return self


class VehicleRead(VehicleBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
