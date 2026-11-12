from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    Sequence,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.enums import (
    BookingActor,
    BookingStatus,
    LocationType,
    PropertyType,
    ServiceType,
)
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.session import Base
from app.db.types import enum_type

if TYPE_CHECKING:
    from app.modules.employees.models import Employee
    from app.modules.handover.models import HandoverRecord
    from app.modules.users.models import User
    from app.modules.vehicles.models import Vehicle

# Human-readable booking numbers are generated in the service layer as
# MV-<year>-<sequence value>.
booking_number_seq = Sequence("booking_number_seq", start=1)


class Booking(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint("end_datetime > start_datetime", name="ck_bookings_time_window_valid"),
        CheckConstraint("base_price >= 0", name="ck_bookings_base_price_non_negative"),
        CheckConstraint("extras_price >= 0", name="ck_bookings_extras_price_non_negative"),
        CheckConstraint("total_price >= 0", name="ck_bookings_total_price_non_negative"),
        CheckConstraint(
            "distance_km IS NULL OR distance_km >= 0",
            name="ck_bookings_distance_non_negative",
        ),
        CheckConstraint("duration_minutes > 0", name="ck_bookings_duration_positive"),
        Index("ix_bookings_vehicle_window", "vehicle_id", "start_datetime", "end_datetime"),
        Index("ix_bookings_status", "status"),
        Index("ix_bookings_customer_email", "customer_email"),
        Index("ix_bookings_start_datetime", "start_datetime"),
    )

    booking_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)

    customer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    customer_first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(320), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(40), nullable=False)

    vehicle_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )

    service_type: Mapped[ServiceType] = mapped_column(
        enum_type(ServiceType, "service_type"), nullable=False
    )
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(
        enum_type(BookingStatus, "booking_status"),
        nullable=False,
        default=BookingStatus.PENDING,
        server_default=BookingStatus.PENDING.value,
    )

    base_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"), server_default="0"
    )
    extras_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"), server_default="0"
    )
    total_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"), server_default="0"
    )
    distance_km: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    customer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    access_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    customer: Mapped[User | None] = relationship(back_populates="bookings")
    vehicle: Mapped[Vehicle | None] = relationship(back_populates="bookings")
    locations: Mapped[list[BookingLocation]] = relationship(
        back_populates="booking", cascade="all, delete-orphan"
    )
    assignments: Mapped[list[BookingEmployee]] = relationship(
        back_populates="booking", cascade="all, delete-orphan"
    )
    items: Mapped[list[BookingItem]] = relationship(
        back_populates="booking", cascade="all, delete-orphan"
    )
    moving_details: Mapped[BookingMovingDetails | None] = relationship(
        back_populates="booking", cascade="all, delete-orphan", uselist=False
    )
    handover: Mapped[HandoverRecord | None] = relationship(
        back_populates="booking", cascade="all, delete-orphan", uselist=False
    )
    events: Mapped[list[BookingEvent]] = relationship(
        back_populates="booking", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"Booking(id={self.id!r}, number={self.booking_number!r}, status={self.status!r})"


class BookingLocation(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "booking_locations"
    __table_args__ = (
        UniqueConstraint("booking_id", "location_type", name="uq_booking_locations_type"),
        CheckConstraint("latitude BETWEEN -90 AND 90", name="ck_booking_locations_latitude"),
        CheckConstraint("longitude BETWEEN -180 AND 180", name="ck_booking_locations_longitude"),
    )

    booking_id: Mapped[UUID] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    location_type: Mapped[LocationType] = mapped_column(
        enum_type(LocationType, "location_type"), nullable=False
    )
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    place_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)

    booking: Mapped[Booking] = relationship(back_populates="locations")


class BookingEmployee(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "booking_employees"
    __table_args__ = (
        UniqueConstraint("booking_id", "employee_id", name="uq_booking_employees_pair"),
    )

    booking_id: Mapped[UUID] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    employee_id: Mapped[UUID] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    booking: Mapped[Booking] = relationship(back_populates="assignments")
    employee: Mapped[Employee] = relationship(back_populates="assignments")


class BookingItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "booking_items"
    __table_args__ = (CheckConstraint("quantity > 0", name="ck_booking_items_quantity_positive"),)

    booking_id: Mapped[UUID] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    booking: Mapped[Booking] = relationship(back_populates="items")


class BookingMovingDetails(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "booking_moving_details"
    __table_args__ = (
        CheckConstraint(
            "floor IS NULL OR floor >= 0", name="ck_booking_moving_details_floor_non_negative"
        ),
        CheckConstraint(
            "boxes_count IS NULL OR boxes_count >= 0",
            name="ck_booking_moving_details_boxes_non_negative",
        ),
    )

    booking_id: Mapped[UUID] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    property_type: Mapped[PropertyType] = mapped_column(
        enum_type(PropertyType, "property_type"), nullable=False
    )
    floor: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    has_elevator: Mapped[bool | None] = mapped_column(nullable=True)
    needs_carry_in: Mapped[bool] = mapped_column(
        nullable=False, default=False, server_default="false"
    )
    needs_carry_out: Mapped[bool] = mapped_column(
        nullable=False, default=False, server_default="false"
    )
    boxes_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    items_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    booking: Mapped[Booking] = relationship(back_populates="moving_details")


class BookingEvent(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "booking_events"
    __table_args__ = (Index("ix_booking_events_booking_created", "booking_id", "created_at"),)

    booking_id: Mapped[UUID] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    previous_status: Mapped[BookingStatus | None] = mapped_column(
        enum_type(BookingStatus, "booking_status"), nullable=True
    )
    new_status: Mapped[BookingStatus] = mapped_column(
        enum_type(BookingStatus, "booking_status"), nullable=False
    )
    changed_by: Mapped[BookingActor] = mapped_column(
        enum_type(BookingActor, "booking_actor"), nullable=False
    )
    changed_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    booking: Mapped[Booking] = relationship(back_populates="events")
