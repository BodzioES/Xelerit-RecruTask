import logging
from decimal import ROUND_HALF_UP, Decimal

import httpx
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError

from app.core.config import settings

logger = logging.getLogger(__name__)

ROUTING_URL = "https://api.geoapify.com/v1/routing"
REQUEST_TIMEOUT_SECONDS = 5.0
DISTANCE_PRECISION = Decimal("0.01")


class _RouteProperties(BaseModel):
    model_config = ConfigDict(extra="ignore")

    distance: Decimal = Field(ge=0)


class _RouteFeature(BaseModel):
    model_config = ConfigDict(extra="ignore")

    properties: _RouteProperties


class _RouteResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    features: list[_RouteFeature] = Field(min_length=1)


def route_distance_km(
    latitude_a: Decimal,
    longitude_a: Decimal,
    latitude_b: Decimal,
    longitude_b: Decimal,
) -> Decimal | None:
    """Return the driving distance from Geoapify, or None when it is unavailable.

    Pricing falls back to a straight-line estimate when the provider is not configured
    or returns an invalid response, so a quote never fails because of a maps outage.
    """
    api_key = settings.geoapify_api_key.strip()
    if not api_key:
        return None

    params = {
        "waypoints": f"{latitude_a},{longitude_a}|{latitude_b},{longitude_b}",
        "mode": "drive",
        "apiKey": api_key,
    }
    try:
        with _http_client() as client:
            response = client.get(ROUTING_URL, params=params)
            response.raise_for_status()
        payload = _RouteResponse.model_validate(response.json())
    except (httpx.HTTPError, ValueError, PydanticValidationError) as exc:
        logger.warning("Geoapify routing is unavailable; using the distance estimate: %s", exc)
        return None

    metres = payload.features[0].properties.distance
    return (metres / Decimal("1000")).quantize(DISTANCE_PRECISION, rounding=ROUND_HALF_UP)


def _http_client() -> httpx.Client:
    return httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS)
