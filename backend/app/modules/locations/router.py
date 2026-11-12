from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Query

from app.modules.locations import service
from app.modules.locations.schemas import (
    LocationRead,
    LocationValidateRequest,
    ServiceAreaRead,
)

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/search", response_model=list[LocationRead])
def search_locations(
    q: Annotated[str, Query(min_length=2, max_length=200)],
    limit: Annotated[int, Query(ge=1, le=10)] = 5,
) -> list[LocationRead]:
    return service.search_locations(q, limit)


@router.get("/reverse", response_model=LocationRead)
def reverse_location(
    lat: Annotated[Decimal, Query(ge=Decimal("-90"), le=Decimal("90"))],
    lng: Annotated[Decimal, Query(ge=Decimal("-180"), le=Decimal("180"))],
) -> LocationRead:
    return service.reverse_location(lat, lng)


@router.post("/validate", response_model=ServiceAreaRead)
def validate_location(payload: LocationValidateRequest) -> ServiceAreaRead:
    return service.validate_location(payload)
