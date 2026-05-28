from __future__ import annotations

import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Подтягиваем все модели чтобы autogenerate их видел
from rpg_engine import Base  # noqa: E402
import partner_dashboard  # noqa: E402, F401 — регистрирует Partner, PartnerMascotAsset и др.
import app as _app_module  # noqa: E402, F401 — регистрирует ConsultationRequest

target_metadata = Base.metadata

# DATABASE_URL из env (приоритет) или из alembic.ini
db_url = os.getenv(
    "DATABASE_URL",
    config.get_main_option("sqlalchemy.url", "postgresql://manaya_dev:manaya_dev@db:5432/manaya"),
)
# postgres:// → postgresql://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
# В образе API установлен psycopg2-binary; для Alembic подменяем драйвер psycopg v3.
if "postgresql+psycopg://" in db_url:
    db_url = db_url.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)

config.set_main_option("sqlalchemy.url", db_url)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
