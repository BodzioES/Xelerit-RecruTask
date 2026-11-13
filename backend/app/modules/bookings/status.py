from app.core.exceptions import ConflictError, ValidationError
from app.db.enums import BookingStatus, ServiceType
from app.modules.bookings.models import Booking

# Cancelled, rejected and completed bookings are terminal. Changes are rejected
# instead of silently ignored so the Provider sees a clear conflict.
TRANSITIONS: dict[BookingStatus, frozenset[BookingStatus]] = {
    BookingStatus.PENDING: frozenset(
        {BookingStatus.CONFIRMED, BookingStatus.REJECTED, BookingStatus.CANCELLED}
    ),
    BookingStatus.CONFIRMED: frozenset(
        {
            BookingStatus.READY_FOR_PICKUP,
            BookingStatus.IN_PROGRESS,
            BookingStatus.CANCELLED,
        }
    ),
    BookingStatus.READY_FOR_PICKUP: frozenset({BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED}),
    BookingStatus.IN_PROGRESS: frozenset({BookingStatus.COMPLETED, BookingStatus.CANCELLED}),
    BookingStatus.COMPLETED: frozenset(),
    BookingStatus.REJECTED: frozenset(),
    BookingStatus.CANCELLED: frozenset(),
}

# A guest may withdraw a booking until the service starts.
GUEST_CANCELLABLE = frozenset(
    {BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.READY_FOR_PICKUP}
)
TERMINAL = frozenset({BookingStatus.COMPLETED, BookingStatus.REJECTED, BookingStatus.CANCELLED})


def ensure_transition(booking: Booking, new_status: BookingStatus) -> None:
    allowed = TRANSITIONS[booking.status]
    if new_status not in allowed:
        raise ConflictError(
            f"Cannot change status from {booking.status.value} to {new_status.value}"
        )

    if new_status == BookingStatus.READY_FOR_PICKUP and booking.service_type != (
        ServiceType.SELF_DRIVE
    ):
        raise ValidationError("Only self-drive bookings can be ready for pickup")

    if (
        booking.service_type == ServiceType.SELF_DRIVE
        and booking.status == BookingStatus.CONFIRMED
        and new_status == BookingStatus.IN_PROGRESS
    ):
        raise ConflictError("Self-drive bookings must be ready for pickup before they start")


def ensure_guest_cancel(booking: Booking) -> None:
    if booking.status not in GUEST_CANCELLABLE:
        raise ConflictError(f"Booking cannot be cancelled in status {booking.status.value}")


def release_assignments(booking: Booking) -> None:
    """Release employee windows without deleting the assignment history."""
    for assignment in booking.assignments:
        assignment.is_released = True
