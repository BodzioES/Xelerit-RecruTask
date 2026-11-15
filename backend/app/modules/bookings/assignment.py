from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.db.enums import EmployeeRole, ServiceType
from app.modules.availability.service import (
    employee_reason,
    list_available_employees,
    list_available_vehicles,
    vehicle_reason,
)
from app.modules.bookings.models import Booking, BookingEmployee
from app.modules.bookings.provider_schemas import AssignResourcesRequest
from app.modules.bookings.status import TERMINAL
from app.modules.employees.models import Employee
from app.modules.vehicles.models import Vehicle


def assign_for_creation(
    db: Session,
    booking: Booking,
    *,
    requested_vehicle_id: UUID | None,
    helpers: int,
) -> None:
    """Pick an available vehicle and the staff required by the service."""
    vehicle = _pick_vehicle(db, booking, requested_vehicle_id)
    booking.vehicle = vehicle

    employees = _pick_employees(db, booking, helpers)
    booking.assignments = [_assignment(booking, employee) for employee in employees]


def update_resources(db: Session, booking: Booking, payload: AssignResourcesRequest) -> Booking:
    """Provider override: change the vehicle and/or replace the assigned staff."""
    if booking.status in TERMINAL:
        raise ConflictError("Resources cannot be changed for a closed booking")

    try:
        if payload.vehicle_id is not None:
            vehicle = _lock_vehicle(db, booking, payload.vehicle_id)
            booking.vehicle = vehicle

        if payload.employee_ids is not None:
            employees = _validated_employees(db, booking, payload.employee_ids)
            _replace_assignments(db, booking, employees)

        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("The requested resources are no longer available") from exc
    return booking


def _pick_vehicle(db: Session, booking: Booking, requested_vehicle_id: UUID | None) -> Vehicle:
    if requested_vehicle_id is not None:
        return _lock_vehicle(db, booking, requested_vehicle_id)

    candidates = list_available_vehicles(
        db,
        booking.start_datetime,
        booking.end_datetime,
        exclude_booking_id=booking.id,
    )
    if not candidates:
        raise ConflictError("No vehicle is available for the requested period")

    locked = _lock_vehicles(db, [candidate.id for candidate in candidates])
    preference = _vehicle_preference(booking.service_type, locked)
    for vehicle in preference:
        reason = vehicle_reason(
            db,
            vehicle,
            booking.start_datetime,
            booking.end_datetime,
            exclude_booking_id=booking.id,
        )
        if reason is None:
            return vehicle
    raise ConflictError("No vehicle is available for the requested period")


def _vehicle_preference(service_type: ServiceType, vehicles: list[Vehicle]) -> list[Vehicle]:
    if service_type == ServiceType.FULL_MOVING:
        return sorted(vehicles, key=lambda item: (-item.cargo_volume, item.brand, item.model))
    return sorted(vehicles, key=lambda item: (item.cargo_volume, item.brand, item.model))


def _lock_vehicle(db: Session, booking: Booking, vehicle_id: UUID) -> Vehicle:
    vehicle = db.scalar(select(Vehicle).where(Vehicle.id == vehicle_id).with_for_update())
    if vehicle is None:
        raise NotFoundError("Vehicle not found")

    reason = vehicle_reason(
        db,
        vehicle,
        booking.start_datetime,
        booking.end_datetime,
        exclude_booking_id=booking.id,
    )
    if reason is not None:
        raise ConflictError("Vehicle is not available for the requested period")
    return vehicle


def _lock_vehicles(db: Session, vehicle_ids: list[UUID]) -> list[Vehicle]:
    return list(
        db.scalars(
            select(Vehicle)
            .where(Vehicle.id.in_(vehicle_ids))
            .order_by(Vehicle.id)
            .with_for_update()
        )
    )


def _pick_employees(db: Session, booking: Booking, helpers: int) -> list[Employee]:
    roles = _required_roles(booking.service_type, helpers)
    if not roles:
        return []

    candidates = {
        EmployeeRole.DRIVER: list_available_employees(
            db,
            booking.start_datetime,
            booking.end_datetime,
            role=EmployeeRole.DRIVER,
            exclude_booking_id=booking.id,
        ),
        EmployeeRole.MOVER: list_available_employees(
            db,
            booking.start_datetime,
            booking.end_datetime,
            role=EmployeeRole.MOVER,
            exclude_booking_id=booking.id,
        ),
    }
    ids = {employee.id for employees in candidates.values() for employee in employees}
    locked = _lock_employees(db, ids)
    by_id = {employee.id: employee for employee in locked}

    selected: list[Employee] = []
    used: set[UUID] = set()
    for role in roles:
        employee = _choose_employee(db, booking, candidates[role], by_id, used)
        if employee is None:
            raise ConflictError(f"No available {role.value} for the requested period")
        selected.append(employee)
        used.add(employee.id)
    return selected


def _required_roles(service_type: ServiceType, helpers: int) -> list[EmployeeRole]:
    if service_type == ServiceType.VAN_DRIVER:
        return [EmployeeRole.DRIVER]
    if service_type == ServiceType.FULL_MOVING:
        return [EmployeeRole.DRIVER, *([EmployeeRole.MOVER] * helpers)]
    return []


def _choose_employee(
    db: Session,
    booking: Booking,
    candidates: list[Employee],
    by_id: dict[UUID, Employee],
    used: set[UUID],
) -> Employee | None:
    for candidate in candidates:
        if candidate.id in used:
            continue
        employee = by_id.get(candidate.id)
        if employee is None:
            continue
        reason = employee_reason(
            db,
            employee,
            booking.start_datetime,
            booking.end_datetime,
            exclude_booking_id=booking.id,
        )
        if reason is None:
            return employee
    return None


def _lock_employees(db: Session, employee_ids: set[UUID]) -> list[Employee]:
    if not employee_ids:
        return []
    return list(
        db.scalars(
            select(Employee)
            .where(Employee.id.in_(employee_ids))
            .order_by(Employee.id)
            .with_for_update()
        )
    )


def _validated_employees(db: Session, booking: Booking, employee_ids: list[UUID]) -> list[Employee]:
    if not employee_ids:
        _validate_roles(booking, [])
        return []

    employees = _lock_employees(db, set(employee_ids))
    if len(employees) != len(employee_ids):
        raise NotFoundError("Employee not found")

    _validate_roles(booking, employees)
    for employee in employees:
        reason = employee_reason(
            db,
            employee,
            booking.start_datetime,
            booking.end_datetime,
            exclude_booking_id=booking.id,
        )
        if reason is not None:
            raise ConflictError(
                f"{employee.first_name} {employee.last_name} is not available for this period"
            )
    return employees


def _validate_roles(booking: Booking, employees: list[Employee]) -> None:
    drivers = [employee for employee in employees if employee.role == EmployeeRole.DRIVER]
    movers = [employee for employee in employees if employee.role == EmployeeRole.MOVER]

    if booking.service_type == ServiceType.SELF_DRIVE:
        if employees:
            raise ValidationError("Self-drive bookings do not need assigned employees")
        return

    if len(drivers) != 1:
        raise ValidationError("Exactly one driver is required")

    if booking.service_type == ServiceType.VAN_DRIVER:
        if movers:
            raise ValidationError("Van + Driver requires exactly one driver and no movers")
        return

    if len(movers) != booking.helpers_requested:
        raise ValidationError(
            "Full Moving requires exactly "
            f"{booking.helpers_requested} movers requested by the customer"
        )


def _replace_assignments(db: Session, booking: Booking, employees: list[Employee]) -> None:
    booking.assignments.clear()
    db.flush()
    booking.assignments = [_assignment(booking, employee) for employee in employees]


def _assignment(booking: Booking, employee: Employee) -> BookingEmployee:
    return BookingEmployee(
        employee=employee,
        start_datetime=booking.start_datetime,
        end_datetime=booking.end_datetime,
        assigned_at=datetime.now(UTC),
    )


def commit_or_conflict(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("The requested resources are no longer available") from exc
