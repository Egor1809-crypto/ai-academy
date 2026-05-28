from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

import app as api_app


class _DummyConnection:
    def __enter__(self):
        return self

    def __exit__(self, *_args) -> None:
        return None

    def execute(self, _statement) -> None:
        return None


class _DummyEngine:
    def connect(self):
        return _DummyConnection()


class _FailingEngine:
    def connect(self):
        raise RuntimeError("db is down")


class _DummyRedis:
    def ping(self) -> bool:
        return True


@pytest.fixture(autouse=True)
def isolate_readyz(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(api_app, "db_engine", _DummyEngine())
    monkeypatch.setattr(api_app, "_redis_client", None)
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("MANYASHA_LLM_PROVIDER", "ollama")
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.delenv("NAVY_API_KEY", raising=False)
    yield


def test_healthz_remains_lightweight() -> None:
    with TestClient(api_app.app) as client:
        response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readyz_ok_in_test_without_redis_or_navy(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MANYASHA_LLM_PROVIDER", "navy")

    with TestClient(api_app.app) as client:
        response = client.get("/readyz")

    payload = response.json()
    assert response.status_code == 200
    assert payload["status"] == "ready"
    assert payload["checks"]["database"]["status"] == "ok"
    assert payload["checks"]["redis"]["code"] == "redis_optional"
    assert payload["checks"]["provider"]["code"] == "provider_optional_fallback"


def test_readyz_fails_in_production_when_navy_key_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("REDIS_URL", "redis://redis:6379/0")
    monkeypatch.setenv("MANYASHA_LLM_PROVIDER", "navy")
    monkeypatch.delenv("NAVY_API_KEY", raising=False)
    monkeypatch.setattr(api_app, "_redis_client", _DummyRedis())

    with TestClient(api_app.app) as client:
        response = client.get("/readyz")

    payload = response.json()
    assert response.status_code == 503
    assert payload["status"] == "not_ready"
    assert payload["checks"]["provider"]["code"] == "navy_api_key_missing"


def test_readyz_fails_in_production_when_redis_required_but_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("MANYASHA_LLM_PROVIDER", "ollama")
    monkeypatch.delenv("REDIS_URL", raising=False)
    monkeypatch.setattr(api_app, "_redis_client", None)

    with TestClient(api_app.app) as client:
        response = client.get("/readyz")

    payload = response.json()
    assert response.status_code == 503
    assert payload["status"] == "not_ready"
    assert payload["checks"]["redis"]["code"] == "redis_url_missing"


def test_readyz_fails_on_database_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(api_app, "db_engine", _FailingEngine())

    with TestClient(api_app.app) as client:
        response = client.get("/readyz")

    payload = response.json()
    assert response.status_code == 503
    assert payload["status"] == "not_ready"
    assert payload["checks"]["database"]["code"] == "database_unavailable"


def test_readyz_response_does_not_expose_secret_values(monkeypatch: pytest.MonkeyPatch) -> None:
    secret_value = "readyz-super-secret-navy-token"
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("REDIS_URL", "redis://redis:6379/0")
    monkeypatch.setenv("MANYASHA_LLM_PROVIDER", "navy")
    monkeypatch.setenv("NAVY_API_KEY", secret_value)
    monkeypatch.setattr(api_app, "_redis_client", _DummyRedis())

    with TestClient(api_app.app) as client:
        response = client.get("/readyz")

    payload_text = json.dumps(response.json(), ensure_ascii=False)
    assert response.status_code == 200
    assert secret_value not in payload_text
