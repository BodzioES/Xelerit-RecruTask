from collections.abc import Callable
from decimal import Decimal
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.modules.locations import geoapify

Handler = Callable[[httpx.Request], httpx.Response]


@pytest.fixture
def geoapify_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "geoapify_api_key", "test-key")


def install_transport(monkeypatch: pytest.MonkeyPatch, handler: Handler) -> None:
    monkeypatch.setattr(
        geoapify,
        "_http_client",
        lambda: httpx.Client(transport=httpx.MockTransport(handler)),
    )


@pytest.mark.parametrize(
    ("latitude", "longitude", "in_area"),
    [
        ("54.441600", "18.560100", True),
        ("54.352000", "18.646600", True),
        ("54.518900", "18.530500", True),
        ("54.720000", "18.560100", False),
        ("52.229700", "21.012200", False),
    ],
)
def test_validate_checks_the_service_area(
    client: TestClient,
    latitude: str,
    longitude: str,
    in_area: bool,
) -> None:
    response = client.post(
        "/api/v1/locations/validate",
        json={"latitude": latitude, "longitude": longitude},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["in_service_area"] is in_area
    assert Decimal(str(body["radius_km"])) == Decimal(str(settings.service_area_radius_km))
    assert Decimal(str(body["distance_from_center_km"])) >= 0


@pytest.mark.parametrize(
    "payload",
    [
        {"latitude": "91", "longitude": "18"},
        {"latitude": "54", "longitude": "181"},
        {"latitude": "54", "longitude": "18", "unexpected": True},
    ],
)
def test_validate_rejects_invalid_coordinates(
    client: TestClient,
    payload: dict[str, object],
) -> None:
    response = client.post("/api/v1/locations/validate", json=payload)
    assert response.status_code == 422, response.text


def test_geocoding_requires_an_api_key(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "geoapify_api_key", "")

    search = client.get("/api/v1/locations/search", params={"q": "Gdańsk"})
    reverse = client.get(
        "/api/v1/locations/reverse",
        params={"lat": "54.352", "lng": "18.6466"},
    )
    validate = client.post(
        "/api/v1/locations/validate",
        json={"latitude": "54.352", "longitude": "18.6466"},
    )

    assert search.status_code == 503
    assert reverse.status_code == 503
    assert validate.status_code == 200


def test_search_normalizes_provider_results_and_marks_the_area(
    client: TestClient,
    geoapify_key: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["request"] = request
        return httpx.Response(
            200,
            json={
                "results": [
                    {
                        "lat": 54.352,
                        "lon": 18.6466,
                        "formatted": "Gdańsk, Poland",
                        "place_id": "gda-place",
                        "city": "Gdańsk",
                        "country": "Poland",
                    },
                    {
                        "lat": 52.2297,
                        "lon": 21.0122,
                        "formatted": "Warsaw, Poland",
                        "place_id": "warsaw-place",
                        "city": "Warsaw",
                        "country": "Poland",
                    },
                ]
            },
        )

    install_transport(monkeypatch, handler)
    response = client.get(
        "/api/v1/locations/search",
        params={"q": " Gdańsk ", "limit": 2},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body) == 2
    assert body[0]["address"] == "Gdańsk, Poland"
    assert body[0]["in_service_area"] is True
    assert body[1]["address"] == "Warsaw, Poland"
    assert body[1]["in_service_area"] is False

    request = captured["request"]
    assert request.url.params["text"] == "Gdańsk"
    assert request.url.params["limit"] == "2"
    assert request.url.params["apiKey"] == "test-key"
    assert request.url.params["bias"].startswith("proximity:")
    assert "apiKey" not in response.text


def test_search_rejects_a_blank_query(
    client: TestClient,
    geoapify_key: None,
) -> None:
    response = client.get("/api/v1/locations/search", params={"q": "  "})
    assert response.status_code == 400


def test_reverse_returns_the_first_provider_result(
    client: TestClient,
    geoapify_key: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["request"] = request
        return httpx.Response(
            200,
            json={
                "results": [
                    {
                        "lat": 54.4416,
                        "lon": 18.5601,
                        "formatted": "Sopot Pier, Sopot, Poland",
                        "place_id": "sopot-pier",
                    }
                ]
            },
        )

    install_transport(monkeypatch, handler)
    response = client.get(
        "/api/v1/locations/reverse",
        params={"lat": "54.4416", "lng": "18.5601"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["address"] == "Sopot Pier, Sopot, Poland"
    assert body["in_service_area"] is True
    assert captured["request"].url.params["lat"] == "54.4416"
    assert captured["request"].url.params["lon"] == "18.5601"
    assert captured["request"].url.params["limit"] == "1"


def test_reverse_returns_not_found_for_an_empty_provider_result(
    client: TestClient,
    geoapify_key: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    install_transport(monkeypatch, lambda request: httpx.Response(200, json={"results": []}))

    response = client.get(
        "/api/v1/locations/reverse",
        params={"lat": "0", "lng": "0"},
    )
    assert response.status_code == 404


@pytest.mark.parametrize(
    "provider_response",
    [
        httpx.Response(500, json={"message": "boom"}),
        httpx.Response(200, text="not-json"),
        httpx.Response(200, json={"results": "not-a-list"}),
        httpx.Response(200, json={"results": [{"lat": 999, "lon": 18, "formatted": "X"}]}),
    ],
)
def test_search_fails_loudly_on_bad_provider_responses(
    client: TestClient,
    geoapify_key: None,
    monkeypatch: pytest.MonkeyPatch,
    provider_response: httpx.Response,
) -> None:
    install_transport(monkeypatch, lambda request: provider_response)

    response = client.get("/api/v1/locations/search", params={"q": "Gdańsk"})
    assert response.status_code == 502, response.text


def test_search_fails_loudly_when_the_provider_times_out(
    client: TestClient,
    geoapify_key: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timed out", request=request)

    install_transport(monkeypatch, handler)

    response = client.get("/api/v1/locations/search", params={"q": "Gdańsk"})
    assert response.status_code == 502


@pytest.mark.parametrize("limit", [0, 11])
def test_search_validates_the_limit(client: TestClient, limit: int) -> None:
    response = client.get(
        "/api/v1/locations/search",
        params={"q": "Gdańsk", "limit": limit},
    )
    assert response.status_code == 422
