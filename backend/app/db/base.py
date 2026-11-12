"""Import aggregator so Alembic can discover every model on Base.metadata."""

from app.db.session import Base
from app.modules.bookings.models import (
    Booking,
    BookingEmployee,
    BookingEvent,
    BookingItem,
    BookingLocation,
    BookingMovingDetails,
)
from app.modules.employees.models import Employee
from app.modules.handover.models import HandoverRecord
from app.modules.pricing.models import PricingRule
from app.modules.users.models import User
from app.modules.vehicles.models import Vehicle

__all__ = [
    "Base",
    "Booking",
    "BookingEmployee",
    "BookingEvent",
    "BookingItem",
    "BookingLocation",
    "BookingMovingDetails",
    "Employee",
    "HandoverRecord",
    "PricingRule",
    "User",
    "Vehicle",
]
