from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import update

from app.db.enums import ServiceType
from app.db.session import SessionLocal
from app.modules.bookings.models import Booking
from tests.booking_helpers import DAY, build_booking_payload, create_booking_via_api
from tests.factories import create_employee_via_api, create_vehicle_via_api

PROVIDER_BOOKINGS = "/api/v1/provider/bookings"


@pytest.fixture(autouse=True)
def _install_pricing_rules(pricing_rules: None) -> None:
    return None


def _set_status(client: TestClient, headers: dict[str, str], booking_id: str, status: str) -> None:
    response = client.patch(
        f"{PROVIDER_BOOKINGS}/{booking_id}/status", json={"status": status}, headers=headers
    )
    assert response.status_code == 200, response.text


def _self_drive(
    client: TestClient,
    resources: dict[str, list[UUID]],
    vehicle_id: object,
    *,
    start: datetime = DAY,
    hours: int = 2,
) -> dict[str, object]:
    payload = build_booking_payload(
        ServiceType.SELF_DRIVE, vehicle_id=str(vehicle_id), start=start, hours=hours
    )
    return create_booking_via_api(client, resources, payload)


def test_provider_enters_a_phone_booking_that_starts_confirmed(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    payload = build_booking_payload(ServiceType.SELF_DRIVE, vehicle_id=vehicle["id"])

    assert client.post(PROVIDER_BOOKINGS, json=payload).status_code == 401

    response = client.post(PROVIDER_BOOKINGS, json=payload, headers=auth_headers)
    assert response.status_code == 201, response.text
    body = response.json()
    created_resources["bookings"].append(UUID(body["id"]))

    assert body["status"] == "confirmed"
    assert body["access_token"]
    assert body["events"][0]["changed_by"] == "provider"


def test_vehicle_with_an_open_booking_cannot_be_deactivated(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    booking = _self_drive(client, created_resources, vehicle["id"])
    vehicle_url = f"/api/v1/provider/vehicles/{vehicle['id']}"

    patched = client.patch(vehicle_url, json={"is_active": False}, headers=auth_headers)
    assert patched.status_code == 409, patched.text
    assert client.delete(vehicle_url, headers=auth_headers).status_code == 409

    _set_status(client, auth_headers, str(booking["id"]), "cancelled")
    assert client.delete(vehicle_url, headers=auth_headers).status_code == 204


def test_assigned_employee_cannot_be_deactivated_or_change_role(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    driver = create_employee_via_api(client, auth_headers, created_resources, role="driver")
    booking = create_booking_via_api(
        client, created_resources, build_booking_payload(ServiceType.VAN_DRIVER)
    )
    assigned = client.post(
        f"{PROVIDER_BOOKINGS}/{booking['id']}/assign-resources",
        json={"employee_ids": [driver["id"]]},
        headers=auth_headers,
    )
    assert assigned.status_code == 200, assigned.text
    employee_url = f"/api/v1/provider/employees/{driver['id']}"

    assert client.delete(employee_url, headers=auth_headers).status_code == 409
    role_change = client.patch(employee_url, json={"role": "mover"}, headers=auth_headers)
    assert role_change.status_code == 409, role_change.text
    renamed = client.patch(employee_url, json={"last_name": "Renamed"}, headers=auth_headers)
    assert renamed.status_code == 200, renamed.text


def test_reschedule_moves_the_window_and_recalculates_the_price(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    booking = _self_drive(client, created_resources, vehicle["id"], hours=4)
    new_start = DAY + timedelta(days=1)
    new_end = new_start + timedelta(hours=6)

    response = client.patch(
        f"{PROVIDER_BOOKINGS}/{booking['id']}/schedule",
        json={"start_datetime": new_start.isoformat(), "end_datetime": new_end.isoformat()},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert datetime.fromisoformat(body["start_datetime"]) == new_start
    assert body["duration_minutes"] == 360
    assert Decimal(body["total_price"]) > Decimal(str(booking["total_price"]))
    assert body["events"][-1]["note"].startswith("Rescheduled from")


def test_reschedule_rejects_a_window_where_the_vehicle_is_taken(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    _self_drive(client, created_resources, vehicle["id"], start=DAY)
    later = _self_drive(client, created_resources, vehicle["id"], start=DAY + timedelta(hours=8))

    response = client.patch(
        f"{PROVIDER_BOOKINGS}/{later['id']}/schedule",
        json={
            "start_datetime": (DAY + timedelta(hours=1)).isoformat(),
            "end_datetime": (DAY + timedelta(hours=3)).isoformat(),
        },
        headers=auth_headers,
    )
    assert response.status_code == 409, response.text


def test_closed_booking_cannot_be_rescheduled(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    booking = create_booking_via_api(
        client, created_resources, build_booking_payload(ServiceType.VAN_DRIVER)
    )
    _set_status(client, auth_headers, str(booking["id"]), "rejected")

    response = client.patch(
        f"{PROVIDER_BOOKINGS}/{booking['id']}/schedule",
        json={
            "start_datetime": (DAY + timedelta(days=2)).isoformat(),
            "end_datetime": (DAY + timedelta(days=2, hours=2)).isoformat(),
        },
        headers=auth_headers,
    )
    assert response.status_code == 409, response.text


def test_dashboard_lists_confirmed_bookings_that_missed_their_start(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    booking = _self_drive(client, created_resources, vehicle["id"])
    _set_status(client, auth_headers, str(booking["id"]), "confirmed")

    # The API refuses past windows, so move the booking back in time directly.
    start = datetime.now(UTC) - timedelta(hours=1)
    with SessionLocal() as db:
        db.execute(
            update(Booking)
            .where(Booking.id == UUID(str(booking["id"])))
            .values(start_datetime=start, end_datetime=start + timedelta(hours=2))
        )
        db.commit()

    response = client.get("/api/v1/provider/dashboard", headers=auth_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert booking["id"] in {item["id"] for item in body["overdue_bookings"]}
    assert booking["id"] not in {item["id"] for item in body["upcoming_bookings"]}
