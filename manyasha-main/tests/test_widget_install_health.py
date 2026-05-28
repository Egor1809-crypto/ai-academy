from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

import app as api_app


class _DummySession:
    def get(self, _model, _key):
        partner_model = getattr(api_app, "Partner", None)
        if partner_model is not None and _model is partner_model and str(_key) == str(api_app.DEFAULT_DEV_PARTNER_ID):
            return object()
        return None


@pytest.fixture
def health_client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("WIDGET_CONTEXT_REQUIRE_INSTALL", "true")
    monkeypatch.setenv("WIDGET_INSTALL_SIGNING_SECRET", "widget-health-signing-secret")
    monkeypatch.setenv("WIDGET_PARTNER_SITE_KEYS", "default:site-a")
    monkeypatch.delenv("WIDGET_PARTNER_DOMAIN_ALLOWLIST", raising=False)

    def _override_get_db():
        yield _DummySession()

    api_app.app.dependency_overrides[api_app.get_db] = _override_get_db
    with TestClient(api_app.app) as client:
        yield client
    api_app.app.dependency_overrides.pop(api_app.get_db, None)


def _checks_by_code(payload: dict) -> dict[str, dict]:
    checks = payload.get("checks") or []
    return {str(item.get("code")): item for item in checks if isinstance(item, dict)}


def _issue_token(*, site_key: str, origin: str = "") -> str:
    token, _expires_at = api_app._encode_widget_install_token(
        api_app.DEFAULT_DEV_PARTNER_ID,
        site_key=site_key,
        origin=origin or None,
        ttl_seconds=900,
    )
    return token


def test_widget_install_health_reports_contract_mismatch(health_client: TestClient) -> None:
    response = health_client.get(
        "/api/manyasha/widget-install-health",
        params={"pid": "default", "embed_contract_version": "999"},
    )
    assert response.status_code == 200
    payload = response.json()
    checks = _checks_by_code(payload)
    assert "embed_contract_unsupported" in checks
    assert payload["status"] == "error"


def test_widget_install_health_strict_mode_requires_contract_version(health_client: TestClient) -> None:
    response = health_client.get(
        "/api/manyasha/widget-install-health",
        params={"pid": "default"},
    )
    payload = response.json()
    checks = _checks_by_code(payload)
    assert "embed_contract_missing" in checks
    assert payload["status"] == "error"


def test_widget_install_health_reports_origin_and_site_key_errors(
    health_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WIDGET_PARTNER_DOMAIN_ALLOWLIST", "default:allowed.example")
    response = health_client.get(
        "/api/manyasha/widget-install-health",
        params={"pid": "default"},
        headers={"Origin": "https://blocked.example"},
    )
    assert response.status_code == 200
    checks = _checks_by_code(response.json())
    assert "origin_not_allowlisted" in checks
    assert "site_key_required" in checks


def test_widget_context_strict_mode_rejects_without_install_fields(
    health_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WIDGET_PARTNER_DOMAIN_ALLOWLIST", "default:allowed.example")
    response = health_client.get(
        "/api/manyasha/widget-context",
        params={
            "pid": "default",
            "sid": "strict-check",
            "embed_contract_version": str(api_app.MANYASHA_EMBED_CONTRACT_VERSION),
        },
        headers={"Origin": "https://allowed.example"},
    )
    assert response.status_code == 403
    message = response.json().get("detail", "")
    assert "site_key" in str(message).lower() or "install_token" in str(message).lower()


def test_widget_install_health_reports_site_key_not_registered(
    health_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WIDGET_PARTNER_DOMAIN_ALLOWLIST", "default:allowed.example")
    response = health_client.get(
        "/api/manyasha/widget-install-health",
        params={"pid": "default", "site_key": "site-b"},
        headers={"Origin": "https://blocked.example"},
    )
    assert response.status_code == 200
    checks = _checks_by_code(response.json())
    assert "site_key_not_registered" in checks


def test_widget_install_health_reports_install_token_required(
    health_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WIDGET_PARTNER_DOMAIN_ALLOWLIST", "default:allowed.example")
    response = health_client.get(
        "/api/manyasha/widget-install-health",
        params={"pid": "default", "site_key": "site-a"},
        headers={"Origin": "https://blocked.example"},
    )
    assert response.status_code == 200
    checks = _checks_by_code(response.json())
    assert "install_token_required" in checks


def test_widget_install_health_reports_install_token_invalid(
    health_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WIDGET_PARTNER_DOMAIN_ALLOWLIST", "default:allowed.example")
    response = health_client.get(
        "/api/manyasha/widget-install-health",
        params={
            "pid": "default",
            "site_key": "site-a",
            "install_token": "bad-token",
        },
        headers={"Origin": "https://blocked.example"},
    )
    assert response.status_code == 200
    checks = _checks_by_code(response.json())
    assert "install_token_invalid" in checks


def test_widget_install_health_reports_install_token_origin_mismatch(
    health_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WIDGET_PARTNER_DOMAIN_ALLOWLIST", "default:allowed.example")
    token = _issue_token(site_key="site-a", origin="allowed.example")
    response = health_client.get(
        "/api/manyasha/widget-install-health",
        params={
            "pid": "default",
            "site_key": "site-a",
            "install_token": token,
        },
        headers={"Origin": "https://blocked.example"},
    )
    assert response.status_code == 200
    checks = _checks_by_code(response.json())
    assert "install_token_origin_mismatch" in checks


def test_widget_install_health_reports_origin_warn_when_allowlist_missing(
    health_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("WIDGET_PARTNER_DOMAIN_ALLOWLIST", raising=False)
    token = _issue_token(site_key="site-a")
    response = health_client.get(
        "/api/manyasha/widget-install-health",
        params={
            "pid": "default",
            "site_key": "site-a",
            "install_token": token,
            "embed_contract_version": str(api_app.MANYASHA_EMBED_CONTRACT_VERSION),
        },
    )
    assert response.status_code == 200
    payload = response.json()
    checks = _checks_by_code(payload)
    assert "origin_allowlist_not_configured" in checks
    assert payload["can_issue_widget_context"] is True


def test_resolve_cors_origins_dev_includes_loopback_5174(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("CORS_ALLOW_ORIGINS", raising=False)
    monkeypatch.delenv("FRONTEND_URL", raising=False)

    origins, origin_regex = api_app._resolve_cors_origins()

    assert "http://localhost:5174" in origins
    assert "http://127.0.0.1:5174" in origins
    assert "http://localhost:5173" in origins
    assert "http://127.0.0.1:4173" in origins
    assert origin_regex == "^null$"


def test_resolve_cors_origins_production_does_not_enable_loopback_by_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("CORS_ALLOW_ORIGINS", raising=False)
    monkeypatch.delenv("FRONTEND_URL", raising=False)

    origins, origin_regex = api_app._resolve_cors_origins()

    assert origins == []
    assert origin_regex is None
