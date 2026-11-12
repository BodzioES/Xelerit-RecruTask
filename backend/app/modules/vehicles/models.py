from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, Integer, Numeric, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.session import Base

if TYPE_CHECKING:
    from app.modules.bookings.models import Booking


class Vehicle(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "vehicles"
    __table_args__ = (
        CheckConstraint("cargo_volume > 0", name="ck_vehicles_cargo_volume_positive"),
        CheckConstraint("payload > 0", name="ck_vehicles_payload_positive"),
        CheckConstraint("seats > 0", name="ck_vehicles_seats_positive"),
        CheckConstraint("hourly_price >= 0", name="ck_vehicles_hourly_price_non_negative"),
        CheckConstraint("daily_price >= 0", name="ck_vehicles_daily_price_non_negative"),
        CheckConstraint("year BETWEEN 1990 AND 2100", name="ck_vehicles_year_range"),
    )

    brand: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    cargo_volume: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    payload: Mapped[int] = mapped_column(Integer, nullable=False)
    seats: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    hourly_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    daily_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    bookings: Mapped[list[Booking]] = relationship(back_populates="vehicle")

    def __repr__(self) -> str:
        return f"Vehicle(id={self.id!r}, brand={self.brand!r}, model={self.model!r})"
