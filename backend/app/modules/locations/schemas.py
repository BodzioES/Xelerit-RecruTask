from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class LocationRead(BaseModel):
    """A normalized location returned by the geocoding provider."""

    address: str
    latitude: Decimal
    longitude: Decimal
    place_id: str | None = None
    city: str | None = None
    country: str | None = None
    in_service_area: bool
    distance_from_center_km: Decimal


class LocationValidateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    latitude: Decimal = Field(ge=Decimal("-90"), le=Decimal("90"))
    longitude: Decimal = Field(ge=Decimal("-180"), le=Decimal("180"))


class ServiceAreaRead(BaseModel):
    latitude: Decimal
    longitude: Decimal
    in_service_area: bool
    distance_from_center_km: Decimal
    radius_km: Decimal
