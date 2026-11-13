from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_provider
from app.db.enums import BookingStatus, ServiceType
from app.db.session import get_db
from app.modules.bookings import assignment, service
from app.modules.bookings.queries import get_booking
from app.modules.bookings.schemas import (
    AssignResourcesRequest,
    BookingRead,
    BookingStatusUpdate,
    DashboardRead,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/provider",
    tags=["provider: bookings"],
    dependencies=[Depends(get_current_provider)],
)


@router.get("/dashboard", response_model=DashboardRead)
def read_dashboard(db: Session = Depends(get_db)) -> DashboardRead:
    return service.dashboard(db)


@router.get("/bookings", response_model=list[BookingRead])
def list_bookings(
    booking_status: BookingStatus | None = Query(default=None, alias="status"),
    service_type: ServiceType | None = Query(default=None),
    employee_id: UUID | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[BookingRead]:
    bookings = service.list_bookings(
        db,
        booking_status=booking_status,
        service_type=service_type,
        employee_id=employee_id,
        limit=limit,
        offset=offset,
    )
    return [BookingRead.model_validate(booking) for booking in bookings]


@router.patch("/bookings/{booking_id}/status", response_model=BookingRead)
def update_booking_status(
    booking_id: UUID,
    payload: BookingStatusUpdate,
    user: User = Depends(get_current_provider),
    db: Session = Depends(get_db),
) -> BookingRead:
    booking = get_booking(db, booking_id)
    booking = service.update_status(
        db,
        booking,
        payload.status,
        provider_id=user.id,
        note=payload.note,
    )
    return BookingRead.model_validate(booking)


@router.post("/bookings/{booking_id}/assign-resources", response_model=BookingRead)
def assign_resources(
    booking_id: UUID,
    payload: AssignResourcesRequest,
    db: Session = Depends(get_db),
) -> BookingRead:
    booking = get_booking(db, booking_id)
    booking = assignment.update_resources(db, booking, payload)
    return BookingRead.model_validate(booking)
