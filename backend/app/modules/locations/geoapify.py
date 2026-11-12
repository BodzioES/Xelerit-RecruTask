from decimal import Decimal

import httpx
from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticValidationError

from app.core.config import settings
from app.core.exceptions import UpstreamServiceError

BASE_URL = "https://api.geoapify.com/v1/geocode"
REQUEST_TIMEOUT_SECONDS = 5.0


class GeoapifyPlace(BaseModel):
    """Validated subset of the Geoapify result we expose to the frontend."""

    model_config = ConfigDict(extra="ignore")

    lat: Decimal = Field(ge=Decimal("-90"), le=Decimal("90"))
    lon: Decimal = Field(ge=Decimal("-180"), le=Decimal("180"))
    formatted: str = Field(min_length=1)
    place_id: str | None = None
    city: str | None = None
    country: str | None = None


class _GeoapifyResponse(BaseModel):
    results: list[GeoapifyPlace]


class GeoapifyClient:
    """Small Geoapify geocoding client with strict response validation."""

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def search(self, query: str, limit: int) -> list[GeoapifyPlace]:
        params = {
            "text": query,
            "limit": limit,
            "bias": (
                f"proximity:{settings.service_area_center_longitude},"
                f"{settings.service_area_center_latitude}"
            ),
        }
        return self._get("/search", params)

    def reverse(self, latitude: Decimal, longitude: Decimal) -> GeoapifyPlace | None:
        results = self._get(
            "/reverse",
            {"lat": str(latitude), "lon": str(longitude), "limit": 1},
        )
        return results[0] if results else None

    def _get(self, path: str, params: dict[str, object]) -> list[GeoapifyPlace]:
        query = {**params, "format": "json", "apiKey": self._api_key}
        try:
            with _http_client() as client:
                response = client.get(f"{BASE_URL}{path}", params=query)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise UpstreamServiceError("Geocoding provider is unavailable") from exc

        try:
            payload = _GeoapifyResponse.model_validate(response.json())
        except (ValueError, PydanticValidationError) as exc:
            raise UpstreamServiceError("Invalid response from geocoding provider") from exc
        return payload.results


def _http_client() -> httpx.Client:
    return httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS)
