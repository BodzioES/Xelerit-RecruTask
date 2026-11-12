from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.db.enums import BookingStatus
from app.modules.availability.models import EmployeeUnavailability, VehicleUnavailability
from app.modules.availability.schemas import UnavailabilityCreate
from app.modules.bookings.models import Booking, BookingEmployee
from app.modules.employees.service import get_employee
from app.modules.vehicles.service import get_vehicle

INACTIVE_BOOKING_STATUSES = (BookingStatus.CANCELLED, BookingStatus.REJECTED)


def list_vehicle_blocks(db: Session, vehicle_id: UUID) -> list[VehicleUnavailability]:
    get_vehicle(db, vehicle_id)
    statement = (
        select(VehicleUnavailability)
        .where(VehicleUnavailability.vehicle_id == vehicle_id)
        .order_by(VehicleUnavailability.start_datetime, VehicleUnavailability.id)
    )
    return list(db.scalars(statement))


def create_vehicle_block(
    db: Session, vehicle_id: UUID, payload: UnavailabilityCreate
) -> VehicleUnavailability:
    get_vehicle(db, vehicle_id)
    _ensure_vehicle_is_free(db, vehicle_id, payload)

    block = VehicleUnavailability(
        vehicle_id=vehicle_id,
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        reason=payload.reason,
    )
    db.add(block)
    _commit(db)
    db.refresh(block)
    return block


def delete_vehicle_block(db: Session, vehicle_id: UUID, block_id: UUID) -> None:
    get_vehicle(db, vehicle_id)
    block = db.get(VehicleUnavailability, block_id)
    if block is None or block.vehicle_id != vehicle_id:
        raise NotFoundError("Vehicle unavailability not found")
    db.delete(block)
    _commit(db)


def list_employee_blocks(db: Session, employee_id: UUID) -> list[EmployeeUnavailability]:
    get_employee(db, employee_id)
    statement = (
        select(EmployeeUnavailability)
        .where(EmployeeUnavailability.employee_id == employee_id)
        .order_by(EmployeeUnavailability.start_datetime, EmployeeUnavailability.id)
    )
    return list(db.scalars(statement))


def create_employee_block(
    db: Session, employee_id: UUID, payload: UnavailabilityCreate
) -> EmployeeUnavailability:
    get_employee(db, employee_id)
    _ensure_employee_is_free(db, employee_id, payload)

    block = EmployeeUnavailability(
        employee_id=employee_id,
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        reason=payload.reason,
    )
    db.add(block)
    _commit(db)
    db.refresh(block)
    return block


def delete_employee_block(db: Session, employee_id: UUID, block_id: UUID) -> None:
    get_employee(db, employee_id)
    block = db.get(EmployeeUnavailability, block_id)
    if block is None or block.employee_id != employee_id:
        raise NotFoundError("Employee unavailability not found")
    db.delete(block)
    _commit(db)


def _ensure_vehicle_is_free(db: Session, vehicle_id: UUID, payload: UnavailabilityCreate) -> None:
    conflict = db.scalar(
        select(Booking.id)
        .where(
            Booking.vehicle_id == vehicle_id,
            Booking.status.notin_(INACTIVE_BOOKING_STATUSES),
            Booking.start_datetime < payload.end_datetime,
            Booking.end_datetime > payload.start_datetime,
        )
        .limit(1)
    )
    if conflict is not None:
        raise ConflictError("Unavailability overlaps an active booking")


def _ensure_employee_is_free(db: Session, employee_id: UUID, payload: UnavailabilityCreate) -> None:
    conflict = db.scalar(
        select(BookingEmployee.id)
        .join(Booking, Booking.id == BookingEmployee.booking_id)
        .where(
            BookingEmployee.employee_id == employee_id,
            BookingEmployee.is_released.is_(False),
            Booking.status.notin_(INACTIVE_BOOKING_STATUSES),
            BookingEmployee.start_datetime < payload.end_datetime,
            BookingEmployee.end_datetime > payload.start_datetime,
        )
        .limit(1)
    )
    if conflict is not None:
        raise ConflictError("Unavailability overlaps an active booking")


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("Unavailability period overlaps an existing one") from exc
