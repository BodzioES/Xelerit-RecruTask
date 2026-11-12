from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
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
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(employee, field, value)
    _commit(db)
    db.refresh(employee)
    return employee


def deactivate_employee(db: Session, employee_id: UUID) -> None:
    employee = get_employee(db, employee_id)
    if employee.is_active:
        employee.is_active = False
        _commit(db)


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("Employee data violates a database constraint") from exc
