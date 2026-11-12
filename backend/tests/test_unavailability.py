from datetime import UTC, datetime
from uuid import UUID

from fastapi.testclient import TestClient

from tests.availability_helpers import insert_booking
from tests.factories import create_employee_via_api, create_vehicle_via_api

DAY = datetime(2027, 6, 10, tzinfo=UTC)


def _block_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "start_datetime": DAY.replace(hour=14).isoformat(),
        "end_datetime": DAY.replace(hour=16).isoformat(),
        "reason": "Maintenance",
    }
    payload.update(overrides)
    return payload


def test_unavailability_routes_require_authentication(client: TestClient) -> None:
    assert (
        client.get(
            "/api/v1/provider/vehicles/00000000-0000-0000-0000-000000000000/unavailability"
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/provider/employees/00000000-0000-0000-0000-000000000000/unavailability",
            json=_block_payload(),
        ).status_code
        == 401
    )
    assert client.get("/api/v1/provider/employees/availability").status_code == 401


def test_vehicle_unavailability_crud(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    base_url = f"/api/v1/provider/vehicles/{vehicle['id']}/unavailability"

    created = client.post(base_url, json=_block_payload(), headers=auth_headers)
    assert created.status_code == 201, created.text
    block = created.json()
    assert block["vehicle_id"] == vehicle["id"]
    assert block["reason"] == "Maintenance"

    listed = client.get(base_url, headers=auth_headers)
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [block["id"]]

    deleted = client.delete(f"{base_url}/{block['id']}", headers=auth_headers)
    assert deleted.status_code == 204
    assert client.get(base_url, headers=auth_headers).json() == []


def test_employee_unavailability_crud(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    employee = create_employee_via_api(client, auth_headers, created_resources)
    base_url = f"/api/v1/provider/employees/{employee['id']}/unavailability"

    created = client.post(
        base_url, json=_block_payload(reason="  Training  "), headers=auth_headers
    )
    assert created.status_code == 201, created.text
    block = created.json()
    assert block["employee_id"] == employee["id"]
    assert block["reason"] == "Training"

    assert client.get(base_url, headers=auth_headers).json()[0]["id"] == block["id"]
    assert client.delete(f"{base_url}/{block['id']}", headers=auth_headers).status_code == 204
    assert client.get(base_url, headers=auth_headers).json() == []


def test_unavailability_cannot_overlap_an_active_booking(
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

    vehicle_response = client.post(
        f"/api/v1/provider/vehicles/{vehicle['id']}/unavailability",
        json=_block_payload(
            start_datetime=DAY.replace(hour=11).isoformat(),
            end_datetime=DAY.replace(hour=13).isoformat(),
        ),
        headers=auth_headers,
    )
    assert vehicle_response.status_code == 409

    employee_response = client.post(
        f"/api/v1/provider/employees/{employee['id']}/unavailability",
        json=_block_payload(
            start_datetime=DAY.replace(hour=11).isoformat(),
            end_datetime=DAY.replace(hour=13).isoformat(),
        ),
        headers=auth_headers,
    )
    assert employee_response.status_code == 409


def test_unavailability_cannot_overlap_another_block(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    base_url = f"/api/v1/provider/vehicles/{vehicle['id']}/unavailability"

    assert client.post(base_url, json=_block_payload(), headers=auth_headers).status_code == 201
    overlapping = client.post(
        base_url,
        json=_block_payload(
            start_datetime=DAY.replace(hour=15).isoformat(),
            end_datetime=DAY.replace(hour=17).isoformat(),
        ),
        headers=auth_headers,
    )

    assert overlapping.status_code == 409


def test_unavailability_validates_window(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    base_url = f"/api/v1/provider/vehicles/{vehicle['id']}/unavailability"

    inverted = client.post(
        base_url,
        json=_block_payload(
            start_datetime=DAY.replace(hour=16).isoformat(),
            end_datetime=DAY.replace(hour=14).isoformat(),
        ),
        headers=auth_headers,
    )
    assert inverted.status_code == 422

    naive = client.post(
        base_url,
        json=_block_payload(
            start_datetime="2027-06-10T14:00:00",
            end_datetime="2027-06-10T16:00:00",
        ),
        headers=auth_headers,
    )
    assert naive.status_code == 422


def test_unavailability_ownership_is_enforced(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    first_vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    second_vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    first_employee = create_employee_via_api(client, auth_headers, created_resources)
    second_employee = create_employee_via_api(client, auth_headers, created_resources)

    vehicle_block = client.post(
        f"/api/v1/provider/vehicles/{first_vehicle['id']}/unavailability",
        json=_block_payload(),
        headers=auth_headers,
    ).json()
    employee_block = client.post(
        f"/api/v1/provider/employees/{first_employee['id']}/unavailability",
        json=_block_payload(),
        headers=auth_headers,
    ).json()

    wrong_vehicle = client.delete(
        f"/api/v1/provider/vehicles/{second_vehicle['id']}/unavailability/{vehicle_block['id']}",
        headers=auth_headers,
    )
    assert wrong_vehicle.status_code == 404
    assert (
        client.get(
            f"/api/v1/provider/vehicles/{second_vehicle['id']}/unavailability",
            headers=auth_headers,
        ).json()
        == []
    )

    wrong_employee = client.delete(
        f"/api/v1/provider/employees/{second_employee['id']}/unavailability/{employee_block['id']}",
        headers=auth_headers,
    )
    assert wrong_employee.status_code == 404


def test_unavailability_rejects_unknown_resource(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    missing = "00000000-0000-0000-0000-000000000000"
    vehicle_response = client.post(
        f"/api/v1/provider/vehicles/{missing}/unavailability",
        json=_block_payload(),
        headers=auth_headers,
    )
    assert vehicle_response.status_code == 404

    employee_response = client.post(
        f"/api/v1/provider/employees/{missing}/unavailability",
        json=_block_payload(),
        headers=auth_headers,
    )
    assert employee_response.status_code == 404


def test_blocked_resources_are_reported_as_unavailability(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    employee = create_employee_via_api(client, auth_headers, created_resources)

    for resource in ("vehicles", "employees"):
        resource_id = vehicle["id"] if resource == "vehicles" else employee["id"]
        created = client.post(
            f"/api/v1/provider/{resource}/{resource_id}/unavailability",
            json=_block_payload(),
            headers=auth_headers,
        )
        assert created.status_code == 201, created.text

    response = client.post(
        "/api/v1/availability/check",
        json={
            "start_datetime": DAY.replace(hour=14, minute=30).isoformat(),
            "end_datetime": DAY.replace(hour=15, minute=30).isoformat(),
            "vehicle_id": vehicle["id"],
            "employee_ids": [employee["id"]],
        },
    )

    assert response.status_code == 200
    assert response.json()["available"] is False
    assert response.json()["vehicle"]["reason"] == "unavailability"
    assert response.json()["employees"][0]["reason"] == "unavailability"


def test_provider_employee_availability_endpoint(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    employee = create_employee_via_api(client, auth_headers, created_resources)
    params = {
        "start_datetime": DAY.replace(hour=8).isoformat(),
        "end_datetime": DAY.replace(hour=9).isoformat(),
        "role": "driver",
    }

    response = client.get(
        "/api/v1/provider/employees/availability", params=params, headers=auth_headers
    )

    assert response.status_code == 200
    assert employee["id"] in {item["id"] for item in response.json()}
