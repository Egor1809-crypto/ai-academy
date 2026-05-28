"""add widget handoff tickets table

Revision ID: c4d9e8a2f3b1
Revises: b3e1c2d4f506
Create Date: 2026-04-18 13:10:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "c4d9e8a2f3b1"
down_revision: Union[str, Sequence[str], None] = "b3e1c2d4f506"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "widget_handoff_tickets" in set(insp.get_table_names(schema="public")):
        return

    op.create_table(
        "widget_handoff_tickets",
        sa.Column("ticket_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", sa.String(length=64), nullable=False),
        sa.Column("partner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("dialog_session_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="queued"),
        sa.Column("priority", sa.String(length=16), nullable=False, server_default="normal"),
        sa.Column("risk_level", sa.String(length=16), nullable=False, server_default="medium"),
        sa.Column("category", sa.String(length=48), nullable=False, server_default="general"),
        sa.Column("queue_position", sa.Integer(), nullable=True),
        sa.Column("eta_seconds", sa.Integer(), nullable=True),
        sa.Column("sla_seconds", sa.Integer(), nullable=False, server_default="180"),
        sa.Column("requested_channel", sa.String(length=24), nullable=False, server_default="web_chat"),
        sa.Column("target_channel", sa.String(length=24), nullable=False, server_default="phone"),
        sa.Column("operator_name", sa.String(length=120), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("handoff_context", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("transcript_tail", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_widget_handoff_tickets_session_id", "widget_handoff_tickets", ["session_id"], unique=False)
    op.create_index("ix_widget_handoff_tickets_partner_id", "widget_handoff_tickets", ["partner_id"], unique=False)
    op.create_index("ix_widget_handoff_tickets_user_id", "widget_handoff_tickets", ["user_id"], unique=False)
    op.create_index("ix_widget_handoff_tickets_dialog_session_id", "widget_handoff_tickets", ["dialog_session_id"], unique=False)
    op.create_index("ix_widget_handoff_tickets_status", "widget_handoff_tickets", ["status"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "widget_handoff_tickets" not in set(insp.get_table_names(schema="public")):
        return
    op.drop_index("ix_widget_handoff_tickets_status", table_name="widget_handoff_tickets")
    op.drop_index("ix_widget_handoff_tickets_dialog_session_id", table_name="widget_handoff_tickets")
    op.drop_index("ix_widget_handoff_tickets_user_id", table_name="widget_handoff_tickets")
    op.drop_index("ix_widget_handoff_tickets_partner_id", table_name="widget_handoff_tickets")
    op.drop_index("ix_widget_handoff_tickets_session_id", table_name="widget_handoff_tickets")
    op.drop_table("widget_handoff_tickets")
