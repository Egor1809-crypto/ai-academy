from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_validator():
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "validate_prod_env.py"
    spec = importlib.util.spec_from_file_location("validate_prod_env", script_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _set_valid_prod_env(monkeypatch) -> None:
    values = {
        "APP_ENV": "production",
        "DATABASE_URL": "postgresql+psycopg://manaya:secret@postgres:5432/manaya",
        "REDIS_URL": "redis://redis:6379/0",
        "JWT_SECRET": "test-jwt-secret",
        "ENCRYPTION_KEY": "test-encryption-key",
        "WIDGET_AUTH_SECRET": "test-widget-auth-secret",
        "DEV_AUTH_ENABLED": "false",
        "DEV_STORAGE_ENABLED": "false",
        "ALLOW_LEGACY_PLAINTEXT_PII": "false",
        "MANAYA_USE_CREATE_ALL": "0",
        "WIDGET_CONTEXT_REQUIRE_INSTALL": "true",
        "WIDGET_CAPTCHA_REQUIRED": "true",
        "CORS_ALLOW_NULL_ORIGIN": "false",
        "CORS_ALLOW_ORIGINS": "https://example.ru",
        "MANYASHA_EMBED_SUPPORTED_CONTRACT_VERSIONS": "1",
        "MANYASHA_LLM_PROVIDER": "navy",
        "MANYASHA_CHAT_LLM_TIMEOUT_SECONDS": "12.0",
        "MANYASHA_DEMO_FAST_MODE": "false",
        "NAVY_API_KEY": "test-navy-key",
        "INTERNAL_METRICS_SERVICE_TOKEN": "test-metrics-token",
        "WIDGET_PARTNER_DOMAIN_ALLOWLIST": "default:example.ru",
        "WIDGET_PARTNER_SITE_KEYS": "default:site-key",
        "WIDGET_INSTALL_SIGNING_SECRET": "test-install-signing",
        "WIDGET_INSTALL_PROVISION_KEY": "test-install-provision",
        "WIDGET_CAPTCHA_SECRET": "test-captcha-secret",
        "ALERT_WEBHOOK_URL": "https://alerts.example.ru/hook",
    }
    for key, value in values.items():
        monkeypatch.setenv(key, value)


def test_validate_prod_env_accepts_complete_safe_config(monkeypatch) -> None:
    validator = _load_validator()
    _set_valid_prod_env(monkeypatch)

    ok, failures = validator.validate()

    assert ok
    assert failures == []


def test_validate_prod_env_requires_navy_key_for_navy_provider(monkeypatch) -> None:
    validator = _load_validator()
    _set_valid_prod_env(monkeypatch)
    monkeypatch.delenv("NAVY_API_KEY", raising=False)

    ok, failures = validator.validate()

    assert not ok
    assert any("NAVY_API_KEY" in failure for failure in failures)


def test_validate_prod_env_rejects_unsafe_prod_flags(monkeypatch) -> None:
    validator = _load_validator()
    _set_valid_prod_env(monkeypatch)
    monkeypatch.setenv("DEV_AUTH_ENABLED", "true")

    ok, failures = validator.validate()

    assert not ok
    assert any("dev_auth_disabled" in failure for failure in failures)
