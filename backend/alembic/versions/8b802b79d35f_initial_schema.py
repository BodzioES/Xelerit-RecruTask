"""initial schema

Revision ID: 8b802b79d35f
Revises:
Create Date: 2026-11-12 18:52:03.077959

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "8b802b79d35f"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

user_role = postgresql.ENUM("customer", "provider", name="user_role", create_type=False)
employee_role = postgresql.ENUM("driver", "mover", name="employee_role", create_type=False)
service_type = postgresql.ENUM(
    "self_drive", "van_driver", "full_moving", name="service_type", create_type=False
)
booking_status = postgresql.ENUM(
    "pending",
    "confirmed",
    "ready_for_pickup",
    "in_progress",
    "completed",
    "rejected",
    "cancelled",
    name="booking_status",
    create_type=False,
)
location_type = postgresql.ENUM(
    "pickup", "return", "loading", "unloading", name="location_type", create_type=False
)
property_type = postgresql.ENUM(
    "apartment",
    "house",
    "office",
    "warehouse",
    "hall",
    "retail",
    "other",
    name="property_type",
    create_type=False,
)
booking_actor = postgresql.ENUM(
    "provider", "customer", "system", name="booking_actor", create_type=False
)

ALL_ENUMS = (
    user_role,
    employee_role,
    service_type,
    booking_status,
    location_type,
    property_type,
    booking_actor,
)


def upgrade() -> None:
    bind = op.get_bind()
    for enum in ALL_ENUMS:
        enum.create(bind, checkfirst=True)

    op.execute(sa.schema.CreateSequence(sa.Sequence("booking_number_seq", start=1)))

    op.create_table(
        "employees",
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("role", employee_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "pricing_rules",
        sa.Column("service_type", service_type, nullable=False),
        sa.Column(
            "base_price", sa.Numeric(precision=10, scale=2), server_default="0", nullable=False
        ),
        sa.Column(
            "hourly_rate", sa.Numeric(precision=10, scale=2), server_default="0", nullable=False
        ),
        sa.Column(
            "daily_rate", sa.Numeric(precision=10, scale=2), server_default="0", nullable=False
        ),
        sa.Column(
            "price_per_km", sa.Numeric(precision=10, scale=2), server_default="0", nullable=False
        ),
        sa.Column(
            "helper_rate", sa.Numeric(precision=10, scale=2), server_default="0", nullable=False
        ),
        sa.Column(
            "floor_surcharge",
            sa.Numeric(precision=10, scale=2),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "no_elevator_surcharge",
            sa.Numeric(precision=10, scale=2),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "additional_service_price",
            sa.Numeric(precision=10, scale=2),
            server_default="0",
            nullable=False,
        ),
        sa.Column("min_duration_hours", sa.Integer(), server_default="4", nullable=False),
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
            "additional_service_price >= 0",
            name="ck_pricing_rules_additional_service_price_non_negative",
        ),
        sa.CheckConstraint("base_price >= 0", name="ck_pricing_rules_base_price_non_negative"),
        sa.CheckConstraint("daily_rate >= 0", name="ck_pricing_rules_daily_rate_non_negative"),
        sa.CheckConstraint(
            "floor_surcharge >= 0", name="ck_pricing_rules_floor_surcharge_non_negative"
        ),
        sa.CheckConstraint("helper_rate >= 0", name="ck_pricing_rules_helper_rate_non_negative"),
        sa.CheckConstraint("hourly_rate >= 0", name="ck_pricing_rules_hourly_rate_non_negative"),
        sa.CheckConstraint("min_duration_hours > 0", name="ck_pricing_rules_min_duration_positive"),
        sa.CheckConstraint(
            "no_elevator_surcharge >= 0",
            name="ck_pricing_rules_no_elevator_surcharge_non_negative",
        ),
        sa.CheckConstraint("price_per_km >= 0", name="ck_pricing_rules_price_per_km_non_negative"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("service_type"),
    )

    op.create_table(
        "users",
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("role", user_role, server_default="customer", nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "vehicles",
        sa.Column("brand", sa.String(length=80), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=False),
        sa.Column("year", sa.SmallInteger(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("cargo_volume", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("payload", sa.Integer(), nullable=False),
        sa.Column("seats", sa.SmallInteger(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("hourly_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("daily_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
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
        sa.CheckConstraint("cargo_volume > 0", name="ck_vehicles_cargo_volume_positive"),
        sa.CheckConstraint("daily_price >= 0", name="ck_vehicles_daily_price_non_negative"),
        sa.CheckConstraint("hourly_price >= 0", name="ck_vehicles_hourly_price_non_negative"),
        sa.CheckConstraint("payload > 0", name="ck_vehicles_payload_positive"),
        sa.CheckConstraint("seats > 0", name="ck_vehicles_seats_positive"),
        sa.CheckConstraint("year BETWEEN 1990 AND 2100", name="ck_vehicles_year_range"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "bookings",
        sa.Column("booking_number", sa.String(length=20), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=True),
        sa.Column("customer_first_name", sa.String(length=100), nullable=False),
        sa.Column("customer_last_name", sa.String(length=100), nullable=False),
        sa.Column("customer_email", sa.String(length=320), nullable=False),
        sa.Column("customer_phone", sa.String(length=40), nullable=False),
        sa.Column("vehicle_id", sa.Uuid(), nullable=True),
        sa.Column("service_type", service_type, nullable=False),
        sa.Column("start_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", booking_status, server_default="pending", nullable=False),
        sa.Column(
            "base_price", sa.Numeric(precision=10, scale=2), server_default="0", nullable=False
        ),
        sa.Column(
            "extras_price", sa.Numeric(precision=10, scale=2), server_default="0", nullable=False
        ),
        sa.Column(
            "total_price", sa.Numeric(precision=10, scale=2), server_default="0", nullable=False
        ),
        sa.Column("distance_km", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("customer_notes", sa.Text(), nullable=True),
        sa.Column("access_token_hash", sa.String(length=64), nullable=True),
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
        sa.CheckConstraint("base_price >= 0", name="ck_bookings_base_price_non_negative"),
        sa.CheckConstraint(
            "distance_km IS NULL OR distance_km >= 0", name="ck_bookings_distance_non_negative"
        ),
        sa.CheckConstraint("duration_minutes > 0", name="ck_bookings_duration_positive"),
        sa.CheckConstraint("end_datetime > start_datetime", name="ck_bookings_time_window_valid"),
        sa.CheckConstraint("extras_price >= 0", name="ck_bookings_extras_price_non_negative"),
        sa.CheckConstraint("total_price >= 0", name="ck_bookings_total_price_non_negative"),
        sa.ForeignKeyConstraint(["customer_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("booking_number"),
    )
    op.create_index("ix_bookings_customer_email", "bookings", ["customer_email"], unique=False)
    op.create_index("ix_bookings_start_datetime", "bookings", ["start_datetime"], unique=False)
    op.create_index("ix_bookings_status", "bookings", ["status"], unique=False)
    op.create_index(
        "ix_bookings_vehicle_window",
        "bookings",
        ["vehicle_id", "start_datetime", "end_datetime"],
        unique=False,
    )

    op.create_table(
        "booking_employees",
        sa.Column("booking_id", sa.Uuid(), nullable=False),
        sa.Column("employee_id", sa.Uuid(), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("booking_id", "employee_id", name="uq_booking_employees_pair"),
    )
    op.create_index(
        op.f("ix_booking_employees_booking_id"),
        "booking_employees",
        ["booking_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_booking_employees_employee_id"),
        "booking_employees",
        ["employee_id"],
        unique=False,
    )

    op.create_table(
        "booking_events",
        sa.Column("booking_id", sa.Uuid(), nullable=False),
        sa.Column("previous_status", booking_status, nullable=True),
        sa.Column("new_status", booking_status, nullable=False),
        sa.Column("changed_by", booking_actor, nullable=False),
        sa.Column("changed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["changed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_booking_events_booking_created",
        "booking_events",
        ["booking_id", "created_at"],
        unique=False,
    )

    op.create_table(
        "booking_items",
        sa.Column("booking_id", sa.Uuid(), nullable=False),
        sa.Column("item_name", sa.String(length=200), nullable=False),
        sa.Column("quantity", sa.Integer(), server_default="1", nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_booking_items_quantity_positive"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_booking_items_booking_id"), "booking_items", ["booking_id"], unique=False
    )

    op.create_table(
        "booking_locations",
        sa.Column("booking_id", sa.Uuid(), nullable=False),
        sa.Column("location_type", location_type, nullable=False),
        sa.Column("address", sa.String(length=500), nullable=False),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column("place_id", sa.String(length=255), nullable=True),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.CheckConstraint("latitude BETWEEN -90 AND 90", name="ck_booking_locations_latitude"),
        sa.CheckConstraint("longitude BETWEEN -180 AND 180", name="ck_booking_locations_longitude"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("booking_id", "location_type", name="uq_booking_locations_type"),
    )
    op.create_index(
        op.f("ix_booking_locations_booking_id"),
        "booking_locations",
        ["booking_id"],
        unique=False,
    )

    op.create_table(
        "booking_moving_details",
        sa.Column("booking_id", sa.Uuid(), nullable=False),
        sa.Column("property_type", property_type, nullable=False),
        sa.Column("floor", sa.SmallInteger(), nullable=True),
        sa.Column("has_elevator", sa.Boolean(), nullable=True),
        sa.Column("needs_carry_in", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("needs_carry_out", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("boxes_count", sa.Integer(), nullable=True),
        sa.Column("items_description", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.CheckConstraint(
            "boxes_count IS NULL OR boxes_count >= 0",
            name="ck_booking_moving_details_boxes_non_negative",
        ),
        sa.CheckConstraint(
            "floor IS NULL OR floor >= 0",
            name="ck_booking_moving_details_floor_non_negative",
        ),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("booking_id"),
    )

    op.create_table(
        "handover_records",
        sa.Column("booking_id", sa.Uuid(), nullable=False),
        sa.Column("access_code_hash", sa.String(length=255), nullable=True),
        sa.Column("pickup_instructions", sa.Text(), nullable=True),
        sa.Column("return_instructions", sa.Text(), nullable=True),
        sa.Column("code_generated_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("booking_id"),
    )


def downgrade() -> None:
    op.drop_table("handover_records")
    op.drop_table("booking_moving_details")
    op.drop_index(op.f("ix_booking_locations_booking_id"), table_name="booking_locations")
    op.drop_table("booking_locations")
    op.drop_index(op.f("ix_booking_items_booking_id"), table_name="booking_items")
    op.drop_table("booking_items")
    op.drop_index("ix_booking_events_booking_created", table_name="booking_events")
    op.drop_table("booking_events")
    op.drop_index(op.f("ix_booking_employees_employee_id"), table_name="booking_employees")
    op.drop_index(op.f("ix_booking_employees_booking_id"), table_name="booking_employees")
    op.drop_table("booking_employees")
    op.drop_index("ix_bookings_vehicle_window", table_name="bookings")
    op.drop_index("ix_bookings_status", table_name="bookings")
    op.drop_index("ix_bookings_start_datetime", table_name="bookings")
    op.drop_index("ix_bookings_customer_email", table_name="bookings")
    op.drop_table("bookings")
    op.drop_table("vehicles")
    op.drop_table("users")
    op.drop_table("pricing_rules")
    op.drop_table("employees")

    op.execute("DROP SEQUENCE IF EXISTS booking_number_seq")

    bind = op.get_bind()
    for enum in reversed(ALL_ENUMS):
        enum.drop(bind, checkfirst=True)
