from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_provider
from app.db.enums import EmployeeRole
from app.db.session import get_db
from app.modules.availability import blocks, service
from app.modules.availability.schemas import (
    AvailabilityWindow,
    AvailableEmployeeRead,
    EmployeeUnavailabilityRead,
    UnavailabilityCreate,
    VehicleUnavailabilityRead,
)

router = APIRouter(
    prefix="/provider",
    tags=["provider: availability"],
    dependencies=[Depends(get_current_provider)],
)


@router.get("/employees/availability", response_model=list[AvailableEmployeeRead])
def list_available_employees(
    window: Annotated[AvailabilityWindow, Query()],
    role: Annotated[EmployeeRole | None, Query()] = None,
    db: Session = Depends(get_db),
) -> list[AvailableEmployeeRead]:
    employees = service.list_available_employees(
        db, window.start_datetime, window.end_datetime, role=role
    )
    return [AvailableEmployeeRead.model_validate(employee) for employee in employees]


@router.get(
    "/vehicles/{vehicle_id}/unavailability",
    response_model=list[VehicleUnavailabilityRead],
)
def list_vehicle_unavailability(
    vehicle_id: UUID, db: Session = Depends(get_db)
) -> list[VehicleUnavailabilityRead]:
    return [
        VehicleUnavailabilityRead.model_validate(block)
        for block in blocks.list_vehicle_blocks(db, vehicle_id)
    ]


@router.post(
    "/vehicles/{vehicle_id}/unavailability",
    response_model=VehicleUnavailabilityRead,
    status_code=status.HTTP_201_CREATED,
)
def create_vehicle_unavailability(
    vehicle_id: UUID,
    payload: UnavailabilityCreate,
    db: Session = Depends(get_db),
) -> VehicleUnavailabilityRead:
    block = blocks.create_vehicle_block(db, vehicle_id, payload)
    return VehicleUnavailabilityRead.model_validate(block)


@router.delete(
    "/vehicles/{vehicle_id}/unavailability/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_vehicle_unavailability(
    vehicle_id: UUID, block_id: UUID, db: Session = Depends(get_db)
) -> Response:
    blocks.delete_vehicle_block(db, vehicle_id, block_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/employees/{employee_id}/unavailability",
    response_model=list[EmployeeUnavailabilityRead],
)
def list_employee_unavailability(
    employee_id: UUID, db: Session = Depends(get_db)
) -> list[EmployeeUnavailabilityRead]:
    return [
        EmployeeUnavailabilityRead.model_validate(block)
        for block in blocks.list_employee_blocks(db, employee_id)
    ]


@router.post(
    "/employees/{employee_id}/unavailability",
    response_model=EmployeeUnavailabilityRead,
    status_code=status.HTTP_201_CREATED,
)
def create_employee_unavailability(
    employee_id: UUID,
    payload: UnavailabilityCreate,
    db: Session = Depends(get_db),
) -> EmployeeUnavailabilityRead:
    block = blocks.create_employee_block(db, employee_id, payload)
    return EmployeeUnavailabilityRead.model_validate(block)


@router.delete(
    "/employees/{employee_id}/unavailability/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_employee_unavailability(
    employee_id: UUID, block_id: UUID, db: Session = Depends(get_db)
) -> Response:
    blocks.delete_employee_block(db, employee_id, block_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
