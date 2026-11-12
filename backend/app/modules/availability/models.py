from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.session import Base

if TYPE_CHECKING:
    from app.modules.employees.models import Employee
    from app.modules.vehicles.models import Vehicle


class VehicleUnavailability(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A period when a vehicle must not be booked (service, repair, private use)."""

    __tablename__ = "vehicle_unavailability"
    __table_args__ = (
        CheckConstraint(
            "end_datetime > start_datetime",
            name="ck_vehicle_unavailability_time_window_valid",
        ),
        Index(
            "ix_vehicle_unavailability_vehicle_window",
            "vehicle_id",
            "start_datetime",
            "end_datetime",
        ),
        ExcludeConstraint(
            ("vehicle_id", "="),
            (text("tstzrange(start_datetime, end_datetime, '[)')"), "&&"),
            using="gist",
            name="ex_vehicle_unavailability_period",
        ),
    )

    vehicle_id: Mapped[UUID] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    vehicle: Mapped[Vehicle] = relationship(back_populates="unavailability")

    def __repr__(self) -> str:
        return (
            f"VehicleUnavailability(id={self.id!r}, vehicle_id={self.vehicle_id!r}, "
            f"start={self.start_datetime!r}, end={self.end_datetime!r})"
        )


class EmployeeUnavailability(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A period when an employee cannot be assigned to any booking."""

    __tablename__ = "employee_unavailability"
    __table_args__ = (
        CheckConstraint(
            "end_datetime > start_datetime",
            name="ck_employee_unavailability_time_window_valid",
        ),
        Index(
            "ix_employee_unavailability_employee_window",
            "employee_id",
            "start_datetime",
            "end_datetime",
        ),
        ExcludeConstraint(
            ("employee_id", "="),
            (text("tstzrange(start_datetime, end_datetime, '[)')"), "&&"),
            using="gist",
            name="ex_employee_unavailability_period",
        ),
    )

    employee_id: Mapped[UUID] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    employee: Mapped[Employee] = relationship(back_populates="unavailability")

    def __repr__(self) -> str:
        return (
            f"EmployeeUnavailability(id={self.id!r}, employee_id={self.employee_id!r}, "
            f"start={self.start_datetime!r}, end={self.end_datetime!r})"
        )
