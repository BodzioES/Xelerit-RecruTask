from decimal import Decimal
from uuid import UUID

from fastapi.testclient import TestClient


def _payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "brand": "Pytest",
        "model": "Test Van",
        "year": 2023,
        "category": "L2H2",
        "cargo_volume": "10.50",
        "payload": 1200,
        "seats": 3,
        "description": "Vehicle created by the test suite.",
        "image_url": "/vehicles/test.svg",
        "hourly_price": "50.00",
        "daily_price": "300.00",
    }
    payload.update(overrides)
    return payload


def _create_vehicle(
    client: TestClient,
    auth_headers: dict[str, str],
    resources: dict[str, list[UUID]],
    **overrides: object,
) -> dict[str, object]:
    response = client.post(
        "/api/v1/provider/vehicles",
        json=_payload(**overrides),
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    resources["vehicles"].append(UUID(body["id"]))
    return body


def test_provider_vehicle_routes_require_authentication(client: TestClient) -> None:
    response = client.post("/api/v1/provider/vehicles", json=_payload())

    assert response.status_code == 401


def test_public_catalog_lists_only_active_vehicles(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    active = _create_vehicle(client, auth_headers, created_resources)
    inactive = _create_vehicle(client, auth_headers, created_resources, is_active=False)

    response = client.get("/api/v1/vehicles")

    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert active["id"] in ids
    assert inactive["id"] not in ids
    assert client.get(f"/api/v1/vehicles/{active['id']}").status_code == 200
    assert client.get(f"/api/v1/vehicles/{inactive['id']}").status_code == 404


def test_provider_can_list_inactive_vehicles(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    inactive = _create_vehicle(client, auth_headers, created_resources, is_active=False)

    response = client.get("/api/v1/provider/vehicles", headers=auth_headers)

    assert response.status_code == 200
    assert inactive["id"] in {item["id"] for item in response.json()}


def test_provider_can_create_and_update_vehicle(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    created = _create_vehicle(client, auth_headers, created_resources)
    assert Decimal(str(created["hourly_price"])) == Decimal("50.00")

    response = client.patch(
        f"/api/v1/provider/vehicles/{created['id']}",
        json={"hourly_price": "65.00", "seats": 4},
        headers=auth_headers,
    )

    assert response.status_code == 200
    updated = response.json()
    assert Decimal(str(updated["hourly_price"])) == Decimal("65.00")
    assert updated["seats"] == 4
    assert updated["brand"] == "Pytest"


def test_provider_cannot_set_required_field_to_null(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    created = _create_vehicle(client, auth_headers, created_resources)

    response = client.patch(
        f"/api/v1/provider/vehicles/{created['id']}",
        json={"brand": None},
        headers=auth_headers,
    )

    assert response.status_code == 422


def test_vehicle_validation_rejects_invalid_capacity(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/provider/vehicles",
        json=_payload(cargo_volume="0"),
        headers=auth_headers,
    )

    assert response.status_code == 422


def test_delete_deactivates_vehicle(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    created = _create_vehicle(client, auth_headers, created_resources)

    response = client.delete(f"/api/v1/provider/vehicles/{created['id']}", headers=auth_headers)

    assert response.status_code == 204
    provider_list = client.get("/api/v1/provider/vehicles", headers=auth_headers)
    stored = next(item for item in provider_list.json() if item["id"] == created["id"])
    assert stored["is_active"] is False
    assert client.get(f"/api/v1/vehicles/{created['id']}").status_code == 404
