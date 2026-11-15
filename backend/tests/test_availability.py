from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.enums import BookingStatus
from app.db.session import SessionLocal
from app.modules.bookings.models import Booking
from tests.availability_helpers import (
    DAY,
    available_employee_ids,
    available_vehicle_ids,
    insert_booking,
)
from tests.factories import create_employee_via_api, create_vehicle_via_api


def test_vehicle_availability_honours_booking_and_buffer(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    insert_booking(
        created_resources,
        vehicle_id=UUID(vehicle["id"]),
        start=DAY.replace(hour=10),
        end=DAY.replace(hour=12),
    )

    assert vehicle["id"] not in available_vehicle_ids(
        client, DAY.replace(hour=10, minute=30), DAY.replace(hour=11, minute=30)
    )
    # Ends exactly one buffer before the booking starts: still available.
    assert vehicle["id"] in available_vehicle_ids(client, DAY.replace(hour=8), DAY.replace(hour=9))
    # The operational buffer makes this window conflict.
    assert vehicle["id"] not in available_vehicle_ids(
        client, DAY.replace(hour=8, minute=1), DAY.replace(hour=9, minute=1)
    )
    # Starts exactly one buffer after the booking ends: available again.
    assert vehicle["id"] in available_vehicle_ids(
        client, DAY.replace(hour=13), DAY.replace(hour=14)
    )
    assert vehicle["id"] not in available_vehicle_ids(
        client, DAY.replace(hour=12, minute=59), DAY.replace(hour=14)
    )


def test_cancelled_booking_does_not_block_vehicle(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    insert_booking(
        created_resources,
        vehicle_id=UUID(vehicle["id"]),
        start=DAY.replace(hour=10),
        end=DAY.replace(hour=12),
        status=BookingStatus.CANCELLED,
    )

    assert vehicle["id"] in available_vehicle_ids(
        client, DAY.replace(hour=10), DAY.replace(hour=12)
    )


def test_vehicle_availability_applies_capacity_filters(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    start = DAY.replace(hour=8)
    end = DAY.replace(hour=9)

    assert vehicle["id"] in available_vehicle_ids(
        client, start, end, min_cargo_volume="10", min_payload=1200, min_seats=3
    )
    assert vehicle["id"] not in available_vehicle_ids(client, start, end, min_cargo_volume="11")
    assert vehicle["id"] not in available_vehicle_ids(client, start, end, min_payload="1300")
    assert vehicle["id"] not in available_vehicle_ids(client, start, end, min_seats="4")


def test_vehicle_availability_respects_unavailability_block(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    response = client.post(
        f"/api/v1/provider/vehicles/{vehicle['id']}/unavailability",
        json={
            "start_datetime": DAY.replace(hour=14).isoformat(),
            "end_datetime": DAY.replace(hour=16).isoformat(),
            "reason": "Workshop",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text

    assert vehicle["id"] not in available_vehicle_ids(
        client, DAY.replace(hour=14, minute=30), DAY.replace(hour=15, minute=30)
    )
    # Blocks are half-open and do not carry the booking buffer.
    assert vehicle["id"] in available_vehicle_ids(
        client, DAY.replace(hour=13), DAY.replace(hour=14)
    )
    assert vehicle["id"] in available_vehicle_ids(
        client, DAY.replace(hour=16), DAY.replace(hour=17)
    )


def test_employee_availability_respects_assignment_and_block(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    employee = create_employee_via_api(client, auth_headers, created_resources)
    insert_booking(
        created_resources,
        vehicle_id=None,
        start=DAY.replace(hour=10),
        end=DAY.replace(hour=12),
        employee_ids=(UUID(employee["id"]),),
    )

    assert employee["id"] not in available_employee_ids(
        client, DAY.replace(hour=10, minute=30), DAY.replace(hour=11, minute=30)
    )
    assert employee["id"] not in available_employee_ids(
        client,
        DAY.replace(hour=10, minute=30),
        DAY.replace(hour=11, minute=30),
        role="mover",
    )
    assert employee["id"] in available_employee_ids(
        client, DAY.replace(hour=13), DAY.replace(hour=14), role="driver"
    )

    response = client.post(
        f"/api/v1/provider/employees/{employee['id']}/unavailability",
        json={
            "start_datetime": DAY.replace(hour=14).isoformat(),
            "end_datetime": DAY.replace(hour=16).isoformat(),
            "reason": "Training",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    assert employee["id"] not in available_employee_ids(
        client, DAY.replace(hour=14, minute=30), DAY.replace(hour=15, minute=30)
    )


def test_availability_list_returns_only_matching_roles(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    driver = create_employee_via_api(client, auth_headers, created_resources, role="driver")
    mover = create_employee_via_api(client, auth_headers, created_resources, role="mover")
    start = DAY.replace(hour=8)
    end = DAY.replace(hour=9)

    driver_ids = available_employee_ids(client, start, end, role="driver")
    mover_ids = available_employee_ids(client, start, end, role="mover")

    assert driver["id"] in driver_ids
    assert mover["id"] not in driver_ids
    assert mover["id"] in mover_ids
    assert driver["id"] not in mover_ids


def test_seeded_booking_windows_are_consistent() -> None:
    """Every employee assignment must carry the booking window after the migration."""
    with SessionLocal() as db:
        bookings = list(db.scalars(select(Booking).where(Booking.assignments.any())))
        for booking in bookings:
            for assignment in booking.assignments:
                assert assignment.start_datetime == booking.start_datetime
                assert assignment.end_datetime == booking.end_datetime
                # Assignments are released only once the booking is closed, so the
                # check also holds on a database that already has a history.
                released = assignment.is_released
                assert released is (booking.status in {BookingStatus.CANCELLED, BookingStatus.REJECTED})
