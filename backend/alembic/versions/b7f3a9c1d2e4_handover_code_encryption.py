"""handover code encryption

Revision ID: b7f3a9c1d2e4
Revises: e4a1c7d2f9b3
Create Date: 2026-11-12 21:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7f3a9c1d2e4"
down_revision: str | None = "e4a1c7d2f9b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # The lockbox code must be recoverable by authorized users, so the column
    # now stores AES-256-GCM ciphertext instead of a one-way hash.
    op.alter_column(
        "handover_records",
        "access_code_hash",
        new_column_name="access_code_encrypted",
        existing_type=sa.String(length=255),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "handover_records",
        "access_code_encrypted",
        new_column_name="access_code_hash",
        existing_type=sa.String(length=255),
        existing_nullable=True,
    )
