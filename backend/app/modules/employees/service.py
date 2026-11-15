from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.bookings.queries import employee_has_open_bookings
from app.modules.employees.models import Employee
from app.modules.employees.schemas import EmployeeCreate, EmployeeUpdate


def list_employees(db: Session, *, active_only: bool) -> list[Employee]:
    statement = select(Employee).order_by(Employee.last_name, Employee.first_name, Employee.id)
    if active_only:
        statement = statement.where(Employee.is_active.is_(True))
    return list(db.scalars(statement))


def get_employee(db: Session, employee_id: UUID) -> Employee:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise NotFoundError("Employee not found")
    return employee


def create_employee(db: Session, payload: EmployeeCreate) -> Employee:
    employee = Employee(**payload.model_dump())
    db.add(employee)
    _commit(db)
    db.refresh(employee)
    return employee


def update_employee(db: Session, employee_id: UUID, payload: EmployeeUpdate) -> Employee:
    employee = get_employee(db, employee_id)
    changes = payload.model_dump(exclude_unset=True)
    deactivating = changes.get("is_active") is False and employee.is_active
    # A new role would break the driver/mover count of bookings already assigned.
    changing_role = "role" in changes and changes["role"] != employee.role
    if deactivating or changing_role:
        _ensure_no_open_bookings(db, employee)
    for field, value in changes.items():
        setattr(employee, field, value)
    _commit(db)
    db.refresh(employee)
    return employee


def deactivate_employee(db: Session, employee_id: UUID) -> None:
    employee = get_employee(db, employee_id)
    if employee.is_active:
        _ensure_no_open_bookings(db, employee)
        employee.is_active = False
        _commit(db)


def _ensure_no_open_bookings(db: Session, employee: Employee) -> None:
    if employee_has_open_bookings(db, employee.id):
        raise ConflictError(
            "This employee is assigned to upcoming or active bookings. "
            "Reassign those bookings first."
        )


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("Employee data violates a database constraint") from exc
