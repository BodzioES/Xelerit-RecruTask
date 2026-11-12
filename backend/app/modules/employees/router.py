from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_provider
from app.db.session import get_db
from app.modules.employees import service
from app.modules.employees.schemas import EmployeeCreate, EmployeeRead, EmployeeUpdate

provider_router = APIRouter(
    prefix="/provider/employees",
    tags=["provider: employees"],
    dependencies=[Depends(get_current_provider)],
)


@provider_router.get("", response_model=list[EmployeeRead])
def list_employees(
    include_inactive: bool = True,
    db: Session = Depends(get_db),
) -> list[EmployeeRead]:
    employees = service.list_employees(db, active_only=not include_inactive)
    return [EmployeeRead.model_validate(employee) for employee in employees]


@provider_router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db)) -> EmployeeRead:
    employee = service.create_employee(db, payload)
    return EmployeeRead.model_validate(employee)


@provider_router.patch("/{employee_id}", response_model=EmployeeRead)
def update_employee(
    employee_id: UUID,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
) -> EmployeeRead:
    employee = service.update_employee(db, employee_id, payload)
    return EmployeeRead.model_validate(employee)


@provider_router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_employee(employee_id: UUID, db: Session = Depends(get_db)) -> Response:
    service.deactivate_employee(db, employee_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
