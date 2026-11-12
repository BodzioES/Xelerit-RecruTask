from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.vehicles.models import Vehicle
from app.modules.vehicles.schemas import VehicleCreate, VehicleUpdate


def list_vehicles(db: Session, *, active_only: bool) -> list[Vehicle]:
    statement = select(Vehicle).order_by(Vehicle.brand, Vehicle.model, Vehicle.id)
    if active_only:
        statement = statement.where(Vehicle.is_active.is_(True))
    return list(db.scalars(statement))


def get_vehicle(db: Session, vehicle_id: UUID, *, active_only: bool = False) -> Vehicle:
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None or (active_only and not vehicle.is_active):
        raise NotFoundError("Vehicle not found")
    return vehicle


def create_vehicle(db: Session, payload: VehicleCreate) -> Vehicle:
    vehicle = Vehicle(**payload.model_dump())
    db.add(vehicle)
    _commit(db)
    db.refresh(vehicle)
    return vehicle


def update_vehicle(db: Session, vehicle_id: UUID, payload: VehicleUpdate) -> Vehicle:
    vehicle = get_vehicle(db, vehicle_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, value)
    _commit(db)
    db.refresh(vehicle)
    return vehicle


def deactivate_vehicle(db: Session, vehicle_id: UUID) -> None:
    vehicle = get_vehicle(db, vehicle_id)
    if vehicle.is_active:
        vehicle.is_active = False
        _commit(db)


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("Vehicle data violates a database constraint") from exc
