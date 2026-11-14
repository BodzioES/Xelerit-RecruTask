from datetime import timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.db.enums import ServiceType
from tests.pricing_helpers import DAY, line_amounts, post_quote, quote_payload

RULES_URL = "/api/v1/provider/pricing-rules"


@pytest.fixture(autouse=True)
def _install_pricing_rules(pricing_rules: None) -> None:
    return None


def test_provider_reads_all_pricing_rules(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.get(RULES_URL, headers=auth_headers)
    assert response.status_code == 200, response.text

    rules = response.json()
    assert {rule["service_type"] for rule in rules} == {
        service_type.value for service_type in ServiceType
    }
    assert all("helper_rate" in rule for rule in rules)


def test_provider_updates_a_rule_and_quotes_use_it(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    response = client.patch(
        f"{RULES_URL}/full_moving",
        json={"helper_rate": "73.50", "min_duration_hours": 7},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    updated = response.json()
    assert Decimal(updated["helper_rate"]) == Decimal("73.50")
    assert updated["min_duration_hours"] == 7

    quote = post_quote(
        client,
        quote_payload(
            ServiceType.FULL_MOVING,
            DAY,
            DAY + timedelta(hours=8),
            helpers=2,
            floor=1,
            has_elevator=True,
        ),
    )
    assert line_amounts(quote)["helpers"] == Decimal("147.00")


@pytest.mark.parametrize(
    ("payload", "expected_status"),
    [
        ({}, 422),
        ({"helper_rate": "-1.00"}, 422),
        ({"hourly_rate": None}, 422),
        ({"min_duration_hours": 0}, 422),
    ],
)
def test_provider_update_rejects_invalid_values(
    client: TestClient,
    auth_headers: dict[str, str],
    payload: dict[str, object],
    expected_status: int,
) -> None:
    response = client.patch(
        f"{RULES_URL}/full_moving",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == expected_status, response.text


def test_pricing_rules_require_a_provider_session(client: TestClient) -> None:
    assert client.get(RULES_URL).status_code == 401
    assert client.patch(f"{RULES_URL}/full_moving", json={"helper_rate": "1.00"}).status_code == 401
