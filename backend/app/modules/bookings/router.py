from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_booking_token, get_optional_provider
from app.db.session import get_db
from app.modules.bookings import access, service
from app.modules.bookings.schemas import (
    BookingCancelRequest,
    BookingCreate,
    BookingCreatedRead,
    BookingRead,
)
from app.modules.users.models import User

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingCreatedRead, status_code=status.HTTP_201_CREATED)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)) -> BookingCreatedRead:
    booking, token = service.create_booking(db, payload)
    return BookingCreatedRead(
        **BookingRead.model_validate(booking).model_dump(),
        access_token=token,
    )


@router.get("/{booking_id}", response_model=BookingRead)
def read_booking(
    booking_id: UUID,
    provider: Annotated[User | None, Depends(get_optional_provider)],
    token: Annotated[str | None, Depends(get_booking_token)],
    db: Session = Depends(get_db),
) -> BookingRead:
    booking = access.get_booking_for_access(
        db,
        booking_id,
        provider=provider,
        token=token,
    )
    return BookingRead.model_validate(booking)


@router.patch("/{booking_id}/cancel", response_model=BookingRead)
def cancel_booking(
    booking_id: UUID,
    token: Annotated[str | None, Depends(get_booking_token)],
    payload: Annotated[BookingCancelRequest | None, Body()] = None,
    db: Session = Depends(get_db),
) -> BookingRead:
    booking = access.get_booking_for_guest(db, booking_id, token)
    reason = payload.reason if payload is not None else None
    booking = service.cancel_booking(db, booking, reason)
    return BookingRead.model_validate(booking)
