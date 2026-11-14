from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.db.enums import ServiceType
from tests.booking_helpers import build_booking_payload, create_booking_via_api
from tests.factories import create_employee_via_api, create_vehicle_via_api


@pytest.fixture(autouse=True)
def _install_pricing_rules(pricing_rules: None) -> None:
    return None


def test_full_moving_auto_assigns_driver_and_requested_helpers(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    create_employee_via_api(client, auth_headers, created_resources, role="driver")
    create_employee_via_api(client, auth_headers, created_resources, role="mover")
    create_employee_via_api(client, auth_headers, created_resources, role="mover")

    body = create_booking_via_api(
        client,
        created_resources,
        build_booking_payload(
            ServiceType.FULL_MOVING,
            vehicle_id=vehicle["id"],
            hours=8,
            helpers=2,
        ),
    )

    roles = [assignment["employee"]["role"] for assignment in body["assignments"]]
    assert sorted(roles) == ["driver", "mover", "mover"]
    assert body["vehicle"]["id"] == vehicle["id"]
    assert body["moving_details"]["floor"] == 2

    for target in ("confirmed", "in_progress", "completed"):
        response = client.patch(
            f"/api/v1/provider/bookings/{body['id']}/status",
            json={"status": target, "note": f"Moved to {target}"},
            headers=auth_headers,
        )
        assert response.status_code == 200, response.text

    assert [event["new_status"] for event in response.json()["events"]] == [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
    ]

    invalid = client.patch(
        f"/api/v1/provider/bookings/{body['id']}/status",
        json={"status": "in_progress"},
        headers=auth_headers,
    )
    assert invalid.status_code == 409, invalid.text


def test_self_drive_status_lifecycle_enforces_ready_for_pickup(
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
    url = f"/api/v1/provider/bookings/{body['id']}/status"
    handover_url = f"/api/v1/bookings/{body['id']}/handover"

    assert client.patch(url, json={"status": "confirmed"}, headers=auth_headers).status_code == 200
    response = client.patch(url, json={"status": "in_progress"}, headers=auth_headers)
    assert response.status_code == 409, response.text

    # The handover must exist before the customer can be told to collect the van.
    response = client.patch(url, json={"status": "ready_for_pickup"}, headers=auth_headers)
    assert response.status_code == 400, response.text

    client.post(
        handover_url,
        json={"generate_code": True},
        headers=auth_headers,
    )
    response = client.patch(url, json={"status": "ready_for_pickup"}, headers=auth_headers)
    assert response.status_code == 400, response.text

    client.post(
        handover_url,
        json={"pickup_instructions": "Lockbox is next to the driver's door."},
        headers=auth_headers,
    )
    assert (
        client.patch(url, json={"status": "ready_for_pickup"}, headers=auth_headers).status_code
        == 200
    )
    response = client.patch(url, json={"status": "completed"}, headers=auth_headers)
    assert response.status_code == 409, response.text

    assert (
        client.patch(url, json={"status": "in_progress"}, headers=auth_headers).status_code == 200
    )
    assert client.patch(url, json={"status": "completed"}, headers=auth_headers).status_code == 200
    assert client.patch(url, json={"status": "cancelled"}, headers=auth_headers).status_code == 409


def test_van_driver_cannot_be_ready_for_pickup_and_needs_one_driver(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    driver = create_employee_via_api(client, auth_headers, created_resources, role="driver")
    body = create_booking_via_api(
        client,
        created_resources,
        build_booking_payload(
            ServiceType.VAN_DRIVER,
            vehicle_id=vehicle["id"],
            hours=4,
        ),
    )
    status_url = f"/api/v1/provider/bookings/{body['id']}/status"
    assignment_url = f"/api/v1/provider/bookings/{body['id']}/assign-resources"

    assert (
        client.patch(status_url, json={"status": "confirmed"}, headers=auth_headers).status_code
        == 200
    )
    response = client.patch(status_url, json={"status": "ready_for_pickup"}, headers=auth_headers)
    assert response.status_code == 400, response.text

    response = client.post(
        assignment_url,
        json={"employee_ids": []},
        headers=auth_headers,
    )
    assert response.status_code == 400, response.text

    mover = create_employee_via_api(client, auth_headers, created_resources, role="mover")
    response = client.post(
        assignment_url,
        json={"employee_ids": [driver["id"], mover["id"]]},
        headers=auth_headers,
    )
    assert response.status_code == 400, response.text


def test_reassignment_requires_the_customer_helper_count(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    driver = create_employee_via_api(client, auth_headers, created_resources, role="driver")
    first_mover = create_employee_via_api(
        client, auth_headers, created_resources, role="mover", first_name="First"
    )
    second_mover = create_employee_via_api(
        client, auth_headers, created_resources, role="mover", first_name="Second"
    )
    body = create_booking_via_api(
        client,
        created_resources,
        build_booking_payload(
            ServiceType.FULL_MOVING,
            vehicle_id=vehicle["id"],
            hours=8,
            helpers=2,
        ),
    )
    assert body["helpers_requested"] == 2

    assignment_url = f"/api/v1/provider/bookings/{body['id']}/assign-resources"
    response = client.post(
        assignment_url,
        json={"employee_ids": [driver["id"], first_mover["id"]]},
        headers=auth_headers,
    )
    assert response.status_code == 400, response.text

    response = client.post(
        assignment_url,
        json={"employee_ids": [driver["id"], first_mover["id"], second_mover["id"]]},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    movers = [
        assignment
        for assignment in response.json()["assignments"]
        if assignment["employee"]["role"] == "mover"
    ]
    assert len(movers) == 2


def test_provider_can_reassign_vehicle_and_driver(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    first_vehicle = create_vehicle_via_api(
        client, auth_headers, created_resources, model="First Van"
    )
    create_employee_via_api(client, auth_headers, created_resources, role="driver")
    body = create_booking_via_api(
        client,
        created_resources,
        build_booking_payload(
            ServiceType.VAN_DRIVER,
            vehicle_id=first_vehicle["id"],
            hours=4,
        ),
    )

    second_vehicle = create_vehicle_via_api(
        client, auth_headers, created_resources, model="Second Van"
    )
    second_driver = create_employee_via_api(
        client,
        auth_headers,
        created_resources,
        role="driver",
        first_name="Replacement",
    )
    response = client.post(
        f"/api/v1/provider/bookings/{body['id']}/assign-resources",
        json={
            "vehicle_id": second_vehicle["id"],
            "employee_ids": [second_driver["id"]],
        },
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated["vehicle"]["id"] == second_vehicle["id"]
    assert [item["employee_id"] for item in updated["assignments"]] == [second_driver["id"]]


def test_provider_dashboard_and_bookings_list(
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

    dashboard = client.get("/api/v1/provider/dashboard", headers=auth_headers)
    assert dashboard.status_code == 200, dashboard.text
    dashboard_body = dashboard.json()
    assert any(item["id"] == body["id"] for item in dashboard_body["new_bookings"])
    assert any(item["id"] == vehicle["id"] for item in dashboard_body["available_vehicles"])

    bookings = client.get(
        "/api/v1/provider/bookings",
        params={"status": "pending"},
        headers=auth_headers,
    )
    assert bookings.status_code == 200, bookings.text
    assert any(item["id"] == body["id"] for item in bookings.json())

    detail = client.get(f"/api/v1/bookings/{body['id']}", headers=auth_headers)
    assert detail.status_code == 200, detail.text

    assert client.get("/api/v1/provider/dashboard").status_code == 401
    assert client.get("/api/v1/provider/bookings").status_code == 401


def test_provider_can_filter_bookings_by_assigned_employee(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    driver = create_employee_via_api(client, auth_headers, created_resources, role="driver")
    body = create_booking_via_api(
        client,
        created_resources,
        build_booking_payload(ServiceType.VAN_DRIVER, vehicle_id=vehicle["id"], hours=4),
    )

    response = client.post(
        f"/api/v1/provider/bookings/{body['id']}/assign-resources",
        json={"employee_ids": [driver["id"]]},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text

    assigned = client.get(
        "/api/v1/provider/bookings",
        params={"employee_id": driver["id"], "limit": 100},
        headers=auth_headers,
    )
    assert assigned.status_code == 200, assigned.text
    assert any(item["id"] == body["id"] for item in assigned.json())

    other = create_employee_via_api(client, auth_headers, created_resources, role="mover")
    unassigned = client.get(
        "/api/v1/provider/bookings",
        params={"employee_id": other["id"], "limit": 100},
        headers=auth_headers,
    )
    assert unassigned.status_code == 200, unassigned.text
    assert all(item["id"] != body["id"] for item in unassigned.json())
