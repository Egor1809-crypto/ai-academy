"""public schema baseline (all non-app ORM tables)

Revision ID: 7cfe9a12b3f0
Revises:
Create Date: 2026-04-07

Таблицы в schema app создаются в последующих ревизиях (RLS).
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "7cfe9a12b3f0"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _public_tables():
    import app as _app_module  # noqa: F401
    import partner_dashboard as _partner_dashboard  # noqa: F401
    from rpg_engine import Base

    return [t for t in Base.metadata.sorted_tables if t.schema is None]


def upgrade() -> None:
    conn = op.get_bind()
    for table in _public_tables():
        table.create(bind=conn, checkfirst=True)


def downgrade() -> None:
    conn = op.get_bind()
    for table in reversed(_public_tables()):
        table.drop(bind=conn, checkfirst=True)
