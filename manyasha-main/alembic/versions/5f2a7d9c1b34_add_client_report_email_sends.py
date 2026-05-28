"""add client report email sends table

Revision ID: 5f2a7d9c1b34
Revises: c4d9e8a2f3b1
Create Date: 2026-04-28 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "5f2a7d9c1b34"
down_revision: Union[str, Sequence[str], None] = "c4d9e8a2f3b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "client_report_email_sends" in set(insp.get_table_names(schema="public")):
        return

    op.create_table(
        "client_report_email_sends",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("partner_id", sa.String(length=36), nullable=True),
        sa.Column("session_id", sa.String(length=64), nullable=False),
        sa.Column("email_hash", postgresql.BYTEA(), nullable=True),
        sa.Column("email_masked", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="sent"),
        sa.Column("report_checksum", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("report_length", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("diagnostic_summary", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_client_report_email_sends_partner_id", "client_report_email_sends", ["partner_id"], unique=False)
    op.create_index("ix_client_report_email_sends_session_id", "client_report_email_sends", ["session_id"], unique=False)
    op.create_index("ix_client_report_email_sends_status", "client_report_email_sends", ["status"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "client_report_email_sends" not in set(insp.get_table_names(schema="public")):
        return
    op.drop_index("ix_client_report_email_sends_status", table_name="client_report_email_sends")
    op.drop_index("ix_client_report_email_sends_session_id", table_name="client_report_email_sends")
    op.drop_index("ix_client_report_email_sends_partner_id", table_name="client_report_email_sends")
    op.drop_table("client_report_email_sends")
