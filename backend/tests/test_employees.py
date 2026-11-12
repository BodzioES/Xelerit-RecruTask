from uuid import UUID

from fastapi.testclient import TestClient


def _payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "first_name": "Pytest",
        "last_name": "Driver",
        "role": "driver",
    }
    payload.update(overrides)
    return payload


def _create_employee(
    client: TestClient,
    auth_headers: dict[str, str],
    resources: dict[str, list[UUID]],
    **overrides: object,
) -> dict[str, object]:
    response = client.post(
        "/api/v1/provider/employees",
        json=_payload(**overrides),
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    resources["employees"].append(UUID(body["id"]))
    return body


def test_provider_employee_routes_require_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/provider/employees")

    assert response.status_code == 401


def test_provider_can_create_and_list_employee(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    created = _create_employee(client, auth_headers, created_resources)

    response = client.get("/api/v1/provider/employees", headers=auth_headers)

    assert response.status_code == 200
    assert created["id"] in {item["id"] for item in response.json()}
    assert created["role"] == "driver"
    assert created["is_active"] is True


def test_provider_can_update_employee(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    created = _create_employee(client, auth_headers, created_resources)

    response = client.patch(
        f"/api/v1/provider/employees/{created['id']}",
        json={"role": "mover", "first_name": "Updated"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["role"] == "mover"
    assert updated["first_name"] == "Updated"
    assert updated["last_name"] == "Driver"


def test_delete_deactivates_employee(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    created = _create_employee(client, auth_headers, created_resources)

    response = client.delete(f"/api/v1/provider/employees/{created['id']}", headers=auth_headers)

    assert response.status_code == 204
    provider_list = client.get("/api/v1/provider/employees", headers=auth_headers)
    stored = next(item for item in provider_list.json() if item["id"] == created["id"])
    assert stored["is_active"] is False


def test_employee_validation_rejects_unknown_role(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/provider/employees",
        json=_payload(role="pilot"),
        headers=auth_headers,
    )

    assert response.status_code == 422


def test_provider_cannot_set_employee_name_to_null(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    created = _create_employee(client, auth_headers, created_resources)

    response = client.patch(
        f"/api/v1/provider/employees/{created['id']}",
        json={"first_name": None},
        headers=auth_headers,
    )

    assert response.status_code == 422
