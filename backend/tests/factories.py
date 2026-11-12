from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.db.enums import BookingStatus, ServiceType
from app.modules.bookings.models import Booking, BookingEmployee


def create_vehicle_via_api(
    client: TestClient,
    auth_headers: dict[str, str],
    resources: dict[str, list[UUID]],
    **overrides: object,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "brand": "Pytest",
        "model": "Test Van",
        "year": 2024,
        "category": "L2H2",
        "cargo_volume": "10.50",
        "payload": 1200,
        "seats": 3,
        "hourly_price": "50.00",
        "daily_price": "300.00",
    }
    payload.update(overrides)
    response = client.post(
        "/api/v1/provider/vehicles",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    resources["vehicles"].append(UUID(body["id"]))
    return body


def create_employee_via_api(
    client: TestClient,
    auth_headers: dict[str, str],
    resources: dict[str, list[UUID]],
    **overrides: object,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "first_name": "Pytest",
        "last_name": "Availability",
        "role": "driver",
    }
    payload.update(overrides)
    response = client.post(
        "/api/v1/provider/employees",
        json=payload,
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    resources["employees"].append(UUID(body["id"]))
    return body


def build_booking(
    *,
    vehicle_id: UUID | None,
    start: datetime,
    end: datetime,
    status: BookingStatus = BookingStatus.CONFIRMED,
    employee_ids: Sequence[UUID] = (),
) -> Booking:
    """Build a booking with a unique number and optional employee assignments."""
    booking = Booking(
        booking_number=f"MV-T-{uuid4().hex[:8]}",
        customer_first_name="Pytest",
        customer_last_name="Guest",
        customer_email="pytest-guest@example.com",
        customer_phone="+48 500 000 000",
        vehicle_id=vehicle_id,
        service_type=ServiceType.SELF_DRIVE,
        start_datetime=start,
        end_datetime=end,
        status=status,
        base_price=Decimal("0.00"),
        extras_price=Decimal("0.00"),
        total_price=Decimal("0.00"),
        duration_minutes=max(1, int((end - start).total_seconds() // 60)),
    )
    booking.assignments = [
        BookingEmployee(
            employee_id=employee_id,
            start_datetime=start,
            end_datetime=end,
        )
        for employee_id in employee_ids
    ]
    return booking
