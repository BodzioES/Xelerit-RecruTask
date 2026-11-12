from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.enums import EmployeeRole
from app.db.session import get_db
from app.modules.availability import service
from app.modules.availability.schemas import (
    AvailabilityCheckRequest,
    AvailabilityCheckResponse,
    AvailabilityWindow,
    AvailableEmployeeRead,
    AvailableVehicleRead,
)

router = APIRouter(prefix="/availability", tags=["availability"])


@router.get("/vehicles", response_model=list[AvailableVehicleRead])
def list_available_vehicles(
    window: Annotated[AvailabilityWindow, Query()],
    min_cargo_volume: Annotated[Decimal | None, Query(gt=0)] = None,
    min_payload: Annotated[int | None, Query(gt=0)] = None,
    min_seats: Annotated[int | None, Query(gt=0)] = None,
    db: Session = Depends(get_db),
) -> list[AvailableVehicleRead]:
    vehicles = service.list_available_vehicles(
        db,
        window.start_datetime,
        window.end_datetime,
        min_cargo_volume=min_cargo_volume,
        min_payload=min_payload,
        min_seats=min_seats,
    )
    return [AvailableVehicleRead.model_validate(vehicle) for vehicle in vehicles]


@router.get("/employees", response_model=list[AvailableEmployeeRead])
def list_available_employees(
    window: Annotated[AvailabilityWindow, Query()],
    role: Annotated[EmployeeRole | None, Query()] = None,
    db: Session = Depends(get_db),
) -> list[AvailableEmployeeRead]:
    employees = service.list_available_employees(
        db, window.start_datetime, window.end_datetime, role=role
    )
    return [AvailableEmployeeRead.model_validate(employee) for employee in employees]


@router.post("/check", response_model=AvailabilityCheckResponse)
def check_availability(
    payload: AvailabilityCheckRequest,
    db: Session = Depends(get_db),
) -> AvailabilityCheckResponse:
    result = service.check_availability(
        db,
        payload.start_datetime,
        payload.end_datetime,
        vehicle_id=payload.vehicle_id,
        employee_ids=payload.employee_ids,
    )
    return AvailabilityCheckResponse(
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        buffer_minutes=settings.resource_buffer_minutes,
        available=result.available,
        vehicle=result.vehicle,
        employees=result.employees,
    )
