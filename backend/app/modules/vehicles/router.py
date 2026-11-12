from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_provider
from app.db.session import get_db
from app.modules.vehicles import service
from app.modules.vehicles.schemas import VehicleCreate, VehicleRead, VehicleUpdate

public_router = APIRouter(prefix="/vehicles", tags=["vehicles"])
provider_router = APIRouter(
    prefix="/provider/vehicles",
    tags=["provider: vehicles"],
    dependencies=[Depends(get_current_provider)],
)


@public_router.get("", response_model=list[VehicleRead])
def list_available_vehicles(db: Session = Depends(get_db)) -> list[VehicleRead]:
    vehicles = service.list_vehicles(db, active_only=True)
    return [VehicleRead.model_validate(vehicle) for vehicle in vehicles]


@public_router.get("/{vehicle_id}", response_model=VehicleRead)
def read_available_vehicle(vehicle_id: UUID, db: Session = Depends(get_db)) -> VehicleRead:
    vehicle = service.get_vehicle(db, vehicle_id, active_only=True)
    return VehicleRead.model_validate(vehicle)


@provider_router.get("", response_model=list[VehicleRead])
def list_all_vehicles(
    include_inactive: bool = True,
    db: Session = Depends(get_db),
) -> list[VehicleRead]:
    vehicles = service.list_vehicles(db, active_only=not include_inactive)
    return [VehicleRead.model_validate(vehicle) for vehicle in vehicles]


@provider_router.post("", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: VehicleCreate, db: Session = Depends(get_db)) -> VehicleRead:
    vehicle = service.create_vehicle(db, payload)
    return VehicleRead.model_validate(vehicle)


@provider_router.patch("/{vehicle_id}", response_model=VehicleRead)
def update_vehicle(
    vehicle_id: UUID,
    payload: VehicleUpdate,
    db: Session = Depends(get_db),
) -> VehicleRead:
    vehicle = service.update_vehicle(db, vehicle_id, payload)
    return VehicleRead.model_validate(vehicle)


@provider_router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_vehicle(vehicle_id: UUID, db: Session = Depends(get_db)) -> Response:
    service.deactivate_vehicle(db, vehicle_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
