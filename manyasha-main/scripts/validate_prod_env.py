#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _non_empty(name: str) -> tuple[bool, str]:
    val = (os.getenv(name) or "").strip()
    if not val:
        return False, f"{name} is empty"
    return True, "ok"


def _provider_config() -> tuple[bool, str]:
    provider = (os.getenv("MANYASHA_LLM_PROVIDER") or "").strip().lower()
    if not provider:
        return False, "MANYASHA_LLM_PROVIDER is empty"
    if provider not in {"navy", "ollama", "gemini", "auto"}:
        return False, "MANYASHA_LLM_PROVIDER must be one of: navy, ollama, gemini, auto"
    if provider == "navy" and not (os.getenv("NAVY_API_KEY") or "").strip():
        return False, "NAVY_API_KEY is required when MANYASHA_LLM_PROVIDER=navy"
    return True, "ok"


def _positive_number(name: str) -> tuple[bool, str]:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return False, f"{name} is empty"
    try:
        value = float(raw)
    except ValueError:
        return False, f"{name} must be numeric"
    if value <= 0:
        return False, f"{name} must be positive"
    return True, "ok"


def _non_wildcard_cors(name: str = "CORS_ALLOW_ORIGINS") -> tuple[bool, str]:
    value = (os.getenv(name) or "").strip()
    if not value:
        return False, f"{name} is empty"
    values = [item.strip() for item in value.split(",") if item.strip()]
    if not values:
        return False, f"{name} contains no valid origins"
    if any(item == "*" for item in values):
        return False, f"{name} must not contain '*' in production"
    return True, "ok"


def _env_is_prod() -> tuple[bool, str]:
    env = (os.getenv("APP_ENV") or "").strip().lower()
    if env in {"prod", "production"}:
        return True, "ok"
    return False, f"APP_ENV must be 'prod' or 'production' (current: {env or '<empty>'})"


def _bool_equals(name: str, expected: bool, default: bool) -> tuple[bool, str]:
    actual = _bool(name, default=default)
    if actual != expected:
        return False, f"{name} must be {str(expected).lower()} (current: {str(actual).lower()})"
    return True, "ok"


def validate() -> tuple[bool, list[str]]:
    checks: list[tuple[str, tuple[bool, str]]] = [
        ("app_env_prod", _env_is_prod()),
        ("database_url", _non_empty("DATABASE_URL")),
        ("redis_url", _non_empty("REDIS_URL")),
        ("jwt_secret", _non_empty("JWT_SECRET")),
        ("encryption_key", _non_empty("ENCRYPTION_KEY")),
        ("widget_auth_secret", _non_empty("WIDGET_AUTH_SECRET")),
        ("dev_auth_disabled", _bool_equals("DEV_AUTH_ENABLED", expected=False, default=False)),
        ("dev_storage_disabled", _bool_equals("DEV_STORAGE_ENABLED", expected=False, default=False)),
        (
            "legacy_plaintext_pii_disabled",
            _bool_equals("ALLOW_LEGACY_PLAINTEXT_PII", expected=False, default=False),
        ),
        ("create_all_disabled", _bool_equals("MANAYA_USE_CREATE_ALL", expected=False, default=False)),
        ("widget_require_install", _bool_equals("WIDGET_CONTEXT_REQUIRE_INSTALL", expected=True, default=False)),
        ("captcha_required", _bool_equals("WIDGET_CAPTCHA_REQUIRED", expected=True, default=True)),
        ("cors_null_origin_disabled", _bool_equals("CORS_ALLOW_NULL_ORIGIN", expected=False, default=False)),
        ("cors_strict", _non_wildcard_cors("CORS_ALLOW_ORIGINS")),
        (
            "embed_contract_supported_versions",
            _non_empty("MANYASHA_EMBED_SUPPORTED_CONTRACT_VERSIONS"),
        ),
        ("manyasha_provider", _provider_config()),
        ("manyasha_chat_timeout", _positive_number("MANYASHA_CHAT_LLM_TIMEOUT_SECONDS")),
        ("manyasha_demo_fast_mode_disabled", _bool_equals("MANYASHA_DEMO_FAST_MODE", expected=False, default=False)),
        ("metrics_service_token", _non_empty("INTERNAL_METRICS_SERVICE_TOKEN")),
        ("partner_domain_allowlist", _non_empty("WIDGET_PARTNER_DOMAIN_ALLOWLIST")),
        ("partner_site_keys", _non_empty("WIDGET_PARTNER_SITE_KEYS")),
        ("install_signing_secret", _non_empty("WIDGET_INSTALL_SIGNING_SECRET")),
        ("install_provision_key", _non_empty("WIDGET_INSTALL_PROVISION_KEY")),
        ("captcha_secret", _non_empty("WIDGET_CAPTCHA_SECRET")),
        ("alert_webhook_url", _non_empty("ALERT_WEBHOOK_URL")),
    ]

    failures: list[str] = []
    for name, result in checks:
        ok, detail = result
        status = "OK" if ok else "FAIL"
        print(f"[{status}] {name}: {detail}")
        if not ok:
            failures.append(f"{name}: {detail}")

    return (len(failures) == 0), failures


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate strict production env for Manyasha.")
    parser.add_argument("--quiet-ok", action="store_true", help="Print only failures.")
    args = parser.parse_args()

    ok, failures = validate()
    if ok:
        if not args.quiet_ok:
            print("PROD_ENV_OK")
        return 0

    print("PROD_ENV_FAIL")
    for item in failures:
        print(f"- {item}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
