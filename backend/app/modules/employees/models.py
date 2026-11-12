from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.enums import EmployeeRole
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.session import Base
from app.db.types import enum_type

if TYPE_CHECKING:
    from app.modules.availability.models import EmployeeUnavailability
    from app.modules.bookings.models import BookingEmployee


class Employee(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "employees"

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[EmployeeRole] = mapped_column(
        enum_type(EmployeeRole, "employee_role"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    assignments: Mapped[list[BookingEmployee]] = relationship(back_populates="employee")
    unavailability: Mapped[list[EmployeeUnavailability]] = relationship(
        back_populates="employee", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"Employee(id={self.id!r}, name={self.first_name!r} {self.last_name!r}, "
            f"role={self.role!r})"
        )
