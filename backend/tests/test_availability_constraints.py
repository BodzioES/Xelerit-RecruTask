from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from threading import Barrier
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.enums import BookingStatus
from app.db.session import SessionLocal
from app.modules.availability.models import VehicleUnavailability
from app.modules.bookings.models import BookingEmployee
from tests.factories import build_booking, create_employee_via_api, create_vehicle_via_api

DAY = datetime(2027, 7, 10, tzinfo=UTC)


def _commit_booking(
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


def test_database_rejects_overlapping_vehicle_bookings(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    vehicle_id = UUID(vehicle["id"])
    _commit_booking(
        created_resources,
        vehicle_id=vehicle_id,
        start=DAY.replace(hour=10),
        end=DAY.replace(hour=12),
    )

    with SessionLocal() as db:
        db.add(
            build_booking(
                vehicle_id=vehicle_id,
                start=DAY.replace(hour=11),
                end=DAY.replace(hour=13),
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()


def test_cancelled_booking_bypasses_vehicle_exclusion(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    vehicle_id = UUID(vehicle["id"])
    _commit_booking(
        created_resources,
        vehicle_id=vehicle_id,
        start=DAY.replace(hour=10),
        end=DAY.replace(hour=12),
    )
    _commit_booking(
        created_resources,
        vehicle_id=vehicle_id,
        start=DAY.replace(hour=11),
        end=DAY.replace(hour=13),
        status=BookingStatus.CANCELLED,
    )


def test_database_rejects_overlapping_employee_assignments(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    employee = create_employee_via_api(client, auth_headers, created_resources)
    employee_id = UUID(employee["id"])
    _commit_booking(
        created_resources,
        vehicle_id=None,
        start=DAY.replace(hour=10),
        end=DAY.replace(hour=12),
        employee_ids=(employee_id,),
    )

    with SessionLocal() as db:
        db.add(
            build_booking(
                vehicle_id=None,
                start=DAY.replace(hour=11),
                end=DAY.replace(hour=13),
                employee_ids=(employee_id,),
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()


def test_released_employee_assignment_bypasses_exclusion(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    employee = create_employee_via_api(client, auth_headers, created_resources)
    employee_id = UUID(employee["id"])
    booking_id = _commit_booking(
        created_resources,
        vehicle_id=None,
        start=DAY.replace(hour=10),
        end=DAY.replace(hour=12),
        employee_ids=(employee_id,),
    )

    with SessionLocal() as db:
        assignment = db.scalar(
            select(BookingEmployee).where(BookingEmployee.booking_id == booking_id)
        )
        assert assignment is not None
        assignment.is_released = True
        db.commit()

    _commit_booking(
        created_resources,
        vehicle_id=None,
        start=DAY.replace(hour=11),
        end=DAY.replace(hour=13),
        employee_ids=(employee_id,),
    )


def test_database_rejects_overlapping_unavailability_blocks(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    vehicle_id = UUID(vehicle["id"])

    with SessionLocal() as db:
        db.add(
            VehicleUnavailability(
                vehicle_id=vehicle_id,
                start_datetime=DAY.replace(hour=14),
                end_datetime=DAY.replace(hour=16),
            )
        )
        db.commit()

    with SessionLocal() as db:
        db.add(
            VehicleUnavailability(
                vehicle_id=vehicle_id,
                start_datetime=DAY.replace(hour=15),
                end_datetime=DAY.replace(hour=17),
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()


def test_concurrent_overlapping_bookings_allow_only_one(
    client: TestClient,
    auth_headers: dict[str, str],
    created_resources: dict[str, list[UUID]],
) -> None:
    vehicle = create_vehicle_via_api(client, auth_headers, created_resources)
    vehicle_id = UUID(vehicle["id"])

    barrier = Barrier(2)
    results: list[tuple[str, UUID | None]] = []

    def insert() -> None:
        booking = build_booking(
            vehicle_id=vehicle_id,
            start=DAY.replace(hour=10),
            end=DAY.replace(hour=12),
        )
        barrier.wait()
        with SessionLocal() as db:
            db.add(booking)
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                results.append(("conflict", None))
            else:
                results.append(("created", booking.id))

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(insert), pool.submit(insert)]
        for future in futures:
            future.result(timeout=15)

    assert sorted(outcome for outcome, _ in results) == ["conflict", "created"]
    created_id = next(booking_id for outcome, booking_id in results if outcome == "created")
    assert created_id is not None
    created_resources["bookings"].append(created_id)
