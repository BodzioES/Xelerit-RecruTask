import secrets
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.encryption import decrypt_secret, encrypt_secret
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.db.enums import BookingStatus, ServiceType
from app.modules.bookings.models import Booking
from app.modules.handover.models import HandoverRecord
from app.modules.handover.schemas import HandoverRead, HandoverUpsert

TERMINAL_STATUSES = (BookingStatus.CANCELLED, BookingStatus.REJECTED)
# The customer may see the code only after the Provider has prepared the booking.
CUSTOMER_VISIBLE_STATUSES = (
    BookingStatus.READY_FOR_PICKUP,
    BookingStatus.IN_PROGRESS,
    BookingStatus.COMPLETED,
)


def upsert_handover(db: Session, booking: Booking, payload: HandoverUpsert) -> HandoverRead:
    _ensure_self_drive(booking)
    if booking.status in TERMINAL_STATUSES:
        raise ConflictError("Handover cannot be prepared for a closed booking")

    record = booking.handover
    if record is None:
        record = HandoverRecord(booking_id=booking.id)
        db.add(record)
        booking.handover = record

    if payload.generate_code:
        record.access_code_encrypted = encrypt_secret(_generate_code())
        record.code_generated_at = datetime.now(UTC)
    _apply_instructions(record, payload)

    db.commit()
    db.refresh(record)
    return _to_read(record)


def read_handover(db: Session, booking: Booking, *, as_provider: bool) -> HandoverRead:
    _ensure_self_drive(booking)
    record = booking.handover
    if record is None:
        raise NotFoundError("Handover details are not prepared yet")
    if not as_provider and booking.status not in CUSTOMER_VISIBLE_STATUSES:
        raise ForbiddenError("Handover details are not available yet")
    return _to_read(record)


def _ensure_self_drive(booking: Booking) -> None:
    if booking.service_type != ServiceType.SELF_DRIVE:
        raise ValidationError("Handover is only available for self-drive bookings")


def _generate_code() -> str:
    # A six-digit string, including leading zeros.
    return "".join(secrets.choice("0123456789") for _ in range(6))


def _apply_instructions(record: HandoverRecord, payload: HandoverUpsert) -> None:
    for field in ("pickup_instructions", "return_instructions"):
        if field not in payload.model_fields_set:
            continue
        value = getattr(payload, field)
        setattr(record, field, value or None)


def _to_read(record: HandoverRecord) -> HandoverRead:
    code = (
        decrypt_secret(record.access_code_encrypted)
        if record.access_code_encrypted is not None
        else None
    )
    return HandoverRead(
        booking_id=record.booking_id,
        access_code=code,
        pickup_instructions=record.pickup_instructions,
        return_instructions=record.return_instructions,
        code_generated_at=record.code_generated_at,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )
