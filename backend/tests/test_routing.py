from collections.abc import Callable
from decimal import Decimal

import httpx
import pytest

from app.core.config import settings
from app.modules.locations import routing

Handler = Callable[[httpx.Request], httpx.Response]


@pytest.fixture
def configured_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "geoapify_api_key", "test-key")


def install_transport(monkeypatch: pytest.MonkeyPatch, handler: Handler) -> None:
    monkeypatch.setattr(
        routing,
        "_http_client",
        lambda: httpx.Client(transport=httpx.MockTransport(handler)),
    )


def test_routing_is_skipped_without_an_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "geoapify_api_key", "")

    assert (
        routing.route_distance_km(
            Decimal("54.352000"),
            Decimal("18.646600"),
            Decimal("54.441800"),
            Decimal("18.560100"),
        )
        is None
    )


def test_routing_returns_the_driving_distance_in_kilometres(
    monkeypatch: pytest.MonkeyPatch,
    configured_key: None,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/routing"
        assert request.url.params["mode"] == "drive"
        assert request.url.params["apiKey"] == "test-key"
        assert request.url.params["waypoints"] == "54.352000,18.646600|54.441800,18.560100"
        return httpx.Response(
            200,
            json={"features": [{"properties": {"distance": 21500}}]},
        )

    install_transport(monkeypatch, handler)

    distance = routing.route_distance_km(
        Decimal("54.352000"),
        Decimal("18.646600"),
        Decimal("54.441800"),
        Decimal("18.560100"),
    )

    assert distance == Decimal("21.50")


@pytest.mark.parametrize(
    ("status_code", "body"),
    [
        (500, {"error": "unavailable"}),
        (200, {"features": []}),
        (200, {"features": [{"properties": {"distance": -1}}]}),
    ],
)
def test_routing_falls_back_when_the_response_is_unusable(
    monkeypatch: pytest.MonkeyPatch,
    configured_key: None,
    status_code: int,
    body: dict[str, object],
) -> None:
    install_transport(
        monkeypatch,
        lambda _request: httpx.Response(status_code, json=body),
    )

    assert (
        routing.route_distance_km(
            Decimal("54.352000"),
            Decimal("18.646600"),
            Decimal("54.441800"),
            Decimal("18.560100"),
        )
        is None
    )
