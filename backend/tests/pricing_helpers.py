from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from fastapi.testclient import TestClient

from app.db.enums import ServiceType

DAY = datetime(2027, 6, 14, 8, tzinfo=UTC)

PRICING_FIELDS = (
    "base_price",
    "hourly_rate",
    "daily_rate",
    "price_per_km",
    "helper_rate",
    "floor_surcharge",
    "no_elevator_surcharge",
    "additional_service_price",
    "min_duration_hours",
)

RULE_VALUES: dict[ServiceType, dict[str, Any]] = {
    ServiceType.SELF_DRIVE: {
        "base_price": Decimal("0.00"),
        "hourly_rate": Decimal("60.00"),
        "daily_rate": Decimal("300.00"),
        "price_per_km": Decimal("0.00"),
        "helper_rate": Decimal("0.00"),
        "floor_surcharge": Decimal("0.00"),
        "no_elevator_surcharge": Decimal("0.00"),
        "additional_service_price": Decimal("0.00"),
        "min_duration_hours": 3,
    },
    ServiceType.VAN_DRIVER: {
        "base_price": Decimal("100.00"),
        "hourly_rate": Decimal("90.00"),
        "daily_rate": Decimal("0.00"),
        "price_per_km": Decimal("2.00"),
        "helper_rate": Decimal("0.00"),
        "floor_surcharge": Decimal("0.00"),
        "no_elevator_surcharge": Decimal("0.00"),
        "additional_service_price": Decimal("40.00"),
        "min_duration_hours": 4,
    },
    ServiceType.FULL_MOVING: {
        "base_price": Decimal("200.00"),
        "hourly_rate": Decimal("100.00"),
        "daily_rate": Decimal("0.00"),
        "price_per_km": Decimal("2.00"),
        "helper_rate": Decimal("50.00"),
        "floor_surcharge": Decimal("30.00"),
        "no_elevator_surcharge": Decimal("70.00"),
        "additional_service_price": Decimal("40.00"),
        "min_duration_hours": 6,
    },
}


def quote_payload(
    service_type: ServiceType,
    start: datetime,
    end: datetime,
    **overrides: object,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "service_type": service_type.value,
        "start_datetime": start.isoformat(),
        "end_datetime": end.isoformat(),
    }
    payload.update(overrides)
    return payload


def post_quote(client: TestClient, payload: dict[str, object]) -> dict[str, Any]:
    response = client.post("/api/v1/pricing/quote", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def line_amounts(quote: dict[str, Any]) -> dict[str, Decimal]:
    return {line["code"]: Decimal(str(line["amount"])) for line in quote["lines"]}


def assert_total_is_sum(quote: dict[str, Any]) -> None:
    line_total = sum(line_amounts(quote).values(), Decimal("0.00"))
    assert Decimal(str(quote["total"])) == line_total
