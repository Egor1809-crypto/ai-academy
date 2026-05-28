from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app as api_app
from rpg_engine import Base


SID = "client-report-email-session"
REPORT_PARTNER_ID = UUID("11111111-1111-4111-8111-aaaaaaaaaaaa")
_SESSION_FACTORY = None


def _auth_for(session_id: str = SID):
    return api_app.WidgetAuthContext(
        partner_id=REPORT_PARTNER_ID,
        session_id=session_id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )


@pytest.fixture(autouse=True)
def isolate_report_email(monkeypatch: pytest.MonkeyPatch):
    global _SESSION_FACTORY
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    public_tables = [table for table in Base.metadata.sorted_tables if table.schema is None]
    Base.metadata.create_all(bind=engine, tables=public_tables)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    _SESSION_FACTORY = session_factory

    def _override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    api_app._chat_limiter._events.clear()  # noqa: SLF001
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("WIDGET_CAPTCHA_REQUIRED", "false")
    monkeypatch.delenv("CLIENT_REPORT_EMAIL_WEBHOOK_URL", raising=False)
    api_app.app.dependency_overrides.pop(api_app.require_widget_auth, None)
    api_app.app.dependency_overrides[api_app.get_db] = _override_get_db
    yield
    api_app.app.dependency_overrides.pop(api_app.require_widget_auth, None)
    api_app.app.dependency_overrides.pop(api_app.get_db, None)
    api_app._chat_limiter._events.clear()  # noqa: SLF001
    _SESSION_FACTORY = None


def _payload(**overrides):
    payload = {
        "email": "client@example.test",
        "session_id": SID,
        "report_text": (
            "Предварительный итог Маняши\n\n"
            "Что уже понятно:\n- Долг: примерно 2 000 000 рублей.\n\n"
            "Это предварительный итог по вашим словам, не юридическое заключение "
            "и не гарантия списания долгов."
        ),
        "diagnostics": {
            "debt_amount": "2 000 000 рублей",
            "bailiffs": "есть списания",
            "risk_level": "high",
            "risk_reasons": ["крупная сумма долга"],
            "known_count": 3,
            "localStorage": {"secret": "must-not-leak"},
        },
        "consent": True,
        "captcha_token": None,
        "website": "",
    }
    payload.update(overrides)
    return payload


def _client_with_auth(session_id: str = SID) -> TestClient:
    api_app.app.dependency_overrides[api_app.require_widget_auth] = lambda: _auth_for(session_id)
    return TestClient(api_app.app)


def test_client_report_email_requires_widget_auth() -> None:
    with TestClient(api_app.app) as client:
        response = client.post("/api/client-report-email", json=_payload())

    assert response.status_code == 401


def test_client_report_email_rejects_session_mismatch() -> None:
    with _client_with_auth("other-session") as client:
        response = client.post("/api/client-report-email", json=_payload())

    assert response.status_code == 403


def test_client_report_email_mock_send_success_and_no_secret_leakage() -> None:
    with _client_with_auth() as client:
        response = client.post("/api/client-report-email", json=_payload())

    assert response.status_code == 202
    assert response.json() == {"status": "sent"}
    serialized = response.text
    assert "must-not-leak" not in serialized
    assert "2 000 000" not in serialized
    assert "client@example.test" not in serialized
    assert _SESSION_FACTORY is not None
    with _SESSION_FACTORY() as db:
        rows = db.query(api_app.ClientReportEmailSend).all()
    assert len(rows) == 1
    assert rows[0].partner_id == str(REPORT_PARTNER_ID)
    assert rows[0].session_id == SID
    assert rows[0].email_masked == "c***t@example.test"
    assert rows[0].email_hash is not None
    assert rows[0].status == "sent"
    assert rows[0].report_length > 20
    assert rows[0].report_checksum
    assert rows[0].diagnostic_summary["debt_amount"] == "2 000 000 рублей"
    assert "localStorage" not in rows[0].diagnostic_summary
    assert not hasattr(rows[0], "report_text")


def test_client_report_email_rejects_invalid_email() -> None:
    with _client_with_auth() as client:
        response = client.post("/api/client-report-email", json=_payload(email="not-an-email"))

    assert response.status_code == 400


def test_client_report_email_requires_explicit_consent() -> None:
    with _client_with_auth() as client:
        response = client.post("/api/client-report-email", json=_payload(consent=False))

    assert response.status_code == 400


def test_client_report_email_rejects_oversized_report() -> None:
    huge_report = "Итог. " + ("x" * (api_app.MAX_CLIENT_REPORT_EMAIL_TEXT_LEN + 1))
    with _client_with_auth() as client:
        response = client.post("/api/client-report-email", json=_payload(report_text=huge_report))

    assert response.status_code == 413


def test_client_report_email_rejects_raw_chat_history_field() -> None:
    with _client_with_auth() as client:
        response = client.post(
            "/api/client-report-email",
            json=_payload(chatHistory=[{"role": "user", "content": "raw chat must not pass"}]),
        )

    assert response.status_code == 400
    assert "raw chat must not pass" not in response.text


def test_client_report_email_does_not_fake_success_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    with _client_with_auth() as client:
        response = client.post("/api/client-report-email", json=_payload())

    assert response.status_code == 503
    assert "Email delivery" in response.text
