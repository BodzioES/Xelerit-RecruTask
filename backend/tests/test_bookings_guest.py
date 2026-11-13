import hashlib
from decimal import Decimal
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.enums import BookingStatus, ServiceType
from app.db.session import SessionLocal
from app.modules.bookings.models import Booking, BookingEmployee
from tests.booking_helpers import (
    DAY,
    build_booking_payload,
    create_booking_via_api,
)
from tests.factories import create_employee_via_api, create_vehicle_via_api


@pytest.fixture(autouse=True)
def _install_pricing_rules(pricing_rules: None) -> None:
    return None


def test_guest_creates_self_drive_booking_and_reads_it_with_token(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    body = create_booking_via_api(
        client,
        created_resources,
        build_booking_payload(ServiceType.SELF_DRIVE, vehicle_id=vehicle["id"]),
    )

    assert body["status"] == BookingStatus.PENDING.value
    assert body["booking_number"].startswith("MV-")
    assert body["vehicle"]["id"] == vehicle["id"]
    assert body["assignments"] == []
    assert len(body["locations"]) == 2
    assert body["events"][0]["new_status"] == BookingStatus.PENDING.value
    assert Decimal(str(body["base_price"])) + Decimal(str(body["extras_price"])) == Decimal(
        str(body["total_price"])
    )

    token = str(body["access_token"])
    with SessionLocal() as db:
        booking = db.get(Booking, UUID(str(body["id"])))
        assert booking is not None
        assert booking.access_token_hash == hashlib.sha256(token.encode()).hexdigest()
        assert booking.access_token_hash != token

    booking_id = body["id"]
    assert client.get(f"/api/v1/bookings/{booking_id}").status_code == 401
    assert (
        client.get(f"/api/v1/bookings/{booking_id}", params={"token": "wrong"}).status_code == 404
    )
    assert client.get(f"/api/v1/bookings/{booking_id}", params={"token": token}).status_code == 200
    assert (
        client.get(
            f"/api/v1/bookings/{booking_id}",
            headers={"X-Booking-Token": token},
        ).status_code
        == 200
    )


def test_guest_cancel_releases_the_vehicle_for_a_new_booking(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    body = create_booking_via_api(
        client,
        created_resources,
        build_booking_payload(ServiceType.SELF_DRIVE, vehicle_id=vehicle["id"]),
    )
    token = str(body["access_token"])

    response = client.patch(
        f"/api/v1/bookings/{body['id']}/cancel",
        params={"token": token},
        json={"reason": "Plans changed"},
    )
    assert response.status_code == 200, response.text
    cancelled = response.json()
    assert cancelled["status"] == BookingStatus.CANCELLED.value
    assert cancelled["events"][-1]["new_status"] == BookingStatus.CANCELLED.value

    replacement = create_booking_via_api(
        client,
        created_resources,
        build_booking_payload(ServiceType.SELF_DRIVE, vehicle_id=vehicle["id"]),
    )
    assert replacement["vehicle"]["id"] == vehicle["id"]


def test_cancel_releases_employee_assignments(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    create_employee_via_api(
        client,
        auth_headers,
        created_resources,
        role="driver",
    )
    body = create_booking_via_api(
        client,
        created_resources,
        build_booking_payload(
            ServiceType.VAN_DRIVER,
            vehicle_id=vehicle["id"],
            hours=4,
        ),
    )
    token = str(body["access_token"])

    response = client.patch(
        f"/api/v1/bookings/{body['id']}/cancel",
        params={"token": token},
    )
    assert response.status_code == 200, response.text

    with SessionLocal() as db:
        assignments = list(
            db.scalars(
                select(BookingEmployee).where(BookingEmployee.booking_id == UUID(str(body["id"])))
            )
        )
    assert assignments
    assert all(assignment.is_released for assignment in assignments)


def test_second_booking_for_the_same_vehicle_returns_conflict(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    create_booking_via_api(
        client,
        created_resources,
        build_booking_payload(ServiceType.SELF_DRIVE, vehicle_id=vehicle["id"]),
    )

    response = client.post(
        "/api/v1/bookings",
        json=build_booking_payload(ServiceType.SELF_DRIVE, vehicle_id=vehicle["id"]),
    )
    assert response.status_code == 409, response.text
    assert "available" in response.json()["detail"].lower()


def test_booking_outside_the_service_area_is_rejected(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    payload = build_booking_payload(ServiceType.SELF_DRIVE, vehicle_id=vehicle["id"])
    payload["locations"] = [
        {
            "location_type": "pickup",
            "address": "Warszawa",
            "latitude": 52.2297,
            "longitude": 21.0122,
        },
        {
            "location_type": "return",
            "address": "Warszawa",
            "latitude": 52.2297,
            "longitude": 21.0122,
        },
    ]

    response = client.post("/api/v1/bookings", json=payload)
    assert response.status_code == 400, response.text
    assert "service area" in response.json()["detail"].lower()


def test_booking_requires_a_future_start(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    payload = build_booking_payload(
        ServiceType.SELF_DRIVE,
        vehicle_id=vehicle["id"],
        start=DAY.replace(year=2000),
    )

    response = client.post("/api/v1/bookings", json=payload)
    assert response.status_code == 422, response.text


def test_van_driver_booking_accepts_items(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    create_employee_via_api(client, auth_headers, created_resources, role="driver")
    body = create_booking_via_api(
        client,
        created_resources,
        build_booking_payload(
            ServiceType.VAN_DRIVER,
            vehicle_id=vehicle["id"],
            items=[{"item_name": "Sofa", "quantity": 2, "description": "Two-seater"}],
        ),
    )

    assert [item["item_name"] for item in body["items"]] == ["Sofa"]
    assert body["items"][0]["quantity"] == 2
    assert body["moving_details"] is None


def test_self_drive_booking_rejects_items(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    payload = build_booking_payload(
        ServiceType.SELF_DRIVE,
        vehicle_id=vehicle["id"],
        items=[{"item_name": "Sofa", "quantity": 1}],
    )

    response = client.post("/api/v1/bookings", json=payload)
    assert response.status_code == 422, response.text
    assert "items" in response.text
