"""initial schema (legacy no-op)

Revision ID: 35db4c6b59b9
Revises: 7cfe9a12b3f0
Create Date: 2026-04-02 16:43:22.213515

"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "35db4c6b59b9"
down_revision: Union[str, Sequence[str], None] = "7cfe9a12b3f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ранее добавлялось ограничение на event_id; теперь оно в baseline 7cfe9a12b3f0."""
    pass


def downgrade() -> None:
    pass
