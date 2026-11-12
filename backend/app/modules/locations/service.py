from decimal import Decimal

from app.core.config import settings
from app.core.exceptions import NotFoundError, ServiceUnavailableError, ValidationError
from app.core.geo import haversine_distance_km
from app.modules.locations.geoapify import GeoapifyClient, GeoapifyPlace
from app.modules.locations.schemas import (
    LocationRead,
    LocationValidateRequest,
    ServiceAreaRead,
)


def search_locations(query: str, limit: int) -> list[LocationRead]:
    cleaned = query.strip()
    if len(cleaned) < 2:
        raise ValidationError("Search query must contain at least 2 characters")
    places = _client().search(cleaned, limit)
    return [_to_location(place) for place in places]


def reverse_location(latitude: Decimal, longitude: Decimal) -> LocationRead:
    place = _client().reverse(latitude, longitude)
    if place is None:
        raise NotFoundError("No address found for these coordinates")
    return _to_location(place)


def validate_location(payload: LocationValidateRequest) -> ServiceAreaRead:
    """Validate a map point against the configured service area."""
    distance, in_area = service_area_status(payload.latitude, payload.longitude)
    return ServiceAreaRead(
        latitude=payload.latitude,
        longitude=payload.longitude,
        in_service_area=in_area,
        distance_from_center_km=distance,
        radius_km=service_area_radius(),
    )


def service_area_status(latitude: Decimal, longitude: Decimal) -> tuple[Decimal, bool]:
    distance = haversine_distance_km(
        Decimal(str(settings.service_area_center_latitude)),
        Decimal(str(settings.service_area_center_longitude)),
        latitude,
        longitude,
    )
    return distance, distance <= service_area_radius()


def service_area_radius() -> Decimal:
    return Decimal(str(settings.service_area_radius_km))


def _client() -> GeoapifyClient:
    api_key = settings.geoapify_api_key.strip()
    if not api_key:
        raise ServiceUnavailableError("Geocoding is not configured")
    return GeoapifyClient(api_key)


def _to_location(place: GeoapifyPlace) -> LocationRead:
    distance, in_area = service_area_status(place.lat, place.lon)
    return LocationRead(
        address=place.formatted,
        latitude=place.lat,
        longitude=place.lon,
        place_id=place.place_id,
        city=place.city,
        country=place.country,
        in_service_area=in_area,
        distance_from_center_km=distance,
    )
