import re
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.encryption import decrypt_secret
from app.db.enums import ServiceType
from app.db.session import SessionLocal
from app.modules.handover.models import HandoverRecord
from tests.booking_helpers import build_booking_payload, create_booking_via_api
from tests.factories import create_employee_via_api, create_vehicle_via_api


@pytest.fixture(autouse=True)
def _install_pricing_rules(pricing_rules: None) -> None:
    return None


def _set_status(
    client: TestClient,
    auth_headers: dict[str, str],
    booking_id: object,
    new_status: str,
) -> None:
    response = client.patch(
        f"/api/v1/provider/bookings/{booking_id}/status",
        json={"status": new_status},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text


def test_handover_code_is_encrypted_and_hidden_until_ready(
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
    booking_id = body["id"]
    token = str(body["access_token"])
    handover_url = f"/api/v1/bookings/{booking_id}/handover"

    assert client.post(handover_url, json={"generate_code": True}).status_code == 401

    response = client.post(
        handover_url,
        json={
            "generate_code": True,
            "pickup_instructions": "Lockbox is next to the driver's door.",
            "return_instructions": "Leave the keys in the lockbox.",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    code = response.json()["access_code"]
    assert re.fullmatch(r"\d{6}", code)

    provider_read = client.get(handover_url, headers=auth_headers)
    assert provider_read.status_code == 200, provider_read.text
    assert provider_read.json()["access_code"] == code

    assert client.get(handover_url, params={"token": "wrong"}).status_code == 404
    guest_before_ready = client.get(handover_url, params={"token": token})
    assert guest_before_ready.status_code == 403, guest_before_ready.text

    with SessionLocal() as db:
        record = db.scalar(
            select(HandoverRecord).where(HandoverRecord.booking_id == UUID(str(booking_id)))
        )
    assert record is not None
    assert record.access_code_encrypted != code
    assert record.access_code_encrypted.startswith("v1:")
    assert decrypt_secret(record.access_code_encrypted) == code

    _set_status(client, auth_headers, booking_id, "confirmed")
    _set_status(client, auth_headers, booking_id, "ready_for_pickup")

    guest = client.get(handover_url, params={"token": token})
    assert guest.status_code == 200, guest.text
    assert guest.json()["access_code"] == code
    assert guest.json()["pickup_instructions"].startswith("Lockbox")

    rotated = client.post(
        handover_url,
        json={"generate_code": True},
        headers=auth_headers,
    )
    assert rotated.status_code == 200, rotated.text
    new_code = rotated.json()["access_code"]
    assert re.fullmatch(r"\d{6}", new_code)
    assert new_code != code
    assert client.get(handover_url, params={"token": token}).json()["access_code"] == new_code


def test_handover_requires_self_drive_and_an_existing_record(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    create_employee_via_api(client, auth_headers, created_resources, role="driver")
    van_booking = create_booking_via_api(
        client,
        created_resources,
        build_booking_payload(
            ServiceType.VAN_DRIVER,
            vehicle_id=vehicle["id"],
            hours=4,
        ),
    )

    response = client.post(
        f"/api/v1/bookings/{van_booking['id']}/handover",
        json={"generate_code": True},
        headers=auth_headers,
    )
    assert response.status_code == 400, response.text

    second_vehicle = create_vehicle_via_api(
        client, auth_headers, created_resources, model="Handover Van"
    )
    self_drive = create_booking_via_api(
        client,
        created_resources,
        build_booking_payload(ServiceType.SELF_DRIVE, vehicle_id=second_vehicle["id"]),
    )
    response = client.get(
        f"/api/v1/bookings/{self_drive['id']}/handover",
        headers=auth_headers,
    )
    assert response.status_code == 404, response.text
