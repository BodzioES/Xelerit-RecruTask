from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.db.enums import BookingStatus, EmployeeRole
from app.modules.availability.models import EmployeeUnavailability, VehicleUnavailability
from app.modules.availability.schemas import AvailabilityReason, ResourceAvailabilityRead
from app.modules.bookings.models import Booking, BookingEmployee
from app.modules.employees.models import Employee
from app.modules.vehicles.models import Vehicle

# Cancelled and rejected bookings release their resources. Every other status keeps
# the occupied window, including completed bookings (their window is in the past).
INACTIVE_BOOKING_STATUSES = (BookingStatus.CANCELLED, BookingStatus.REJECTED)


@dataclass(frozen=True)
class AvailabilityCheckResult:
    vehicle: ResourceAvailabilityRead | None
    employees: list[ResourceAvailabilityRead]

    @property
    def available(self) -> bool:
        vehicle_ok = self.vehicle is None or self.vehicle.available
        return vehicle_ok and all(employee.available for employee in self.employees)


def buffer_delta() -> timedelta:
    """Operational gap required between two bookings of the same resource."""
    return timedelta(minutes=settings.resource_buffer_minutes)


def list_available_vehicles(
    db: Session,
    start: datetime,
    end: datetime,
    *,
    min_cargo_volume: Decimal | None = None,
    min_payload: int | None = None,
    min_seats: int | None = None,
) -> list[Vehicle]:
    buffer = buffer_delta()
    busy_bookings = select(Booking.vehicle_id).where(
        Booking.vehicle_id.is_not(None),
        Booking.status.notin_(INACTIVE_BOOKING_STATUSES),
        Booking.start_datetime < end + buffer,
        Booking.end_datetime > start - buffer,
    )
    busy_blocks = select(VehicleUnavailability.vehicle_id).where(
        VehicleUnavailability.start_datetime < end,
        VehicleUnavailability.end_datetime > start,
    )

    statement = select(Vehicle).where(
        Vehicle.is_active.is_(True),
        Vehicle.id.notin_(busy_bookings),
        Vehicle.id.notin_(busy_blocks),
    )
    if min_cargo_volume is not None:
        statement = statement.where(Vehicle.cargo_volume >= min_cargo_volume)
    if min_payload is not None:
        statement = statement.where(Vehicle.payload >= min_payload)
    if min_seats is not None:
        statement = statement.where(Vehicle.seats >= min_seats)

    statement = statement.order_by(Vehicle.brand, Vehicle.model, Vehicle.id)
    return list(db.scalars(statement))


def list_available_employees(
    db: Session,
    start: datetime,
    end: datetime,
    *,
    role: EmployeeRole | None = None,
) -> list[Employee]:
    buffer = buffer_delta()
    busy_assignments = (
        select(BookingEmployee.employee_id)
        .join(Booking, Booking.id == BookingEmployee.booking_id)
        .where(
            Booking.status.notin_(INACTIVE_BOOKING_STATUSES),
            BookingEmployee.is_released.is_(False),
            BookingEmployee.start_datetime < end + buffer,
            BookingEmployee.end_datetime > start - buffer,
        )
    )
    busy_blocks = select(EmployeeUnavailability.employee_id).where(
        EmployeeUnavailability.start_datetime < end,
        EmployeeUnavailability.end_datetime > start,
    )

    statement = select(Employee).where(
        Employee.is_active.is_(True),
        Employee.id.notin_(busy_assignments),
        Employee.id.notin_(busy_blocks),
    )
    if role is not None:
        statement = statement.where(Employee.role == role)

    statement = statement.order_by(Employee.last_name, Employee.first_name, Employee.id)
    return list(db.scalars(statement))


def check_availability(
    db: Session,
    start: datetime,
    end: datetime,
    *,
    vehicle_id: UUID | None,
    employee_ids: list[UUID],
) -> AvailabilityCheckResult:
    vehicle_result = _check_vehicle(db, start, end, vehicle_id) if vehicle_id else None
    employee_results = _check_employees(db, start, end, employee_ids)
    return AvailabilityCheckResult(vehicle=vehicle_result, employees=employee_results)


def vehicle_reason(
    db: Session, vehicle: Vehicle, start: datetime, end: datetime
) -> AvailabilityReason | None:
    if not vehicle.is_active:
        return AvailabilityReason.INACTIVE

    buffer = buffer_delta()
    booking_conflict = db.scalar(
        select(Booking.id)
        .where(
            Booking.vehicle_id == vehicle.id,
            Booking.status.notin_(INACTIVE_BOOKING_STATUSES),
            Booking.start_datetime < end + buffer,
            Booking.end_datetime > start - buffer,
        )
        .limit(1)
    )
    if booking_conflict is not None:
        return AvailabilityReason.BOOKING_CONFLICT

    block_conflict = db.scalar(
        select(VehicleUnavailability.id)
        .where(
            VehicleUnavailability.vehicle_id == vehicle.id,
            VehicleUnavailability.start_datetime < end,
            VehicleUnavailability.end_datetime > start,
        )
        .limit(1)
    )
    if block_conflict is not None:
        return AvailabilityReason.UNAVAILABILITY
    return None


def employee_reason(
    db: Session, employee: Employee, start: datetime, end: datetime
) -> AvailabilityReason | None:
    if not employee.is_active:
        return AvailabilityReason.INACTIVE

    buffer = buffer_delta()
    assignment_conflict = db.scalar(
        select(BookingEmployee.id)
        .join(Booking, Booking.id == BookingEmployee.booking_id)
        .where(
            BookingEmployee.employee_id == employee.id,
            BookingEmployee.is_released.is_(False),
            Booking.status.notin_(INACTIVE_BOOKING_STATUSES),
            BookingEmployee.start_datetime < end + buffer,
            BookingEmployee.end_datetime > start - buffer,
        )
        .limit(1)
    )
    if assignment_conflict is not None:
        return AvailabilityReason.BOOKING_CONFLICT

    block_conflict = db.scalar(
        select(EmployeeUnavailability.id)
        .where(
            EmployeeUnavailability.employee_id == employee.id,
            EmployeeUnavailability.start_datetime < end,
            EmployeeUnavailability.end_datetime > start,
        )
        .limit(1)
    )
    if block_conflict is not None:
        return AvailabilityReason.UNAVAILABILITY
    return None


def _check_vehicle(
    db: Session, start: datetime, end: datetime, vehicle_id: UUID
) -> ResourceAvailabilityRead:
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise NotFoundError("Vehicle not found")

    reason = vehicle_reason(db, vehicle, start, end)
    return ResourceAvailabilityRead(
        id=vehicle.id,
        available=reason is None,
        reason=reason,
    )


def _check_employees(
    db: Session, start: datetime, end: datetime, employee_ids: list[UUID]
) -> list[ResourceAvailabilityRead]:
    if not employee_ids:
        return []

    employees = list(db.scalars(select(Employee).where(Employee.id.in_(employee_ids))))
    if len(employees) != len(employee_ids):
        raise NotFoundError("Employee not found")

    by_id = {employee.id: employee for employee in employees}
    results: list[ResourceAvailabilityRead] = []
    for employee_id in employee_ids:
        employee = by_id[employee_id]
        reason = employee_reason(db, employee, start, end)
        results.append(
            ResourceAvailabilityRead(
                id=employee.id,
                available=reason is None,
                reason=reason,
            )
        )
    return results
