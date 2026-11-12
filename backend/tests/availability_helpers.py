from datetime import UTC, datetime
from uuid import UUID

from fastapi.testclient import TestClient

from app.db.enums import BookingStatus
from app.db.session import SessionLocal
from tests.factories import build_booking

DAY = datetime(2027, 5, 10, tzinfo=UTC)


def insert_booking(
    resources: dict[str, list[UUID]],
    *,
    vehicle_id: UUID | None,
    start: datetime,
    end: datetime,
    status: BookingStatus = BookingStatus.CONFIRMED,
    employee_ids: tuple[UUID, ...] = (),
) -> UUID:
    with SessionLocal() as db:
        booking = build_booking(
            vehicle_id=vehicle_id,
            start=start,
            end=end,
            status=status,
            employee_ids=employee_ids,
        )
        db.add(booking)
        db.commit()
        booking_id = booking.id
    resources["bookings"].append(booking_id)
    return booking_id


def available_vehicle_ids(
    client: TestClient, start: datetime, end: datetime, **params: object
) -> set[str]:
    response = client.get(
        "/api/v1/availability/vehicles",
        params={"start_datetime": start.isoformat(), "end_datetime": end.isoformat(), **params},
    )
    assert response.status_code == 200, response.text
    return {item["id"] for item in response.json()}


def available_employee_ids(
    client: TestClient, start: datetime, end: datetime, **params: object
) -> set[str]:
    response = client.get(
        "/api/v1/availability/employees",
        params={"start_datetime": start.isoformat(), "end_datetime": end.isoformat(), **params},
    )
    assert response.status_code == 200, response.text
    return {item["id"] for item in response.json()}
