from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.bookings.queries import vehicle_has_open_bookings
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
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("is_active") is False and vehicle.is_active:
        _ensure_no_open_bookings(db, vehicle)
    for field, value in changes.items():
        setattr(vehicle, field, value)
    _commit(db)
    db.refresh(vehicle)
    return vehicle


def deactivate_vehicle(db: Session, vehicle_id: UUID) -> None:
    vehicle = get_vehicle(db, vehicle_id)
    if vehicle.is_active:
        _ensure_no_open_bookings(db, vehicle)
        vehicle.is_active = False
        _commit(db)


def _ensure_no_open_bookings(db: Session, vehicle: Vehicle) -> None:
    # Deactivating would leave upcoming bookings pointing at a van we no longer offer.
    if vehicle_has_open_bookings(db, vehicle.id):
        raise ConflictError(
            "This vehicle has upcoming or active bookings. "
            "Move them to another vehicle or close them first."
        )


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("Vehicle data violates a database constraint") from exc
