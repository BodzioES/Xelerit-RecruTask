"""vehicle cargo dimensions

Revision ID: 54cccdd05206
Revises: 1f6c2d4e8a90
Create Date: 2026-11-14 20:21:43.113011

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "54cccdd05206"
down_revision: str | None = "1f6c2d4e8a90"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("vehicles", sa.Column("cargo_length_cm", sa.SmallInteger(), nullable=True))
    op.add_column("vehicles", sa.Column("cargo_width_cm", sa.SmallInteger(), nullable=True))
    op.add_column("vehicles", sa.Column("cargo_height_cm", sa.SmallInteger(), nullable=True))

    op.create_check_constraint(
        "ck_vehicles_cargo_length_positive",
        "vehicles",
        "cargo_length_cm IS NULL OR cargo_length_cm > 0",
    )
    op.create_check_constraint(
        "ck_vehicles_cargo_width_positive",
        "vehicles",
        "cargo_width_cm IS NULL OR cargo_width_cm > 0",
    )
    op.create_check_constraint(
        "ck_vehicles_cargo_height_positive",
        "vehicles",
        "cargo_height_cm IS NULL OR cargo_height_cm > 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_vehicles_cargo_height_positive", "vehicles", type_="check")
    op.drop_constraint("ck_vehicles_cargo_width_positive", "vehicles", type_="check")
    op.drop_constraint("ck_vehicles_cargo_length_positive", "vehicles", type_="check")
    op.drop_column("vehicles", "cargo_height_cm")
    op.drop_column("vehicles", "cargo_width_cm")
    op.drop_column("vehicles", "cargo_length_cm")
