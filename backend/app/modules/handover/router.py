from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_booking_token,
    get_current_provider,
    get_optional_provider,
)
from app.db.session import get_db
from app.modules.bookings import access
from app.modules.bookings.queries import get_booking
from app.modules.handover import service
from app.modules.handover.schemas import HandoverRead, HandoverUpsert
from app.modules.users.models import User

router = APIRouter(prefix="/bookings", tags=["handover"])


@router.post(
    "/{booking_id}/handover",
    response_model=HandoverRead,
    dependencies=[Depends(get_current_provider)],
)
def upsert_handover(
    booking_id: UUID,
    payload: HandoverUpsert,
    db: Session = Depends(get_db),
) -> HandoverRead:
    booking = get_booking(db, booking_id)
    return service.upsert_handover(db, booking, payload)


@router.get("/{booking_id}/handover", response_model=HandoverRead)
def read_handover(
    booking_id: UUID,
    provider: Annotated[User | None, Depends(get_optional_provider)],
    token: Annotated[str | None, Depends(get_booking_token)],
    db: Session = Depends(get_db),
) -> HandoverRead:
    booking = access.get_booking_for_access(
        db,
        booking_id,
        provider=provider,
        token=token,
    )
    return service.read_handover(db, booking, as_provider=provider is not None)
