"""availability engine

Revision ID: e4a1c7d2f9b3
Revises: 8b802b79d35f
Create Date: 2026-11-12 19:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e4a1c7d2f9b3"
down_revision: str | None = "8b802b79d35f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # btree_gist lets a GiST exclusion constraint mix an equality column (UUID)
    # with an overlapping range column (tstzrange).
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    _add_employee_assignment_windows()
    _add_booking_exclusion()
    _create_vehicle_unavailability()
    _create_employee_unavailability()


def downgrade() -> None:
    op.drop_table("employee_unavailability")
    op.drop_table("vehicle_unavailability")

    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ex_bookings_vehicle_period")

    op.execute(
        "ALTER TABLE booking_employees DROP CONSTRAINT IF EXISTS ex_booking_employees_period"
    )
    op.drop_index("ix_booking_employees_employee_window", table_name="booking_employees")
    op.drop_constraint(
        "ck_booking_employees_time_window_valid",
        "booking_employees",
        type_="check",
    )
    op.drop_column("booking_employees", "is_released")
    op.drop_column("booking_employees", "end_datetime")
    op.drop_column("booking_employees", "start_datetime")

    op.execute("DROP EXTENSION IF EXISTS btree_gist")


def _add_employee_assignment_windows() -> None:
    op.add_column(
        "booking_employees",
        sa.Column("start_datetime", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "booking_employees",
        sa.Column("end_datetime", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "booking_employees",
        sa.Column("is_released", sa.Boolean(), server_default="false", nullable=False),
    )

    # Existing assignments inherit the occupied window from their booking.
    op.execute(
        """
        UPDATE booking_employees AS assignment
        SET start_datetime = booking.start_datetime,
            end_datetime = booking.end_datetime
        FROM bookings AS booking
        WHERE booking.id = assignment.booking_id
        """
    )

    op.alter_column(
        "booking_employees",
        "start_datetime",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )
    op.alter_column(
        "booking_employees",
        "end_datetime",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )
    op.create_check_constraint(
        "ck_booking_employees_time_window_valid",
        "booking_employees",
        "end_datetime > start_datetime",
    )
    op.create_index(
        "ix_booking_employees_employee_window",
        "booking_employees",
        ["employee_id", "start_datetime", "end_datetime"],
        unique=False,
    )
    op.execute(
        """
        ALTER TABLE booking_employees
        ADD CONSTRAINT ex_booking_employees_period
        EXCLUDE USING gist (
            employee_id WITH =,
            tstzrange(start_datetime, end_datetime, '[)') WITH &&
        )
        WHERE (NOT is_released)
        """
    )


def _add_booking_exclusion() -> None:
    op.execute(
        """
        ALTER TABLE bookings
        ADD CONSTRAINT ex_bookings_vehicle_period
        EXCLUDE USING gist (
            vehicle_id WITH =,
            tstzrange(start_datetime, end_datetime, '[)') WITH &&
        )
        WHERE (vehicle_id IS NOT NULL AND status NOT IN ('cancelled', 'rejected'))
        """
    )


def _create_vehicle_unavailability() -> None:
    op.create_table(
        "vehicle_unavailability",
        sa.Column("vehicle_id", sa.Uuid(), nullable=False),
        sa.Column("start_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "end_datetime > start_datetime",
            name="ck_vehicle_unavailability_time_window_valid",
        ),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_vehicle_unavailability_vehicle_window",
        "vehicle_unavailability",
        ["vehicle_id", "start_datetime", "end_datetime"],
        unique=False,
    )
    op.execute(
        """
        ALTER TABLE vehicle_unavailability
        ADD CONSTRAINT ex_vehicle_unavailability_period
        EXCLUDE USING gist (
            vehicle_id WITH =,
            tstzrange(start_datetime, end_datetime, '[)') WITH &&
        )
        """
    )


def _create_employee_unavailability() -> None:
    op.create_table(
        "employee_unavailability",
        sa.Column("employee_id", sa.Uuid(), nullable=False),
        sa.Column("start_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "end_datetime > start_datetime",
            name="ck_employee_unavailability_time_window_valid",
        ),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_employee_unavailability_employee_window",
        "employee_unavailability",
        ["employee_id", "start_datetime", "end_datetime"],
        unique=False,
    )
    op.execute(
        """
        ALTER TABLE employee_unavailability
        ADD CONSTRAINT ex_employee_unavailability_period
        EXCLUDE USING gist (
            employee_id WITH =,
            tstzrange(start_datetime, end_datetime, '[)') WITH &&
        )
        """
    )
