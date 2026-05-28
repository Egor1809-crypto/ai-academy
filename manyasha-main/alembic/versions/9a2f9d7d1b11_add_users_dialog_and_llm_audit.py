"""add users/dialog/llm audit tables

Revision ID: 9a2f9d7d1b11
Revises: eaebd558fc78
Create Date: 2026-04-07 18:15:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "9a2f9d7d1b11"
down_revision: Union[str, Sequence[str], None] = "eaebd558fc78"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS app")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION app.current_partner_id()
        RETURNS uuid
        LANGUAGE sql
        STABLE
        AS $$
            SELECT NULLIF(current_setting('app.current_partner_id', true), '')::uuid
        $$;
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION app.current_user_id()
        RETURNS uuid
        LANGUAGE sql
        STABLE
        AS $$
            SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
        $$;
        """
    )

    bind = op.get_bind()
    insp = sa.inspect(bind)
    app_tables = set(insp.get_table_names(schema="app")) if "app" in insp.get_schema_names() else set()
    _app_core_tables = {
        "users",
        "user_personal_data",
        "dialog_sessions",
        "dialog_messages",
        "llm_audit_log",
    }
    if _app_core_tables <= app_tables:
        _ensure_app_rls_policies()
        return

    op.create_table(
        "users",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("partner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("public.partners.id"), nullable=False),
        sa.Column("user_public_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("external_subject", sa.String(length=255), nullable=True),
        sa.Column("nickname", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("locale", sa.String(length=32), nullable=False, server_default="ru-RU"),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="UTC"),
        sa.Column("pii_email_hash", postgresql.BYTEA(), nullable=True),
        sa.Column("pii_phone_hash", postgresql.BYTEA(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_public_id", name="uq_users_user_public_id"),
        schema="app",
    )
    op.create_index("ix_users_partner_id", "users", ["partner_id"], unique=False, schema="app")

    op.create_table(
        "user_personal_data",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.users.user_id"), primary_key=True),
        sa.Column("partner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("public.partners.id"), nullable=False),
        sa.Column("email_enc", postgresql.BYTEA(), nullable=True),
        sa.Column("phone_enc", postgresql.BYTEA(), nullable=True),
        sa.Column("full_name_enc", postgresql.BYTEA(), nullable=True),
        sa.Column("notes_enc", postgresql.BYTEA(), nullable=True),
        sa.Column("encryption_key_id", sa.String(length=128), nullable=False, server_default="local-aesgcm-v1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        schema="app",
    )
    op.create_index("ix_user_personal_data_partner_id", "user_personal_data", ["partner_id"], unique=False, schema="app")

    op.create_table(
        "dialog_sessions",
        sa.Column("session_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("partner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("public.partners.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.users.user_id"), nullable=False),
        sa.Column("user_public_id_snapshot", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False, server_default="chat"),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        schema="app",
    )
    op.create_index("ix_dialog_sessions_partner_id", "dialog_sessions", ["partner_id"], unique=False, schema="app")
    op.create_index("ix_dialog_sessions_user_id", "dialog_sessions", ["user_id"], unique=False, schema="app")

    op.create_table(
        "dialog_messages",
        sa.Column("message_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("partner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("public.partners.id"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.dialog_sessions.session_id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.users.user_id"), nullable=False),
        sa.Column("seq_no", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("prompt_text_enc", postgresql.BYTEA(), nullable=False),
        sa.Column("content_sha256", postgresql.BYTEA(), nullable=True),
        sa.Column("token_count_input", sa.Integer(), nullable=True),
        sa.Column("token_count_output", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.UniqueConstraint("session_id", "seq_no", name="uq_dialog_messages_session_seq"),
        schema="app",
    )
    op.create_index("ix_dialog_messages_partner_id", "dialog_messages", ["partner_id"], unique=False, schema="app")
    op.create_index("ix_dialog_messages_session_id", "dialog_messages", ["session_id"], unique=False, schema="app")
    op.create_index("ix_dialog_messages_user_id", "dialog_messages", ["user_id"], unique=False, schema="app")

    op.create_table(
        "llm_audit_log",
        sa.Column("audit_log_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("partner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("public.partners.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("app.users.user_id"), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("prompt_hash", postgresql.BYTEA(), nullable=False),
        sa.Column("response_len", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("model", sa.String(length=128), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="ok"),
        schema="app",
    )
    op.create_index("ix_llm_audit_log_partner_id", "llm_audit_log", ["partner_id"], unique=False, schema="app")
    op.create_index("ix_llm_audit_log_user_id", "llm_audit_log", ["user_id"], unique=False, schema="app")
    op.create_index("ix_llm_audit_log_timestamp", "llm_audit_log", ["timestamp"], unique=False, schema="app")

    op.execute("ALTER TABLE app.users ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE app.user_personal_data ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE app.dialog_sessions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE app.dialog_messages ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE app.llm_audit_log ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE app.users FORCE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE app.user_personal_data FORCE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE app.dialog_sessions FORCE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE app.dialog_messages FORCE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE app.llm_audit_log FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY users_isolation_policy ON app.users
        USING (partner_id = app.current_partner_id())
        WITH CHECK (partner_id = app.current_partner_id())
        """
    )
    op.execute(
        """
        CREATE POLICY user_personal_data_isolation_policy ON app.user_personal_data
        USING (partner_id = app.current_partner_id())
        WITH CHECK (partner_id = app.current_partner_id())
        """
    )
    op.execute(
        """
        CREATE POLICY dialog_sessions_isolation_policy ON app.dialog_sessions
        USING (partner_id = app.current_partner_id())
        WITH CHECK (partner_id = app.current_partner_id())
        """
    )
    op.execute(
        """
        CREATE POLICY dialog_messages_isolation_policy ON app.dialog_messages
        USING (partner_id = app.current_partner_id())
        WITH CHECK (partner_id = app.current_partner_id())
        """
    )
    op.execute(
        """
        CREATE POLICY llm_audit_log_isolation_policy ON app.llm_audit_log
        USING (partner_id = app.current_partner_id())
        WITH CHECK (partner_id = app.current_partner_id())
        """
    )


def _ensure_app_rls_policies() -> None:
    """Если таблицы app уже есть (старый create_all), только включаем RLS и политики."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "app" not in insp.get_schema_names():
        return
    have = set(insp.get_table_names(schema="app"))
    for t in ("users", "user_personal_data", "dialog_sessions", "dialog_messages", "llm_audit_log"):
        if t not in have:
            continue
        op.execute(f"ALTER TABLE app.{t} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE app.{t} FORCE ROW LEVEL SECURITY")
    specs: list[tuple[str, str, str]] = [
        (
            "users",
            "users_isolation_policy",
            """
            CREATE POLICY users_isolation_policy ON app.users
            USING (partner_id = app.current_partner_id())
            WITH CHECK (partner_id = app.current_partner_id())
            """,
        ),
        (
            "user_personal_data",
            "user_personal_data_isolation_policy",
            """
            CREATE POLICY user_personal_data_isolation_policy ON app.user_personal_data
            USING (partner_id = app.current_partner_id())
            WITH CHECK (partner_id = app.current_partner_id())
            """,
        ),
        (
            "dialog_sessions",
            "dialog_sessions_isolation_policy",
            """
            CREATE POLICY dialog_sessions_isolation_policy ON app.dialog_sessions
            USING (partner_id = app.current_partner_id())
            WITH CHECK (partner_id = app.current_partner_id())
            """,
        ),
        (
            "dialog_messages",
            "dialog_messages_isolation_policy",
            """
            CREATE POLICY dialog_messages_isolation_policy ON app.dialog_messages
            USING (partner_id = app.current_partner_id())
            WITH CHECK (partner_id = app.current_partner_id())
            """,
        ),
        (
            "llm_audit_log",
            "llm_audit_log_isolation_policy",
            """
            CREATE POLICY llm_audit_log_isolation_policy ON app.llm_audit_log
            USING (partner_id = app.current_partner_id())
            WITH CHECK (partner_id = app.current_partner_id())
            """,
        ),
    ]
    for table, pol_name, create_sql in specs:
        if table not in have:
            continue
        op.execute(f"DROP POLICY IF EXISTS {pol_name} ON app.{table}")
        op.execute(create_sql)


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS llm_audit_log_isolation_policy ON app.llm_audit_log")
    op.execute("DROP POLICY IF EXISTS dialog_messages_isolation_policy ON app.dialog_messages")
    op.execute("DROP POLICY IF EXISTS dialog_sessions_isolation_policy ON app.dialog_sessions")
    op.execute("DROP POLICY IF EXISTS user_personal_data_isolation_policy ON app.user_personal_data")
    op.execute("DROP POLICY IF EXISTS users_isolation_policy ON app.users")

    op.drop_index("ix_llm_audit_log_timestamp", table_name="llm_audit_log", schema="app")
    op.drop_index("ix_llm_audit_log_user_id", table_name="llm_audit_log", schema="app")
    op.drop_index("ix_llm_audit_log_partner_id", table_name="llm_audit_log", schema="app")
    op.drop_table("llm_audit_log", schema="app")

    op.drop_index("ix_dialog_messages_user_id", table_name="dialog_messages", schema="app")
    op.drop_index("ix_dialog_messages_session_id", table_name="dialog_messages", schema="app")
    op.drop_index("ix_dialog_messages_partner_id", table_name="dialog_messages", schema="app")
    op.drop_table("dialog_messages", schema="app")

    op.drop_index("ix_dialog_sessions_user_id", table_name="dialog_sessions", schema="app")
    op.drop_index("ix_dialog_sessions_partner_id", table_name="dialog_sessions", schema="app")
    op.drop_table("dialog_sessions", schema="app")

    op.drop_index("ix_user_personal_data_partner_id", table_name="user_personal_data", schema="app")
    op.drop_table("user_personal_data", schema="app")

    op.drop_index("ix_users_partner_id", table_name="users", schema="app")
    op.drop_table("users", schema="app")
