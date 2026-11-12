from uuid import UUID

from fastapi.testclient import TestClient

from tests.availability_helpers import DAY, insert_booking
from tests.factories import create_employee_via_api, create_vehicle_via_api


def test_availability_check_reports_reasons(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    employee = create_employee_via_api(client, auth_headers, created_resources)
    insert_booking(
        created_resources,
        vehicle_id=UUID(vehicle["id"]),
        start=DAY.replace(hour=10),
        end=DAY.replace(hour=12),
        employee_ids=(UUID(employee["id"]),),
    )

    response = client.post(
        "/api/v1/availability/check",
        json={
            "start_datetime": DAY.replace(hour=10, minute=30).isoformat(),
            "end_datetime": DAY.replace(hour=11, minute=30).isoformat(),
            "vehicle_id": vehicle["id"],
            "employee_ids": [employee["id"]],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["available"] is False
    assert body["buffer_minutes"] >= 0
    assert body["vehicle"] == {
        "id": vehicle["id"],
        "available": False,
        "reason": "booking_conflict",
    }
    assert body["employees"] == [
        {"id": employee["id"], "available": False, "reason": "booking_conflict"}
    ]

    response = client.post(
        "/api/v1/availability/check",
        json={
            "start_datetime": DAY.replace(hour=13).isoformat(),
            "end_datetime": DAY.replace(hour=14).isoformat(),
            "vehicle_id": vehicle["id"],
            "employee_ids": [employee["id"]],
        },
    )
    assert response.status_code == 200
    assert response.json()["available"] is True
    assert response.json()["vehicle"]["reason"] is None
    assert response.json()["employees"][0]["reason"] is None


def test_availability_check_reports_inactive_and_missing_resources(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    inactive_vehicle = create_vehicle_via_api(
        client, auth_headers, created_resources, is_active=False
    )

    response = client.post(
        "/api/v1/availability/check",
        json={
            "start_datetime": DAY.replace(hour=13).isoformat(),
            "end_datetime": DAY.replace(hour=14).isoformat(),
            "vehicle_id": inactive_vehicle["id"],
        },
    )

    assert response.status_code == 200
    assert response.json()["available"] is False
    assert response.json()["vehicle"]["reason"] == "inactive"

    missing = client.post(
        "/api/v1/availability/check",
        json={
            "start_datetime": DAY.replace(hour=13).isoformat(),
            "end_datetime": DAY.replace(hour=14).isoformat(),
            "vehicle_id": "00000000-0000-0000-0000-000000000000",
        },
    )
    assert missing.status_code == 404

    missing_employee = client.post(
        "/api/v1/availability/check",
        json={
            "start_datetime": DAY.replace(hour=13).isoformat(),
            "end_datetime": DAY.replace(hour=14).isoformat(),
            "employee_ids": ["00000000-0000-0000-0000-000000000000"],
        },
    )
    assert missing_employee.status_code == 404


def test_availability_check_without_resources_is_available(client: TestClient) -> None:
    response = client.post(
        "/api/v1/availability/check",
        json={
            "start_datetime": DAY.replace(hour=13).isoformat(),
            "end_datetime": DAY.replace(hour=14).isoformat(),
        },
    )

    assert response.status_code == 200
    assert response.json()["available"] is True
    assert response.json()["vehicle"] is None
    assert response.json()["employees"] == []


def test_availability_rejects_invalid_windows_and_duplicates(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    employee = create_employee_via_api(client, auth_headers, created_resources)
    naive = client.post(
        "/api/v1/availability/check",
        json={
            "start_datetime": "2027-05-10T10:00:00",
            "end_datetime": "2027-05-10T12:00:00Z",
        },
    )
    assert naive.status_code == 422

    inverted = client.post(
        "/api/v1/availability/check",
        json={
            "start_datetime": "2027-05-10T12:00:00Z",
            "end_datetime": "2027-05-10T10:00:00Z",
        },
    )
    assert inverted.status_code == 422

    duplicates = client.post(
        "/api/v1/availability/check",
        json={
            "start_datetime": DAY.replace(hour=10).isoformat(),
            "end_datetime": DAY.replace(hour=12).isoformat(),
            "employee_ids": [employee["id"], employee["id"]],
        },
    )
    assert duplicates.status_code == 422

    naive_query = client.get(
        "/api/v1/availability/vehicles",
        params={"start_datetime": "2027-05-10T10:00:00", "end_datetime": "2027-05-10T12:00:00Z"},
    )
    assert naive_query.status_code == 422
