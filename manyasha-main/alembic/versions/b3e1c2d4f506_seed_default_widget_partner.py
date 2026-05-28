"""seed default widget partner row for dev / pid=default

Revision ID: b3e1c2d4f506
Revises: 9a2f9d7d1b11
Create Date: 2026-04-07
"""

from __future__ import annotations

import hashlib
from typing import Sequence, Union

from alembic import op


revision: str = "b3e1c2d4f506"
down_revision: Union[str, Sequence[str], None] = "9a2f9d7d1b11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_DEV_PARTNER_ID = "00000000-0000-0000-0000-000000000001"
_HASH = hashlib.sha256(b"widget-seed-do-not-login").hexdigest()


def upgrade() -> None:
    op.execute(
        f"""
        INSERT INTO partners (id, name, email, hashed_password, is_active, created_at)
        VALUES (
            '{_DEV_PARTNER_ID}'::uuid,
            'Dev widget',
            'dev-widget@local.invalid',
            '{_HASH}',
            true,
            now()
        )
        ON CONFLICT (id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(f"DELETE FROM partners WHERE id = '{_DEV_PARTNER_ID}'::uuid")
