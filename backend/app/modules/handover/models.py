from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.session import Base
from app.modules.bookings.models import Booking


class HandoverRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "handover_records"

    booking_id: Mapped[UUID] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    access_code_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pickup_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    return_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    code_generated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    booking: Mapped[Booking] = relationship(back_populates="handover")

    def __repr__(self) -> str:
        return f"HandoverRecord(id={self.id!r}, booking_id={self.booking_id!r})"
