from __future__ import annotations

import os
from typing import Generator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from mascot_talk_service import MascotTalkService, RuleBasedMascotTalkProvider
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import partner_dashboard
import rpg_engine
from partner_dashboard import configure_storage_signer
from rpg_engine import Base


TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/postgres",
)


class DummyStorageSigner:
    def presign_put(self, object_key: str, content_type: str, expires_in: int):
        from datetime import datetime, timedelta, timezone

        return partner_dashboard.PresignedUrlResponse(
            url=f"https://example.invalid/upload/{object_key}",
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            object_key=object_key,
            required_headers={"Content-Type": content_type},
        )

    def presign_get(self, object_key: str, expires_in: int) -> str:
        return f"https://example.invalid/preview/{object_key}?ttl={expires_in}"


@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def configure_security_env(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DEV_AUTH_ENABLED", "true")
    monkeypatch.setenv("DEV_AUTH_SECRET", "test-dev-auth-secret")
    monkeypatch.setenv("DEV_STORAGE_ENABLED", "true")
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret")
    monkeypatch.setenv("ENCRYPTION_KEY", "test-encryption-key")
    monkeypatch.setenv("PARTNER_HEADER_AUTH_ENABLED", "false")
    monkeypatch.delenv("ALLOW_LEGACY_PLAINTEXT_PII", raising=False)


@pytest.fixture(autouse=True)
def reset_database(test_engine):
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    partner_dashboard.rate_limiter._events.clear()


@pytest.fixture
def db_session_factory(test_engine):
    return sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)


@pytest.fixture
def app(db_session_factory) -> FastAPI:
    app = FastAPI()
    app.include_router(rpg_engine.router)
    app.include_router(partner_dashboard.router)

    def override_get_db() -> Generator[Session, None, None]:
        db = db_session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[rpg_engine.get_db] = override_get_db
    app.dependency_overrides[partner_dashboard.get_db] = override_get_db
    configure_storage_signer(DummyStorageSigner())
    rpg_engine.event_bus = rpg_engine.NoopEventBusPublisher()
    partner_dashboard.mascot_talk_service = MascotTalkService(provider=RuleBasedMascotTalkProvider())
    return app


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    return TestClient(app)
