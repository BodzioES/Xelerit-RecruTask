"""booking helpers requested

Revision ID: 1f6c2d4e8a90
Revises: b7f3a9c1d2e4
Create Date: 2026-11-14 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "1f6c2d4e8a90"
down_revision: str | None = "b7f3a9c1d2e4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # The customer's declared crew size is preserved so a later reassignment
    # cannot reduce a Full Moving crew below what was ordered.
    op.add_column(
        "bookings",
        sa.Column("helpers_requested", sa.SmallInteger(), nullable=False, server_default="0"),
    )
    # Existing Full Moving bookings keep the crew that was already assigned.
    op.execute(
        """
        UPDATE bookings AS b
        SET helpers_requested = (
            SELECT COUNT(*)
            FROM booking_employees AS be
            JOIN employees AS e ON e.id = be.employee_id
            WHERE be.booking_id = b.id
              AND e.role = 'mover'
              AND be.is_released = false
        )
        WHERE b.service_type = 'full_moving'
        """
    )
    op.create_check_constraint(
        "ck_bookings_helpers_requested_non_negative",
        "bookings",
        "helpers_requested >= 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_bookings_helpers_requested_non_negative",
        "bookings",
        type_="check",
    )
    op.drop_column("bookings", "helpers_requested")
