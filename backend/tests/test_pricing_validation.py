from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.core.config import settings
from app.db.enums import ServiceType
from app.db.session import SessionLocal
from app.modules.pricing.models import PricingRule
from tests.pricing_helpers import DAY, quote_payload

INVALID_QUOTES = [
    pytest.param(ServiceType.SELF_DRIVE, {"helpers": 1}, id="helpers-for-self-drive"),
    pytest.param(ServiceType.VAN_DRIVER, {"helpers": 1}, id="helpers-for-van-driver"),
    pytest.param(
        ServiceType.VAN_DRIVER,
        {"floor": 1, "has_elevator": False},
        id="floor-for-van-driver",
    ),
    pytest.param(ServiceType.FULL_MOVING, {"floor": 2}, id="floor-without-elevator-answer"),
    pytest.param(
        ServiceType.FULL_MOVING,
        {"has_elevator": True},
        id="elevator-without-floor",
    ),
    pytest.param(
        ServiceType.FULL_MOVING,
        {"floor": -1, "has_elevator": True},
        id="negative-floor",
    ),
    pytest.param(
        ServiceType.FULL_MOVING,
        {"helpers": settings.max_moving_helpers + 1},
        id="too-many-helpers",
    ),
    pytest.param(
        ServiceType.VAN_DRIVER,
        {"origin": {"latitude": "54.352000", "longitude": "18.646600"}},
        id="origin-without-destination",
    ),
    pytest.param(
        ServiceType.VAN_DRIVER,
        {"unexpected": True},
        id="unknown-field",
    ),
]


@pytest.mark.parametrize(("service_type", "overrides"), INVALID_QUOTES)
def test_quote_rejects_invalid_combinations(
    client: TestClient,
    pricing_rules: None,
    service_type: ServiceType,
    overrides: dict[str, object],
) -> None:
    response = client.post(
        "/api/v1/pricing/quote",
        json=quote_payload(
            service_type,
            DAY,
            DAY + timedelta(hours=4),
            **overrides,
        ),
    )
    assert response.status_code == 422, response.text


@pytest.mark.parametrize(
    "start, end",
    [
        (DAY.replace(tzinfo=None), DAY.replace(tzinfo=None) + timedelta(hours=4)),
        (DAY, DAY),
        (DAY + timedelta(hours=4), DAY),
    ],
)
def test_quote_requires_a_valid_time_window(
    client: TestClient,
    pricing_rules: None,
    start: datetime,
    end: datetime,
) -> None:
    response = client.post(
        "/api/v1/pricing/quote",
        json=quote_payload(ServiceType.VAN_DRIVER, start, end),
    )
    assert response.status_code == 422, response.text


def test_quote_fails_loudly_when_rules_are_missing(
    client: TestClient,
    pricing_rules: None,
) -> None:
    with SessionLocal() as db:
        db.execute(delete(PricingRule).where(PricingRule.service_type == ServiceType.VAN_DRIVER))
        db.commit()

    response = client.post(
        "/api/v1/pricing/quote",
        json=quote_payload(
            ServiceType.VAN_DRIVER,
            DAY,
            DAY + timedelta(hours=4),
        ),
    )
    assert response.status_code == 500
    assert "not configured" in response.json()["detail"]
