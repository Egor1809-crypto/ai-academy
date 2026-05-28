"""add_partners_table

Revision ID: eaebd558fc78
Revises: 35db4c6b59b9
Create Date: 2026-04-03 09:48:54.480961

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'eaebd558fc78'
down_revision: Union[str, Sequence[str], None] = '35db4c6b59b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if "partners" in insp.get_table_names():
        return
    op.create_table(
        "partners",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("email", name="uq_partners_email"),
    )
    op.create_index("ix_partners_email", "partners", ["email"], unique=True)


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if "partners" not in insp.get_table_names():
        return
    insp_ix = insp.get_indexes("partners")
    if any(ix["name"] == "ix_partners_email" for ix in insp_ix):
        op.drop_index("ix_partners_email", table_name="partners")
    op.drop_table("partners")
