from datetime import timedelta
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.geo import haversine_distance_km
from app.db.enums import ServiceType
from app.modules.pricing import service
from tests.factories import create_vehicle_via_api
from tests.pricing_helpers import (
    DAY,
    assert_total_is_sum,
    line_amounts,
    post_quote,
    quote_payload,
)


@pytest.fixture(autouse=True)
def _disable_live_routing(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep quotes deterministic: tests never call the live Geoapify routing API."""
    monkeypatch.setattr(settings, "geoapify_api_key", "")


def test_self_drive_quote_uses_vehicle_rates(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
    pricing_rules: None,
) -> None:
    vehicle = create_vehicle_via_api(
        client,
        auth_headers,
        created_resources,
        hourly_price="55.00",
        daily_price="310.00",
    )

    hourly = post_quote(
        client,
        quote_payload(
            ServiceType.SELF_DRIVE,
            DAY,
            DAY + timedelta(hours=4, minutes=30),
            vehicle_id=vehicle["id"],
        ),
    )
    assert hourly["billable_hours"] == 5
    assert line_amounts(hourly) == {"hourly_rate": Decimal("275.00")}
    assert_total_is_sum(hourly)

    daily = post_quote(
        client,
        quote_payload(
            ServiceType.SELF_DRIVE,
            DAY,
            DAY + timedelta(hours=26),
            vehicle_id=vehicle["id"],
        ),
    )
    assert line_amounts(daily) == {
        "daily_rate": Decimal("310.00"),
        "hourly_rate": Decimal("110.00"),
    }
    assert Decimal(str(daily["total"])) == Decimal("420.00")
    assert_total_is_sum(daily)

    capped = post_quote(
        client,
        quote_payload(
            ServiceType.SELF_DRIVE,
            DAY,
            DAY + timedelta(hours=30),
            vehicle_id=vehicle["id"],
        ),
    )
    # Six leftover hours cost more than a day, so the quote bills two full days.
    assert line_amounts(capped) == {"daily_rate": Decimal("620.00")}
    assert_total_is_sum(capped)


def test_self_drive_quote_falls_back_to_rules_and_minimum(
    client: TestClient,
    pricing_rules: None,
) -> None:
    quote = post_quote(
        client,
        quote_payload(ServiceType.SELF_DRIVE, DAY, DAY + timedelta(hours=2)),
    )
    assert quote["vehicle_id"] is None
    assert quote["billable_hours"] == 3
    assert line_amounts(quote) == {"hourly_rate": Decimal("180.00")}


def test_self_drive_quote_never_charges_for_the_route(
    client: TestClient,
    pricing_rules: None,
) -> None:
    quote = post_quote(
        client,
        quote_payload(
            ServiceType.SELF_DRIVE,
            DAY,
            DAY + timedelta(hours=3),
            origin={"latitude": "54.352000", "longitude": "18.646600"},
            destination={"latitude": "54.441800", "longitude": "18.560100"},
        ),
    )
    assert Decimal(str(quote["distance_km"])) > 0
    assert line_amounts(quote) == {"hourly_rate": Decimal("180.00")}


def test_van_driver_quote_adds_base_fee_and_backend_distance(
    client: TestClient,
    pricing_rules: None,
) -> None:
    origin = {"latitude": "54.352000", "longitude": "18.646600"}
    destination = {"latitude": "54.441800", "longitude": "18.560100"}
    distance = haversine_distance_km(
        Decimal(origin["latitude"]),
        Decimal(origin["longitude"]),
        Decimal(destination["latitude"]),
        Decimal(destination["longitude"]),
    )

    quote = post_quote(
        client,
        quote_payload(
            ServiceType.VAN_DRIVER,
            DAY,
            DAY + timedelta(hours=4),
            origin=origin,
            destination=destination,
        ),
    )

    assert Decimal(str(quote["distance_km"])) == distance
    assert quote["distance_source"] == "haversine"
    assert [line["code"] for line in quote["lines"]] == ["base_price", "hourly_rate", "distance"]
    assert line_amounts(quote) == {
        "base_price": Decimal("100.00"),
        "hourly_rate": Decimal("360.00"),
        "distance": Decimal(str(distance * Decimal("2.00"))).quantize(Decimal("0.01")),
    }
    assert_total_is_sum(quote)


def test_quote_uses_routing_distance_when_available(
    client: TestClient,
    pricing_rules: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        service,
        "route_distance_km",
        lambda *_coordinates: Decimal("21.50"),
    )

    quote = post_quote(
        client,
        quote_payload(
            ServiceType.VAN_DRIVER,
            DAY,
            DAY + timedelta(hours=4),
            origin={"latitude": "54.352000", "longitude": "18.646600"},
            destination={"latitude": "54.441800", "longitude": "18.560100"},
        ),
    )

    assert quote["distance_source"] == "routing"
    assert Decimal(str(quote["distance_km"])) == Decimal("21.50")
    assert line_amounts(quote)["distance"] == Decimal("43.00")


def test_van_driver_quote_applies_minimum_and_optional_service(
    client: TestClient,
    pricing_rules: None,
) -> None:
    quote = post_quote(
        client,
        quote_payload(
            ServiceType.VAN_DRIVER,
            DAY,
            DAY + timedelta(hours=2),
            additional_service=True,
        ),
    )
    assert quote["billable_hours"] == 4
    assert line_amounts(quote) == {
        "base_price": Decimal("100.00"),
        "hourly_rate": Decimal("360.00"),
        "additional_service": Decimal("40.00"),
    }

    without_extras = post_quote(
        client,
        quote_payload(ServiceType.VAN_DRIVER, DAY, DAY + timedelta(hours=4)),
    )
    assert "additional_service" not in line_amounts(without_extras)


def test_full_moving_quote_breaks_down_every_component(
    client: TestClient,
    pricing_rules: None,
) -> None:
    origin = {"latitude": "54.352000", "longitude": "18.646600"}
    destination = {"latitude": "54.441800", "longitude": "18.560100"}
    distance = haversine_distance_km(
        Decimal(origin["latitude"]),
        Decimal(origin["longitude"]),
        Decimal(destination["latitude"]),
        Decimal(destination["longitude"]),
    )

    quote = post_quote(
        client,
        quote_payload(
            ServiceType.FULL_MOVING,
            DAY,
            DAY + timedelta(hours=8),
            origin=origin,
            destination=destination,
            helpers=3,
            floor=2,
            has_elevator=False,
            additional_service=True,
        ),
    )

    assert quote["billable_hours"] == 8
    assert quote["helpers"] == 3
    assert line_amounts(quote) == {
        "base_price": Decimal("200.00"),
        "hourly_rate": Decimal("800.00"),
        "distance": Decimal(str(distance * Decimal("2.00"))).quantize(Decimal("0.01")),
        "helpers": Decimal("150.00"),
        "floor": Decimal("60.00"),
        "no_elevator": Decimal("70.00"),
        "additional_service": Decimal("40.00"),
    }
    assert_total_is_sum(quote)


def test_full_moving_quote_with_elevator_skips_elevator_surcharge(
    client: TestClient,
    pricing_rules: None,
) -> None:
    quote = post_quote(
        client,
        quote_payload(
            ServiceType.FULL_MOVING,
            DAY,
            DAY + timedelta(hours=8),
            helpers=2,
            floor=3,
            has_elevator=True,
        ),
    )
    amounts = line_amounts(quote)
    assert amounts["floor"] == Decimal("90.00")
    assert "no_elevator" not in amounts


def test_full_moving_quote_applies_minimum_billing_hours(
    client: TestClient,
    pricing_rules: None,
) -> None:
    quote = post_quote(
        client,
        quote_payload(
            ServiceType.FULL_MOVING,
            DAY,
            DAY + timedelta(hours=2),
            helpers=2,
            floor=1,
            has_elevator=True,
        ),
    )
    assert quote["billable_hours"] == 6
    assert line_amounts(quote) == {
        "base_price": Decimal("200.00"),
        "hourly_rate": Decimal("600.00"),
        "helpers": Decimal("100.00"),
        "floor": Decimal("30.00"),
    }


def test_quote_rejects_unknown_or_inactive_vehicle(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
    pricing_rules: None,
) -> None:
    missing = client.post(
        "/api/v1/pricing/quote",
        json=quote_payload(
            ServiceType.SELF_DRIVE,
            DAY,
            DAY + timedelta(hours=4),
            vehicle_id=str(uuid4()),
        ),
    )
    assert missing.status_code == 404

    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    deleted = client.delete(
        f"/api/v1/provider/vehicles/{vehicle['id']}",
        headers=auth_headers,
    )
    assert deleted.status_code == 204

    inactive = client.post(
        "/api/v1/pricing/quote",
        json=quote_payload(
            ServiceType.SELF_DRIVE,
            DAY,
            DAY + timedelta(hours=4),
            vehicle_id=vehicle["id"],
        ),
    )
    assert inactive.status_code == 400
