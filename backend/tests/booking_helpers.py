from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi.testclient import TestClient

from app.db.enums import ServiceType

DAY = datetime(2030, 5, 10, 8, 0, tzinfo=UTC)


def build_booking_payload(
    service_type: ServiceType,
    *,
    start: datetime = DAY,
    hours: int = 2,
    vehicle_id: UUID | str | None = None,
    helpers: int = 0,
    **overrides: object,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "customer_first_name": "Guest",
        "customer_last_name": "Pytest",
        "customer_email": "guest.pytest@example.com",
        "customer_phone": "+48 500 123 456",
        "service_type": service_type.value,
        "start_datetime": start.isoformat(),
        "end_datetime": (start + timedelta(hours=hours)).isoformat(),
        "locations": _locations(service_type),
        "customer_notes": "Please call before arrival.",
    }
    if vehicle_id is not None:
        payload["vehicle_id"] = str(vehicle_id)
    if service_type == ServiceType.FULL_MOVING:
        payload["helpers"] = helpers
        payload["items"] = [{"item_name": "Sofa", "quantity": 1}]
        payload["moving_details"] = {
            "property_type": "apartment",
            "floor": 2,
            "has_elevator": False,
            "needs_carry_in": True,
            "needs_carry_out": True,
            "boxes_count": 12,
            "items_description": "Furniture and boxes",
        }
    payload.update(overrides)
    return payload


def create_booking_via_api(
    client: TestClient,
    resources: dict[str, list[UUID]],
    payload: dict[str, object],
) -> dict[str, object]:
    response = client.post("/api/v1/bookings", json=payload)
    assert response.status_code == 201, response.text
    body = response.json()
    resources["bookings"].append(UUID(body["id"]))
    return body


def _locations(service_type: ServiceType) -> list[dict[str, object]]:
    if service_type == ServiceType.SELF_DRIVE:
        return [
            {
                "location_type": "pickup",
                "address": "al. Grunwaldzka 210, Gdańsk Oliwa",
                "latitude": 54.4092,
                "longitude": 18.57,
            },
            {
                "location_type": "return",
                "address": "al. Grunwaldzka 472, Gdańsk Oliwa",
                "latitude": 54.4028,
                "longitude": 18.5695,
            },
        ]
    return [
        {
            "location_type": "loading",
            "address": "ul. Wyspiańskiego 12, Gdańsk Wrzeszcz",
            "latitude": 54.3801,
            "longitude": 18.6185,
        },
        {
            "location_type": "unloading",
            "address": "ul. Bohaterów Monte Cassino 40, Sopot",
            "latitude": 54.4416,
            "longitude": 18.5601,
        },
    ]
