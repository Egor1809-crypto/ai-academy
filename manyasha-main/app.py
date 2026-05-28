from __future__ import annotations

import asyncio
import base64
from collections import defaultdict
import hashlib
import hmac
import ipaddress
import json
import os
import random
import re
import secrets
import wave
from pathlib import Path
from datetime import datetime, timedelta, timezone
from time import perf_counter
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request
from uuid import UUID, uuid4

import io

from fastapi import Depends, FastAPI, HTTPException, Header, Query, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
from prometheus_client import Counter, Gauge, Histogram, generate_latest
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import DateTime, Index, Integer, JSON as SAJSON, LargeBinary, String, Text, case, text as sa_text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, Session, mapped_column
from sqlalchemy.types import TypeDecorator

from partner_dashboard import (
    DEFAULT_DEV_PARTNER_ID,
    InMemoryRateLimiter,
    LocalDevStorageSigner,
    Partner,
    PartnerDashboardContext,
    configure_storage_signer,
    create_schema,
    get_partner_dashboard_context,
    router as partner_router,
)
from rpg_engine import Base, engine as db_engine, get_db, router as rpg_router


class PortableUUID(TypeDecorator):
    """UUID column that stays UUID on Postgres and text on SQLite/live demo DB."""

    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PGUUID(as_uuid=True))
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        uuid_value = value if isinstance(value, UUID) else UUID(str(value))
        if dialect.name == "postgresql":
            return uuid_value
        return str(uuid_value)

    def process_result_value(self, value, dialect):
        if value is None or isinstance(value, UUID):
            return value
        return UUID(str(value))


def _load_dotenv(path: str = ".env") -> None:
    env_path = Path(path)
    if not env_path.exists():
        return

    try:
        for raw_line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue

            if line.startswith("export "):
                line = line[len("export "):]

            if "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            if not key or key in os.environ:
                continue

            value = value.strip()
            if value and ((value[0] == value[-1]) and value[0] in ('"', "'")):
                value = value[1:-1]
            os.environ[key] = value
    except Exception:
        # Никаких hard-fail-эффектов из-за локального чтения .env
        pass


_load_dotenv()

# ── Sentry (необязательно — работает и без DSN) ──
_SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if _SENTRY_DSN:
    try:
        import sentry_sdk
        sentry_sdk.init(dsn=_SENTRY_DSN, traces_sample_rate=0.2)
    except ImportError:
        pass

# ── Redis ──
_redis_client = None
try:
    import redis as _redis_lib
    _r = _redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True, socket_connect_timeout=2)
    _r.ping()
    _redis_client = _r
    print("[CACHE] Redis подключён", flush=True)
except Exception as _e:
    print(f"[CACHE] Redis недоступен, кэш отключён: {_e}", flush=True)

CHAT_CACHE_TTL = int(os.getenv("CHAT_CACHE_TTL", "1800"))  # 30 мин
# Смена версии сбрасывает старые ответы в Redis (после смены промпта подними v3 и т.д.)
CHAT_CACHE_VERSION = os.getenv("MANYASHA_CHAT_CACHE_VERSION", "v3")
WIDGET_INSTALL_TOKEN_TTL_SECONDS = int(os.getenv("WIDGET_INSTALL_TOKEN_TTL_SECONDS", "900"))
MANYASHA_EMBED_CONTRACT_VERSION = os.getenv("MANYASHA_EMBED_CONTRACT_VERSION", "1").strip() or "1"


def _make_cache_key(message: str, history_tail: list[dict], profile_context: dict | None = None) -> str:
    def _norm(text: str, limit: int) -> str:
        clean = re.sub(r"\s+", " ", str(text or "").strip().lower())
        return clean[:limit]

    payload = {
        "m": _norm(message, 700),
        "h": [
            {
                "r": str(item.get("role") or "").strip().lower()[:16],
                "c": _norm(str(item.get("content") or ""), 260),
            }
            for item in history_tail[-6:]
            if str(item.get("role") or "").strip() and str(item.get("content") or "").strip()
        ],
    }
    if profile_context:
        payload["p"] = profile_context
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    return f"manyasha:chat:{CHAT_CACHE_VERSION}:" + hashlib.sha256(raw.encode("utf-8")).hexdigest()


# ── CRM Webhook ──
CRM_WEBHOOK_URL = os.getenv("CRM_WEBHOOK_URL", "")
WIDGET_HUMAN_HANDOFF_SLA_SEC = int(os.getenv("WIDGET_HUMAN_HANDOFF_SLA_SEC", "180"))
WIDGET_HUMAN_HANDOFF_BASE_ETA_SEC = int(os.getenv("WIDGET_HUMAN_HANDOFF_BASE_ETA_SEC", "120"))
WIDGET_AUTH_TTL_SECONDS = int(os.getenv("WIDGET_AUTH_TTL_SECONDS", "3600"))
MAX_WIDGET_MESSAGE_LEN = int(os.getenv("MAX_WIDGET_MESSAGE_LEN", "4000"))
MAX_WIDGET_REASON_LEN = int(os.getenv("MAX_WIDGET_REASON_LEN", "2000"))
MAX_WIDGET_DATA_BLOB_BYTES = int(os.getenv("MAX_WIDGET_DATA_BLOB_BYTES", "8192"))
MAX_WIDGET_TRANSCRIPT_ITEMS = int(os.getenv("MAX_WIDGET_TRANSCRIPT_ITEMS", "24"))
MAX_WIDGET_HISTORY_ITEMS = int(os.getenv("MAX_WIDGET_HISTORY_ITEMS", "80"))
MAX_WIDGET_FIELD_LEN = int(os.getenv("MAX_WIDGET_FIELD_LEN", "255"))
MAX_CLIENT_REPORT_EMAIL_TEXT_LEN = int(os.getenv("MAX_CLIENT_REPORT_EMAIL_TEXT_LEN", "6000"))

# Небольшая встроенная база знаний для self-serve слоя в виджете.
# В проде может быть заменена на внешнюю KB/поиск без изменения фронтенд-контракта.
MANYASHA_KB_ARTICLES: list[dict] = [
    {
        "id": "bk-threshold",
        "title": "Когда можно запускать банкротство",
        "category": "Процедура",
        "content": (
            "Судебная процедура обычно рассматривается при существенной сумме долга и признаках "
            "неплатёжеспособности. Для МФЦ действует отдельный набор условий."
        ),
        "tags": ["банкротство", "порог", "сумма долга", "мфц", "суд"],
        "stages": ["pre", "active"],
    },
    {
        "id": "bk-mfc-vs-court",
        "title": "МФЦ или суд: как выбрать формат",
        "category": "Процедура",
        "content": (
            "Через МФЦ путь проще по документам, но применим не для всех случаев. Судебный вариант "
            "гибче и покрывает более сложные сценарии."
        ),
        "tags": ["мфц", "суд", "выбор", "условия"],
        "stages": ["pre"],
    },
    {
        "id": "bk-bailiff-freeze",
        "title": "Что делать при блокировке счета приставами",
        "category": "Риски",
        "content": (
            "Проверьте основание взыскания и номер исполнительного производства, соберите выписки "
            "по счетам и зафиксируйте сумму удержаний."
        ),
        "tags": ["пристав", "арест", "блокировка счета", "исполнительное производство"],
        "stages": ["active", "critical"],
    },
    {
        "id": "bk-collectors",
        "title": "Как корректно реагировать на коллекторов",
        "category": "Коммуникация",
        "content": (
            "Не передавайте лишние персональные данные, фиксируйте угрозы и нарушения, ведите "
            "коммуникацию в письменной форме."
        ),
        "tags": ["коллекторы", "угрозы", "защита"],
        "stages": ["active", "critical"],
    },
    {
        "id": "bk-docs-pack",
        "title": "Базовый пакет документов",
        "category": "Документы",
        "content": (
            "Паспорт, сведения о доходах, список кредиторов, судебные и исполнительные документы, "
            "договоры по займам/кредитам."
        ),
        "tags": ["документы", "подготовка", "кредиторы"],
        "stages": ["pre", "active"],
    },
    {
        "id": "bk-property-risks",
        "title": "Какие риски по имуществу",
        "category": "Имущество",
        "content": (
            "Оценка рисков зависит от состава имущества и сделок за прошлые периоды. Единственное "
            "жильё обычно имеет отдельный режим защиты."
        ),
        "tags": ["имущество", "квартира", "машина", "риски"],
        "stages": ["pre", "active", "critical"],
    },
    {
        "id": "bk-timeline",
        "title": "Ориентировочные сроки процедуры",
        "category": "Сроки",
        "content": (
            "Срок зависит от нагрузки суда, структуры долгов и полноты пакета документов. "
            "На старте лучше закладывать буфер по времени."
        ),
        "tags": ["сроки", "этапы", "процедура"],
        "stages": ["pre", "active"],
    },
    {
        "id": "bk-non-dischargeable",
        "title": "Какие обязательства не списываются",
        "category": "Ограничения",
        "content": (
            "Часть обязательств имеет исключения: например, отдельные виды вреда, алименты и "
            "некоторые штрафные требования."
        ),
        "tags": ["алименты", "ограничения", "не списывается"],
        "stages": ["pre", "active"],
    },
]


REQUEST_LATENCY = Histogram(
    "manaya_http_request_latency_seconds",
    "HTTP request latency for Manaya API",
    ["method", "path"],
)
LLM_TIMEOUT_TOTAL = Counter(
    "manaya_llm_timeout_total",
    "Number of LLM timeout events",
)
FRONTEND_TTFM_SECONDS = Gauge(
    "manaya_frontend_ttfm_seconds",
    "Reported frontend TTFM in seconds",
    ["partner_id"],
)
FRONTEND_FPS = Gauge(
    "manaya_frontend_fps",
    "Reported frontend FPS",
    ["partner_id"],
)
WIDGET_INSTALL_HEALTH_TOTAL = Counter(
    "manaya_widget_install_health_total",
    "Widget install health overall statuses",
    ["status", "code"],
)
WIDGET_INSTALL_HEALTH_CHECK_TOTAL = Counter(
    "manaya_widget_install_health_check_total",
    "Widget install health check statuses",
    ["name", "status", "code"],
)


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return float(default)
    try:
        return float(str(raw).strip())
    except Exception:
        return float(default)


def _env_csv(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in str(raw or "").split(",") if item and item.strip()]


def _is_staging_env() -> bool:
    return os.getenv("APP_ENV", "").strip().lower() in {"stage", "staging"}


def _is_production_or_staging_env() -> bool:
    return _is_production_env() or _is_staging_env()


def _default_embed_contract_versions() -> list[str]:
    versions: list[str] = [MANYASHA_EMBED_CONTRACT_VERSION]
    normalized_current = MANYASHA_EMBED_CONTRACT_VERSION.strip()
    if normalized_current.isdigit():
        current_int = int(normalized_current)
        if current_int > 1:
            prev = str(current_int - 1)
            if prev not in versions:
                versions.append(prev)
    return versions


def _supported_embed_contract_versions() -> list[str]:
    raw = _env_csv("MANYASHA_EMBED_SUPPORTED_CONTRACT_VERSIONS")
    if raw:
        seen: set[str] = set()
        out: list[str] = []
        for item in raw:
            norm = str(item).strip()
            if not norm or norm in seen:
                continue
            seen.add(norm)
            out.append(norm)
        current = str(MANYASHA_EMBED_CONTRACT_VERSION or "").strip()
        if current and current not in seen:
            out.append(current)
        return out
    default = _default_embed_contract_versions()
    # Сохраняем порядок: текущий + N-1
    return default


def _default_supported_embed_contract_version() -> str:
    supported = _supported_embed_contract_versions()
    if supported:
        return str(supported[0])
    return str((MANYASHA_EMBED_CONTRACT_VERSION or "1").strip() or "1")


def _parse_partner_string_map(raw_value: str) -> dict[str, list[str]]:
    raw = (raw_value or "").strip()
    if not raw:
        return {}
    if raw.startswith("{"):
        try:
            parsed = json.loads(raw)
        except Exception:
            return {}
        if not isinstance(parsed, dict):
            return {}
        out: dict[str, list[str]] = {}
        for key, value in parsed.items():
            k = str(key or "").strip()
            if not k:
                continue
            if isinstance(value, str):
                vals = [item.strip() for item in value.split(",") if item.strip()]
            elif isinstance(value, (list, tuple, set)):
                vals = [str(item).strip() for item in value if str(item).strip()]
            elif value is None:
                vals = []
            else:
                vals = [str(value)]
            if vals:
                out[k] = vals
        return out

    out: dict[str, list[str]] = {}
    for entry in raw.split(","):
        pair = str(entry or "").strip()
        if not pair:
            continue
        if ":" not in pair:
            continue
        partner_part, domain_part = pair.split(":", 1)
        p = partner_part.strip()
        d = domain_part.strip()
        if not p or not d:
            continue
        out[p] = [v.strip() for v in d.split("|") if v.strip()]
    return out


def _normalize_host_pattern(raw: str) -> str:
    s = str(raw or "").strip().lower()
    if not s:
        return ""
    if "://" in s:
        try:
            s = urllib_parse.urlsplit(s).hostname or ""
        except Exception:
            s = s.split(":", 1)[0]
    else:
        s = s.split(":", 1)[0]
    return s.lstrip(".")


def _host_matches_pattern(host: str, raw_pattern: str) -> bool:
    if not host or not raw_pattern:
        return False
    pattern = _normalize_host_pattern(raw_pattern)
    if not pattern:
        return False
    if pattern == "*":
        return True
    if host == pattern:
        return True
    if pattern.startswith("*."):
        return host.endswith(pattern[1:])
    return host.endswith("." + pattern)


def _parse_widget_partner_map(raw: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for partner_key, raw_items in _parse_partner_string_map(raw).items():
        values: list[str] = []
        for item in raw_items:
            norm = _normalize_host_pattern(item)
            if norm:
                values.append(norm)
        if values:
            out[partner_key] = values
    return out


def _extract_origin_host(request: Request) -> str:
    raw = str(request.headers.get("origin") or request.headers.get("referer") or "").strip()
    if not raw:
        return ""
    if raw.startswith("file:"):
        return ""
    try:
        p = urllib_parse.urlsplit(raw)
        return _normalize_host_pattern(p.hostname or "")
    except Exception:
        return _normalize_host_pattern(raw)


def _is_local_widget_preview_request(request: Request | None) -> bool:
    if request is None:
        return False
    origin_host = _extract_origin_host(request)
    if origin_host in {"localhost", "127.0.0.1", "::1"}:
        return True
    client_host = str(getattr(request.client, "host", "") or "").strip().lower()
    if not origin_host and client_host in {"localhost", "127.0.0.1", "::1"}:
        return True
    return False


def _is_widget_local_dev_preview_bypass_enabled(
    partner_id: UUID,
    protection_enabled: bool,
    request: Request | None = None,
) -> bool:
    if not protection_enabled:
        return False
    if _is_production_or_staging_env():
        return False
    if partner_id != DEFAULT_DEV_PARTNER_ID:
        return False
    if not _env_bool("WIDGET_LOCAL_DEV_PREVIEW_BYPASS", default=True):
        return False
    if request is None:
        return True
    return _is_local_widget_preview_request(request)


def _get_widget_partner_domain_allowlist(partner_id: UUID) -> list[str]:
    data = _parse_widget_partner_map(os.getenv("WIDGET_PARTNER_DOMAIN_ALLOWLIST", "").strip())
    fallback = _parse_widget_partner_map(os.getenv("WIDGET_PARTNER_DOMAIN_ALLOWLIST_JSON", "").strip())
    if fallback:
        data.update(fallback)
    key = str(partner_id)
    direct = data.get(key, [])
    if direct:
        return direct
    default_bucket = data.get("default", [])
    return default_bucket


def _resolve_widget_partner_id(pid: str) -> UUID:
    key = (pid or "default").strip()
    try:
        return UUID(key)
    except ValueError:
        if key.lower() in {"default", "widget", ""}:
            return DEFAULT_DEV_PARTNER_ID
        raise HTTPException(status_code=400, detail="invalid_partner_key")


def _is_widget_context_partner_check_required(
    partner_id: UUID,
    protection_enabled: bool | None = None,
    request: Request | None = None,
) -> bool:
    """В локале держим preview удобным: default/widget допускается без записи в БД."""
    if _is_production_env():
        return True
    if protection_enabled is None:
        protection_enabled = _require_widget_context_protection()
    if _is_widget_local_dev_preview_bypass_enabled(partner_id, bool(protection_enabled), request):
        return False
    if protection_enabled:
        return True
    if partner_id != DEFAULT_DEV_PARTNER_ID:
        return True
    return _env_bool("WIDGET_CONTEXT_REQUIRE_PARTNER", default=False)


def _get_widget_partner_site_keys(partner_id: UUID) -> list[str]:
    data = _parse_widget_partner_map(os.getenv("WIDGET_PARTNER_SITE_KEYS", "").strip())
    fallback = _parse_widget_partner_map(os.getenv("WIDGET_PARTNER_SITE_KEY", "").strip())
    if fallback:
        data.update(fallback)
    merged = list(data.get(str(partner_id), []))
    merged.extend(data.get("default", []))
    deduped: list[str] = []
    seen: set[str] = set()
    for item in merged:
        norm = str(item or "").strip()
        if not norm or norm in seen:
            continue
        seen.add(norm)
        deduped.append(norm)
    return deduped


def _widget_install_signing_secret() -> str:
    secret = (os.getenv("WIDGET_INSTALL_SIGNING_SECRET") or "").strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Install token secret не настроен. Установите WIDGET_INSTALL_SIGNING_SECRET.",
        )
    return secret


def _require_widget_context_protection() -> bool:
    explicit = os.getenv("WIDGET_CONTEXT_REQUIRE_INSTALL")
    if explicit is not None and str(explicit).strip() != "":
        return _env_bool("WIDGET_CONTEXT_REQUIRE_INSTALL", default=False)
    if _is_production_or_staging_env():
        return _env_bool("WIDGET_CONTEXT_REQUIRE_INSTALL", True)
    return False


def _widget_install_provision_secret() -> str:
    secret = (
        os.getenv("WIDGET_INSTALL_PROVISION_KEY")
        or os.getenv("WIDGET_INSTALL_SIGNING_SECRET")
        or ""
    ).strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Widget install provisioning secret не настроен. "
                "Установите WIDGET_INSTALL_PROVISION_KEY (или WIDGET_INSTALL_SIGNING_SECRET)."
            ),
        )
    return secret


def _require_widget_install_provision(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_widget_install_secret: str | None = Header(default=None, alias="X-Widget-Install-Secret"),
) -> None:
    presented = ""
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token:
            presented = token.strip()
    if not presented and x_widget_install_secret:
        presented = x_widget_install_secret.strip()
    if not presented:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется X-Widget-Install-Secret или Authorization Bearer.",
        )
    secret = _widget_install_provision_secret()
    if not hmac.compare_digest(presented, secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный install secret.")


def _decode_widget_install_token(token: str) -> tuple[dict, bytes]:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный install token.")
    parts = str(token).strip().split(".", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный install token формат.")
    payload_token, signature_token = parts
    secret = _widget_install_signing_secret()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Install token secret не настроен. Установите WIDGET_INSTALL_SIGNING_SECRET.",
        )
    actual_sig = _base64url_decode(signature_token, detail="Неверная подпись install token.")
    expected_sig = hmac.new(secret.encode("utf-8"), payload_token.encode("utf-8"), hashlib.sha256).digest()
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверная подпись install token.")
    payload_bytes = _base64url_decode(payload_token, detail="Неверный payload install token.")
    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный payload install token.") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный payload install token.")
    return payload, payload_bytes


def _encode_widget_install_token(
    partner_id: UUID,
    site_key: str,
    *,
    origin: str | None = None,
    ttl_seconds: int | None = None,
) -> tuple[str, datetime]:
    if not str(partner_id).strip():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Неверный partner_id для install token.",
        )
    if not site_key:
        raise HTTPException(status_code=400, detail="site_key обязателен для install token.")
    ttl = max(60, int(ttl_seconds or WIDGET_INSTALL_TOKEN_TTL_SECONDS))
    issued = datetime.now(timezone.utc)
    ttl = max(60, int(ttl_seconds or WIDGET_INSTALL_TOKEN_TTL_SECONDS))
    expires_at = issued + timedelta(seconds=ttl)
    payload = {
        "type": "widget_install",
        "partner_id": str(partner_id),
        "site_key": str(site_key),
        "origin": str(origin or "").strip(),
        "iat": int(issued.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    payload_token = _base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(
        _widget_install_signing_secret().encode("utf-8"),
        payload_token.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{payload_token}.{_base64url_encode(signature)}", expires_at


def _is_install_token_valid(
    request: Request,
    partner_id: UUID,
    site_key: str,
    install_token: str,
) -> bool:
    payload, _ = _decode_widget_install_token(install_token)
    try:
        expected_partner = str(partner_id)
        if str(payload.get("partner_id") or "").strip() != expected_partner:
            return False
        if payload.get("type") != "widget_install":
            return False
        if str(payload.get("site_key") or "").strip() != str(site_key).strip():
            return False
        exp_raw = payload.get("exp")
        exp = int(exp_raw) if str(exp_raw).strip() else 0
        if exp and exp < int(datetime.now(timezone.utc).timestamp()):
            return False
        request_origin = _extract_origin_host(request)
        token_origin = str(payload.get("origin") or "").strip().lower()
        if token_origin and request_origin and token_origin != request_origin:
            return False
        return True
    except Exception:
        return False


def _inspect_install_token_for_health(
    request: Request,
    partner_id: UUID,
    site_key: str,
    install_token: str,
) -> tuple[bool, str, str]:
    token = str(install_token or "").strip()
    normalized_site_key = str(site_key or "").strip()
    if not token:
        return False, "install_token_missing", "install_token не задан."
    try:
        payload, _ = _decode_widget_install_token(token)
    except HTTPException as exc:
        return False, "install_token_invalid", str(exc.detail)
    except Exception:
        return False, "install_token_invalid", "install_token недействителен."

    expected_partner = str(partner_id)
    if str(payload.get("partner_id") or "").strip() != expected_partner:
        return False, "install_token_partner_mismatch", "install_token выпущен для другого partner_id."
    if payload.get("type") != "widget_install":
        return False, "install_token_type_invalid", "install_token имеет неверный тип."
    if str(payload.get("site_key") or "").strip() != normalized_site_key:
        return False, "install_token_site_key_mismatch", "install_token не соответствует site_key."
    try:
        exp_raw = payload.get("exp")
        exp = int(exp_raw) if str(exp_raw).strip() else 0
    except Exception:
        exp = 0
    if exp and exp < int(datetime.now(timezone.utc).timestamp()):
        return False, "install_token_expired", "install_token просрочен."
    request_origin = _extract_origin_host(request)
    token_origin = str(payload.get("origin") or "").strip().lower()
    if token_origin and request_origin and token_origin != request_origin:
        return False, "install_token_origin_mismatch", "install_token не подходит для текущего origin."
    return True, "install_token_valid", "install_token валиден."


def _is_widget_context_authorized(
    request: Request,
    partner_id: UUID,
    site_key: str,
    install_token: str,
    *,
    strict: bool = False,
) -> None:
    if _is_widget_local_dev_preview_bypass_enabled(partner_id, bool(strict), request):
        return
    if strict:
        allowed_domains = _get_widget_partner_domain_allowlist(partner_id)
        request_host = _extract_origin_host(request)
        if request_host and allowed_domains and not any(
            _host_matches_pattern(request_host, pat) for pat in allowed_domains
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Origin не входит в allowlist этого партнёра.",
            )
        if not site_key:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Widget install site_key обязателен для этого партнёра.",
            )
        allowed_keys = _get_widget_partner_site_keys(partner_id)
        if allowed_keys and site_key not in allowed_keys:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="site_key не зарегистрирован для партнёра.",
            )
        if not install_token or not _is_install_token_valid(request, partner_id, site_key, install_token):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="install_token недействителен или просрочен.")
        return

    allowed_domains = _get_widget_partner_domain_allowlist(partner_id)
    request_host = _extract_origin_host(request)
    if request_host and allowed_domains and any(_host_matches_pattern(request_host, pat) for pat in allowed_domains):
        return
    if not site_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Widget install site_key обязателен для этого партнёра.",
        )
    allowed_keys = _get_widget_partner_site_keys(partner_id)
    if allowed_keys and site_key not in allowed_keys:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="site_key не зарегистрирован для партнёра.")
    if not install_token or not _is_install_token_valid(request, partner_id, site_key, install_token):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="install_token недействителен или просрочен.")


def _validate_widget_embed_contract_version(
    contract_version: str | None,
    *,
    strict: bool = False,
) -> str:
    provided = str(contract_version or "").strip()
    if not provided:
        if strict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"embed_contract_version обязателен в строгом режиме. "
                    f"Передайте значение из `MANYASHA_EMBED_SUPPORTED_CONTRACT_VERSIONS`."
                ),
            )
        provided = _default_supported_embed_contract_version()
    version = provided.strip()
    supported = _supported_embed_contract_versions()
    if version not in supported:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Неподдерживаемая версия embed-контракта: {version}. "
                f"Поддерживаются версии: {', '.join(supported)}."
            ),
        )
    return version



def _is_production_env() -> bool:
    return os.getenv("APP_ENV", "").strip().lower() in {"prod", "production"}


def _dev_loopback_origins() -> list[str]:
    ports = (5173, 5174, 4173)
    hosts = ("localhost", "127.0.0.1")
    origins: list[str] = []
    for host in hosts:
        for port in ports:
            origins.append(f"http://{host}:{port}")
    return origins


def _resolve_cors_origins() -> tuple[list[str], str | None]:
    frontend_url = (os.getenv("FRONTEND_URL") or "").strip()
    raw_env = os.getenv("CORS_ALLOW_ORIGINS")
    default_origins: list[str] = []
    if not _is_production_or_staging_env():
        default_origins.extend(_dev_loopback_origins())
    if frontend_url:
        default_origins.append(frontend_url)
    if raw_env is None:
        configured = list(default_origins)
    else:
        configured = _env_csv("CORS_ALLOW_ORIGINS", "")
    configured = [o for o in configured if o and o != "*"]
    deduped: list[str] = []
    seen: set[str] = set()
    for origin in configured:
        if origin in seen:
            continue
        seen.add(origin)
        deduped.append(origin)
    configured = deduped
    if _is_production_env() and not configured:
        print(
            "[SECURITY] CORS_ALLOW_ORIGINS не задан или содержит только '*'. "
            "В проде разрешён только явный белый список origin.",
            flush=True,
        )
    allow_null = _env_bool("CORS_ALLOW_NULL_ORIGIN", default=not _is_production_env())
    null_origin_regex = r"^null$" if allow_null else None
    return configured, null_origin_regex


CORS_ALLOW_ORIGINS, CORS_ALLOW_ORIGIN_REGEX = _resolve_cors_origins()

app = FastAPI(title="Manaya API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_origin_regex=CORS_ALLOW_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(rpg_router)
app.include_router(partner_router)

configure_storage_signer(LocalDevStorageSigner())


def _use_create_all_bootstrap() -> bool:
    """SQLAlchemy create_all только при явном флаге (prod полагается на Alembic)."""
    return os.getenv("MANAYA_USE_CREATE_ALL", "").strip().lower() in ("1", "true", "yes", "on")


@app.on_event("startup")
def startup() -> None:
    if _use_create_all_bootstrap():
        create_schema()


@app.middleware("http")
async def metrics_middleware(request, call_next):
    started_at = perf_counter()
    response = await call_next(request)
    REQUEST_LATENCY.labels(request.method, request.url.path).observe(perf_counter() - started_at)
    return response


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz")
def readyz() -> JSONResponse:
    checks = {
        "database": _readyz_check_database(),
        "redis": _readyz_check_redis(),
        "provider": _readyz_check_provider(),
    }
    is_ready = all(item.get("status") != "error" for item in checks.values())
    return JSONResponse(
        status_code=200 if is_ready else 503,
        content={
            "status": "ready" if is_ready else "not_ready",
            "checks": checks,
        },
    )


def _readyz_check_database() -> dict[str, str]:
    try:
        with db_engine.connect() as conn:
            conn.execute(sa_text("SELECT 1"))
        return {
            "status": "ok",
            "code": "database_ready",
            "message": "Database connection is ready.",
        }
    except Exception as exc:
        return {
            "status": "error",
            "code": "database_unavailable",
            "message": f"Database readiness check failed ({type(exc).__name__}).",
        }


def _readyz_check_redis() -> dict[str, str]:
    redis_url = os.getenv("REDIS_URL", "").strip()
    redis_required = bool(redis_url) or _is_production_or_staging_env()
    if not redis_required:
        return {
            "status": "ok",
            "code": "redis_optional",
            "message": "Redis is optional in this environment.",
        }
    if not redis_url:
        return {
            "status": "error",
            "code": "redis_url_missing",
            "message": "REDIS_URL is required in staging/production.",
        }

    client = _redis_client
    if client is None:
        try:
            import redis as redis_lib

            client = redis_lib.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
        except Exception as exc:
            return {
                "status": "error",
                "code": "redis_client_unavailable",
                "message": f"Redis client is not available ({type(exc).__name__}).",
            }

    try:
        client.ping()
        return {
            "status": "ok",
            "code": "redis_ready",
            "message": "Redis connection is ready.",
        }
    except Exception as exc:
        return {
            "status": "error",
            "code": "redis_unavailable",
            "message": f"Redis readiness check failed ({type(exc).__name__}).",
        }


def _readyz_check_provider() -> dict[str, str]:
    provider = os.getenv("MANYASHA_LLM_PROVIDER", MANYASHA_LLM_PROVIDER).strip().lower() or "navy"
    if provider not in {"navy", "ollama", "gemini", "auto"}:
        return {
            "status": "error",
            "code": "provider_invalid",
            "message": "MANYASHA_LLM_PROVIDER must be one of: navy, ollama, gemini, auto.",
        }

    if provider == "navy":
        if os.getenv("NAVY_API_KEY", "").strip():
            return {
                "status": "ok",
                "code": "provider_ready",
                "message": "Navy provider config is ready.",
            }
        if _is_production_or_staging_env():
            return {
                "status": "error",
                "code": "navy_api_key_missing",
                "message": "NAVY_API_KEY is required when MANYASHA_LLM_PROVIDER=navy in staging/production.",
            }
        return {
            "status": "ok",
            "code": "provider_optional_fallback",
            "message": "Navy key is absent, but provider fallback is allowed in this environment.",
        }

    return {
        "status": "ok",
        "code": "provider_ready",
        "message": f"{provider} provider config is ready.",
    }


@app.get("/metrics")
def metrics() -> PlainTextResponse:
    return PlainTextResponse(generate_latest().decode("utf-8"), media_type="text/plain; version=0.0.4")


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        return ""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return ""
    return token.strip()


def _is_allowlisted_ip(host: str, allowlist: list[str]) -> bool:
    if not host or host == "unknown":
        return False
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return False
    for entry in allowlist:
        raw = entry.strip()
        if not raw:
            continue
        try:
            net = ipaddress.ip_network(raw, strict=False)
            if ip in net:
                return True
        except ValueError:
            try:
                if ip == ipaddress.ip_address(raw):
                    return True
            except ValueError:
                continue
    return False


def require_internal_metrics_auth(
    request: Request,
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_service_token: str | None = Header(default=None, alias="X-Service-Token"),
) -> None:
    configured_token = (os.getenv("INTERNAL_METRICS_SERVICE_TOKEN") or "").strip()
    allowlist = _env_csv("INTERNAL_METRICS_IP_ALLOWLIST", "")
    client_host = _client_ip(request)

    token_ok = False
    presented = (x_service_token or "").strip() or _extract_bearer_token(authorization)
    if configured_token and presented:
        token_ok = hmac.compare_digest(configured_token, presented)

    ip_ok = _is_allowlisted_ip(client_host, allowlist) if allowlist else False

    if not configured_token and not allowlist:
        if not _is_production_env() and client_host in {"127.0.0.1", "::1"}:
            return
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Internal metrics auth не настроен. Установите INTERNAL_METRICS_SERVICE_TOKEN "
                "или INTERNAL_METRICS_IP_ALLOWLIST."
            ),
        )

    if token_ok or ip_ok:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступ к internal metrics запрещён.")


@app.post("/internal/metrics/frontend")
def report_frontend_metrics(
    partner_id: UUID,
    ttfm_seconds: float,
    fps: float,
    _: None = Depends(require_internal_metrics_auth),
) -> dict[str, str]:
    FRONTEND_TTFM_SECONDS.labels(str(partner_id)).set(ttfm_seconds)
    FRONTEND_FPS.labels(str(partner_id)).set(fps)
    return {"status": "accepted"}


@app.post("/internal/metrics/llm-timeout")
def report_llm_timeout(_: None = Depends(require_internal_metrics_auth)) -> dict[str, str]:
    LLM_TIMEOUT_TOTAL.inc()
    return {"status": "accepted"}


@app.websocket("/ws/partner/{partner_id}")
async def partner_websocket(websocket: WebSocket, partner_id: UUID) -> None:
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_text()
            await websocket.send_json({"partner_id": str(partner_id), "echo": message})
    except WebSocketDisconnect:
        return

# Health check endpoint
@app.get("/health")
async def health_check():
    """Проверка здоровья API"""
    return {
        "status": "healthy",
        "service": "manaya-api",
        "version": "1.0.0"
    }


# ──────────────────────────────────────────────
# Маняша Chat — Navy (основной) + Ollama/Gemini (fallback)
# ──────────────────────────────────────────────

# Локально: http://localhost:11434  |  в Docker: http://host.docker.internal:11434
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
_chat_limiter = InMemoryRateLimiter()
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
MANYASHA_LLM_PROVIDER = os.getenv("MANYASHA_LLM_PROVIDER", "navy").strip().lower()
NAVY_API_KEY = os.getenv("NAVY_API_KEY", "").strip()
NAVY_API_BASE_URL = os.getenv("NAVY_API_BASE_URL", "https://api.navy/v1").strip() or "https://api.navy/v1"
NAVY_MODEL = os.getenv("NAVY_MODEL", "gpt-5").strip() or "gpt-5"
MANYASHA_DEMO_FAST_MODE = _env_bool(
    "MANYASHA_DEMO_FAST_MODE",
    default=os.getenv("APP_ENV", "").strip().lower() in {"dev", "development", "test", "demo", "local"},
)
MANYASHA_CHAT_LLM_TIMEOUT_SECONDS = max(
    2.0,
    min(
        25.0,
        _env_float(
            "MANYASHA_CHAT_LLM_TIMEOUT_SECONDS",
            4.2 if MANYASHA_DEMO_FAST_MODE else 12.0,
        ),
    ),
)

MANYASHA_SYSTEM_PROMPT = """Ты — Маняша, помощница по банкротству физических лиц и смежным юридическим вопросам (долги, приставы, исполнительное производство, МФЦ, суды — только в контексте банкротства и списания долгов).

ВАЖНО: Только русский язык.

ГЛАВНЫЕ ПРАВИЛА СТИЛЯ (обязательно):
- Общение на «вы». Спокойный, уверенный, по-человечески понятный тон.
- Не использовать ласкательные обращения и «сюсюканье» (без «солнышко», «зайка» и т.п.).
- Всегда говорить от первого лица в женском роде, когда речь о себе (например: «я проверила», «я подготовила», «я уточнила»). Не использовать средний род и мужской род для самореференса.
- Не быть навязчиво продающей. Консультацию предлагать только в сложных/рискованных случаях.
- Сначала отвечать по существу на ПОСЛЕДНЕЕ сообщение пользователя, потом давать следующий шаг.
- Для первого короткого вопроса не уходить в лекцию: показать, что вы поняли тему, дать 1 безопасный ориентир и задать 1 самый важный уточняющий вопрос.
- На короткие starters вроде «У меня долги», «Приставы списывают», «МФЦ или суд?» отвечать как на реальные вводные, а не общим шаблоном.
- Не игнорировать конкретные детали из последнего сообщения (сумма, приставы, МФЦ, суд, документы, квартира, сроки, коллекторы, кредиты/микрозаймы).
- Не повторять один и тот же шаблон вступления в каждом ответе; формулировки нужно естественно варьировать.
- Не задавать вопросы, на которые пользователь уже прямо ответил в последнем сообщении.
- Если вопрос не по теме долгов/банкротства — коротко признать ограничение и мягко вернуть диалог в зону долгов и банкротства.
- Ответ обычно 2–4 предложения, без воды.
- Если вопрос юридически сложный: отвечать профессионально и точно, но понятным языком.
- Всегда завершать ответ одним уместным уточняющим вопросом, чтобы продолжить диалог.
- Если вопрос неясный: сначала задать один уточняющий вопрос.
- Не читать и не возвращать служебный мусор, markdown-маркеры, технические пояснения.

ФОРМАТ КАЖДОГО ОТВЕТА (строго):
1) Текст ответа (2–4 предложения на русском).
2) Пустая строка.
3) Если случай сложный (долг 500+ тыс., приставы, арест, исполнительный лист, субсидиарка, уголовка, коллекторы угрожают) — отдельной строкой: [КОНСУЛЬТАЦИЯ]
4) Отдельной строкой ровно один маркер: [НАСТР:ХОРОШО] или [НАСТР:СОЧУВСТВИЕ] или [НАСТР:НЕЯСНО] или [НАСТР:МОТИВАЦИЯ] или [НАСТР:НЕЙТРАЛЬНО]

МАРКЕРЫ — это служебные коды. Не объясняй их и не комментируй.

Выбор маркера:
- [НАСТР:ХОРОШО] — позитивные новости, ситуация решаема.
- [НАСТР:СОЧУВСТВИЕ] — тяжёлая ситуация.
- [НАСТР:НЕЯСНО] — вопрос непонятен, нужно уточнение.
- [НАСТР:МОТИВАЦИЯ] — человек сомневается или боится.
- [НАСТР:НЕЙТРАЛЬНО] — обычный рабочий ответ.

Справка по фактам (используй дозированно, 1–2 факта):
- Судебное банкротство чаще при крупном долге (ориентир от ~500 тыс. руб.), сроки и расходы зависят от дела и региона.
- Внесудебный маршрут через МФЦ — отдельные условия по сумме и срокам.
- Часть требований не подлежит списанию (например алименты, отдельные виды вреда/штрафов).
- Нормы права при необходимости: ст. … ФЗ №127.
"""

_MAT_PATTERNS = re.compile(
    r"\b(бля|блять|сука|пизд|хуй|хуе|хуё|ебат|ёбан|нахуй|пох|залуп|муда|гандон|пидор|шлюх|дерьм)\w*\b",
    re.IGNORECASE,
)

_MANYASHA_MAT_REPLIES = (
    "Эй, не стоит злиться — я же на твоей стороне. Давай без мата, спокойно сформулируй вопрос по долгам или банкротству, и разберёмся вместе 💛",
    "Понимаю, что бывает бесит, но давай по-доброму. Перефразируй без грубых слов — я отвечу по теме долгов и процедуры 🌿",
    "Ой, давай без этого. Я приличная девушка и хочу помочь — напиши нормально, что случилось с долгами или приставами, и поговорим спокойно 😊",
    "Не кипятись так — от злости вопрос не станет яснее. Скажи по-человечески, что тревожит по долгам, я выслушаю и подскажу 🕊️",
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_WIDGET_MESSAGE_LEN)
    history: list[ChatMessage] = Field(default_factory=list)
    partner_id: UUID | None = None
    user_id: UUID | None = None
    dialog_session_id: UUID | None = None
    embed_contract_version: str | None = None
    captcha_token: str | None = None
    profile: dict = Field(default_factory=dict)
    trigger_source: str | None = None
    experiment_variants: dict = Field(default_factory=dict)


_CONSULT_MARKER = "[КОНСУЛЬТАЦИЯ]"

# Ключевые слова в вопросе пользователя — фаллбэк когда LLM не поставил маркер
_HEAVY_KEYWORDS = [
    "приставы", "пристав", "арест", "арестовали", "арестован",
    "исполнительный лист", "ип лист", "ипотек", "ипотека",
    "субсидиарн", "уголовн", "мошенничество",
    "500 тыс", "500т", "миллион", "млн",
    "долг больше", "долг свыше", "задолженность больше",
    "коллектор", "коллекторы", "звонят", "угрожают",
    "банкротство срочно", "срочно банкротство",
    "алименты долг", "долг по алиментам",
    "имущество забрали", "счёт заблокировали", "счет заблокировали",
    "зарплата арестована", "карту заблокировали",
]

_MOOD_MARKERS = {
    "[НАСТР:ХОРОШО]":      "good",
    "[НАСТР:СОЧУВСТВИЕ]":  "empathy",
    "[НАСТР:НЕЯСНО]":      "confused",
    "[НАСТР:МОТИВАЦИЯ]":   "motivate",
    "[НАСТР:НЕЙТРАЛЬНО]":  "neutral",
}


class AppUser(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "app"}

    user_id: Mapped[UUID] = mapped_column(PortableUUID(), primary_key=True, default=uuid4)
    partner_id: Mapped[UUID] = mapped_column(PortableUUID(), nullable=False, index=True)
    user_public_id: Mapped[UUID] = mapped_column(PortableUUID(), nullable=False, default=uuid4, unique=True)
    external_subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nickname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    locale: Mapped[str] = mapped_column(String(32), nullable=False, default="ru-RU")
    timezone_name: Mapped[str] = mapped_column("timezone", String(64), nullable=False, default="UTC")
    pii_email_hash: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    pii_phone_hash: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class UserPersonalData(Base):
    __tablename__ = "user_personal_data"
    __table_args__ = {"schema": "app"}

    user_id: Mapped[UUID] = mapped_column(PortableUUID(), primary_key=True)
    partner_id: Mapped[UUID] = mapped_column(PortableUUID(), nullable=False, index=True)
    email_enc: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    phone_enc: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    full_name_enc: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    notes_enc: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    encryption_key_id: Mapped[str] = mapped_column(String(128), nullable=False, default="local-aesgcm-v1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class DialogSession(Base):
    __tablename__ = "dialog_sessions"
    __table_args__ = {"schema": "app"}

    session_id: Mapped[UUID] = mapped_column(PortableUUID(), primary_key=True, default=uuid4)
    partner_id: Mapped[UUID] = mapped_column(PortableUUID(), nullable=False, index=True)
    user_id: Mapped[UUID] = mapped_column(PortableUUID(), nullable=False, index=True)
    user_public_id_snapshot: Mapped[UUID] = mapped_column(PortableUUID(), nullable=False)
    channel: Mapped[str] = mapped_column(String(32), nullable=False, default="chat")
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    meta_json: Mapped[dict] = mapped_column("metadata", SAJSON, nullable=False, default=dict)


class DialogMessage(Base):
    __tablename__ = "dialog_messages"
    __table_args__ = {"schema": "app"}

    message_id: Mapped[UUID] = mapped_column(PortableUUID(), primary_key=True, default=uuid4)
    partner_id: Mapped[UUID] = mapped_column(PortableUUID(), nullable=False, index=True)
    session_id: Mapped[UUID] = mapped_column(PortableUUID(), nullable=False, index=True)
    user_id: Mapped[UUID] = mapped_column(PortableUUID(), nullable=False, index=True)
    seq_no: Mapped[int] = mapped_column(Integer, nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    prompt_text_enc: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    content_sha256: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    token_count_input: Mapped[int | None] = mapped_column(Integer, nullable=True)
    token_count_output: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    meta_json: Mapped[dict] = mapped_column("metadata", SAJSON, nullable=False, default=dict)


class LLMAuditLog(Base):
    __tablename__ = "llm_audit_log"
    __table_args__ = {"schema": "app"}

    audit_log_id: Mapped[UUID] = mapped_column(PortableUUID(), primary_key=True, default=uuid4)
    partner_id: Mapped[UUID] = mapped_column(PortableUUID(), nullable=False, index=True)
    user_id: Mapped[UUID] = mapped_column(PortableUUID(), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    prompt_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    response_len: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="ok")


class ChatResponse(BaseModel):
    reply: str
    speech_reply: str | None = None
    suggest_consultation: bool = False
    mood: str = "neutral"


MANYASHA_VOICE = "ru-RU-SvetlanaNeural"
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "").strip()
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "").strip()
ELEVENLABS_MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2").strip()
MANYASHA_TTS_PROVIDER = os.getenv("MANYASHA_TTS_PROVIDER", "auto").strip().lower()  # auto|xtts|eleven|edge
MANYASHA_SPEAKER_WAV = os.getenv("MANYASHA_SPEAKER_WAV", "/app/assets/voice/marusya_reference.mp3").strip()
MANYASHA_XTTS_MODEL = os.getenv("MANYASHA_XTTS_MODEL", "tts_models/multilingual/multi-dataset/xtts_v2").strip()
TTS_CACHE_TTL = int(os.getenv("MANYASHA_TTS_CACHE_TTL", "86400"))


class TTSRequest(BaseModel):
    text: str


class UserCreateRequest(BaseModel):
    partner_id: UUID
    external_subject: str | None = None
    nickname: str | None = None
    locale: str = "ru-RU"
    timezone: str = "UTC"
    email: str | None = None
    phone: str | None = None
    full_name: str | None = None


class WidgetInstallTokenRequest(BaseModel):
    partner_id: str = "default"
    site_key: str = Field(min_length=1, max_length=255)
    origin: str = ""
    ttl_seconds: int | None = None


class WidgetInstallTokenResponse(BaseModel):
    partner_id: UUID
    site_key: str
    token: str
    expires_at: datetime
    ttl_seconds: int


class UserResponse(BaseModel):
    user_id: UUID
    partner_id: UUID
    user_public_id: UUID
    external_subject: str | None
    nickname: str | None
    status: str
    locale: str
    timezone: str
    created_at: datetime


class UserPersonalDataUpsertRequest(BaseModel):
    partner_id: UUID
    email: str | None = None
    phone: str | None = None
    full_name: str | None = None
    notes: str | None = None


class DialogSessionCreateRequest(BaseModel):
    partner_id: UUID
    user_id: UUID
    channel: str = "chat"
    title: str | None = None
    metadata: dict = {}


class DialogMessageCreateRequest(BaseModel):
    partner_id: UUID
    user_id: UUID
    role: str
    content: str
    token_count_input: int | None = None
    token_count_output: int | None = None
    metadata: dict = {}


def _hash_pii(value: str | None) -> bytes | None:
    if not value:
        return None
    normalized = value.strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).digest()


def _require_encryption_key() -> bytes:
    raw_key = (os.getenv("ENCRYPTION_KEY") or "").strip()
    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ENCRYPTION_KEY не настроен. Шифрование персональных данных недоступно.",
        )
    return hashlib.sha256(raw_key.encode("utf-8")).digest()


def _allow_legacy_plaintext_pii() -> bool:
    return os.getenv("ALLOW_LEGACY_PLAINTEXT_PII", "false").strip().lower() in {"1", "true", "yes", "on"}


class WidgetAuthContext(BaseModel):
    partner_id: UUID
    session_id: str
    expires_at: datetime


def _base64url_encode(raw_value: bytes) -> str:
    return base64.urlsafe_b64encode(raw_value).decode("ascii").rstrip("=")


def _base64url_decode(raw_value: str, *, detail: str) -> bytes:
    try:
        return base64.urlsafe_b64decode(raw_value + "=" * (-len(raw_value) % 4))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail) from exc


def _normalize_widget_session_id(raw_value: str | None, *, detail: str = "Некорректный session_id.") -> str:
    sid = str(raw_value or "").strip()
    if not sid:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)
    if len(sid) > 64:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)
    if not re.fullmatch(r"[A-Za-z0-9._:-]{1,64}", sid):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)
    return sid


def _widget_auth_secret() -> str:
    secret = (os.getenv("WIDGET_AUTH_SECRET") or "").strip() or (os.getenv("JWT_SECRET") or "").strip()
    if secret:
        return secret
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Widget auth secret не настроен. Установите WIDGET_AUTH_SECRET или JWT_SECRET.",
    )


def _encode_widget_token(partner_id: UUID, session_id: str, issued_at: datetime | None = None) -> tuple[str, datetime]:
    issued = issued_at or datetime.now(timezone.utc)
    expires_at = issued + timedelta(seconds=max(60, WIDGET_AUTH_TTL_SECONDS))
    payload = {
        "type": "widget",
        "partner_id": str(partner_id),
        "sid": _normalize_widget_session_id(session_id),
        "iat": int(issued.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    payload_token = _base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(_widget_auth_secret().encode("utf-8"), payload_token.encode("utf-8"), hashlib.sha256).digest()
    return f"{payload_token}.{_base64url_encode(signature)}", expires_at


def _decode_widget_token(token: str) -> WidgetAuthContext:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Отсутствует widget token.")
    try:
        payload_token, signature_token = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный формат widget token.") from exc

    payload_bytes = _base64url_decode(payload_token, detail="Некорректный payload widget token.")
    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный JSON payload widget token.") from exc
    if not isinstance(payload, dict) or str(payload.get("type") or "") != "widget":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный тип widget token.")

    expected_sig = hmac.new(_widget_auth_secret().encode("utf-8"), payload_token.encode("utf-8"), hashlib.sha256).digest()
    actual_sig = _base64url_decode(signature_token, detail="Некорректная подпись widget token.")
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Подпись widget token не прошла проверку.")

    try:
        expires_at_epoch = int(payload.get("exp") or 0)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный exp в widget token.") from exc
    now_epoch = int(datetime.now(timezone.utc).timestamp())
    if expires_at_epoch <= now_epoch:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Widget token истёк.")

    try:
        partner_id = UUID(str(payload.get("partner_id") or ""))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный partner_id в widget token.") from exc

    session_id = _normalize_widget_session_id(payload.get("sid"), detail="Некорректный sid в widget token.")
    expires_at = datetime.fromtimestamp(expires_at_epoch, tz=timezone.utc)
    return WidgetAuthContext(partner_id=partner_id, session_id=session_id, expires_at=expires_at)


def require_widget_auth(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_widget_token: str | None = Header(default=None, alias="X-Widget-Token"),
) -> WidgetAuthContext:
    token = ""
    if authorization:
        scheme, _, raw_token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not raw_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header должен использовать Bearer widget token.",
            )
        token = raw_token.strip()
    elif x_widget_token:
        token = x_widget_token.strip()
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется widget token.")
    return _decode_widget_token(token)


def _enforce_widget_session(auth: WidgetAuthContext, session_id: str) -> None:
    normalized = _normalize_widget_session_id(session_id)
    if normalized != auth.session_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="session_id не совпадает с widget token.")


def _enforce_widget_partner(auth: WidgetAuthContext, partner_id: UUID | None) -> UUID:
    if partner_id is None:
        return auth.partner_id
    if partner_id != auth.partner_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="partner_id не совпадает с widget token.")
    return partner_id


def _payload_size_bytes(value: object) -> int:
    try:
        serialized = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    except Exception:
        serialized = str(value)
    return len(serialized.encode("utf-8"))


def _enforce_payload_limit(value: object, *, max_bytes: int, detail: str) -> None:
    if _payload_size_bytes(value) > max_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=detail)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client and request.client.host else "unknown"


def _rate_limit_widget_request(
    request: Request,
    *,
    bucket: str,
    limit: int,
    window_seconds: int,
) -> None:
    key = f"{bucket}:{_client_ip(request)}"
    _chat_limiter.hit(key, limit=limit, window_seconds=window_seconds)


def _verify_captcha_token(captcha_token: str, remote_ip: str = "") -> bool:
    verify_url = (os.getenv("WIDGET_CAPTCHA_VERIFY_URL") or "").strip() or "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    secret = (os.getenv("WIDGET_CAPTCHA_SECRET") or "").strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Captcha включена, но WIDGET_CAPTCHA_SECRET не настроен.",
        )
    payload = {
        "secret": secret,
        "response": captcha_token,
    }
    if remote_ip and remote_ip != "unknown":
        payload["remoteip"] = remote_ip
    body = urllib_parse.urlencode(payload).encode("utf-8")
    req = urllib_request.Request(
        verify_url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=6) as resp:
            raw = resp.read().decode("utf-8")
        parsed = json.loads(raw)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Captcha verification service недоступен.",
        ) from exc
    return bool(parsed.get("success"))


def _enforce_captcha_if_required(
    request: Request,
    captcha_token: str | None,
) -> None:
    required = _env_bool("WIDGET_CAPTCHA_REQUIRED", default=_is_production_env())
    token = str(captcha_token or "").strip()
    if not required and not token:
        return
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Требуется captcha token.")
    if not _verify_captcha_token(token, remote_ip=_client_ip(request)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Captcha verification не пройдена.")


def _encrypt_text(value: str | None) -> bytes | None:
    if not value:
        return None
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Пакет cryptography не установлен. Шифрование персональных данных невозможно.",
        ) from exc

    key = _require_encryption_key()
    try:
        nonce = secrets.token_bytes(12)
        cipher = AESGCM(key)
        enc = cipher.encrypt(nonce, value.encode("utf-8"), None)
        return nonce + enc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось зашифровать персональные данные.",
        ) from exc


def _decrypt_text(blob: bytes | None) -> str | None:
    """Расшифровка payload из _encrypt_text (nonce 12 байт + ciphertext) или сырой UTF-8."""
    if not blob:
        return None
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Пакет cryptography не установлен. Дешифровка персональных данных невозможна.",
        ) from exc

    if len(blob) >= 12:
        try:
            key = _require_encryption_key()
            nonce, ciphertext = blob[:12], blob[12:]
            if ciphertext:
                cipher = AESGCM(key)
                return cipher.decrypt(nonce, ciphertext, None).decode("utf-8")
        except HTTPException:
            raise
        except Exception:
            pass

    if not _allow_legacy_plaintext_pii():
        return None
    try:
        return blob.decode("utf-8")
    except Exception:
        return None


def _verify_widget_dialog_session(
    db: Session,
    partner_id: UUID,
    user_id: UUID,
    dialog_session_id: UUID,
    widget_local_session_id: str,
) -> DialogSession | None:
    """Проверка, что диалог принадлежит партнёру/пользователю и привязан к виджет-sid."""
    _apply_rls_context(db, partner_id, user_id)
    row = db.get(DialogSession, dialog_session_id)
    if not row or row.partner_id != partner_id or row.user_id != user_id:
        return None
    meta = row.meta_json or {}
    if meta.get("widget_local_session") != widget_local_session_id:
        return None
    return row


def _dialog_transcript_as_chat_messages(
    db: Session,
    partner_id: UUID,
    dialog_session_id: UUID,
    limit: int = 50,
) -> list[dict]:
    """Сообщения для виджета: role + plaintext content."""
    _apply_rls_context(db, partner_id)
    items = (
        db.query(DialogMessage)
        .filter(
            DialogMessage.session_id == dialog_session_id,
            DialogMessage.partner_id == partner_id,
        )
        .order_by(DialogMessage.seq_no.asc())
        .limit(max(1, min(limit, 200)))
        .all()
    )
    out: list[dict] = []
    for m in items:
        role = (m.role or "").strip().lower()
        if role not in ("user", "assistant"):
            continue
        content = (_decrypt_text(m.prompt_text_enc) or "").strip()
        if not content:
            continue
        # В истории чата фронт ждёт assistant; в БД роль assistant
        chat_role = "assistant" if role == "assistant" else "user"
        out.append({"role": chat_role, "content": content})
    return out


def _replace_dialog_messages_from_chat_snapshot(
    db: Session,
    partner_id: UUID,
    user_id: UUID,
    dialog_session_id: UUID,
    messages: list[dict],
) -> None:
    """Полная замена сообщений сессии снимком из виджета (последние N пар user/assistant)."""
    _apply_rls_context(db, partner_id, user_id)
    normalized: list[tuple[str, str]] = []
    for raw in messages:
        if not isinstance(raw, dict):
            continue
        r = str(raw.get("role", "")).strip().lower()
        c = str(raw.get("content", "")).strip()
        if not c:
            continue
        if r in ("user", "assistant"):
            normalized.append((r, c))
        elif r in ("bot", "model"):
            normalized.append(("assistant", c))
    tail = normalized[-30:]
    db.query(DialogMessage).filter(
        DialogMessage.session_id == dialog_session_id,
        DialogMessage.partner_id == partner_id,
    ).delete(synchronize_session=False)
    row = db.get(DialogSession, dialog_session_id)
    if not row:
        return
    for i, (role, content) in enumerate(tail, start=1):
        enc = _encrypt_text(content) or b""
        h = hashlib.sha256(content.encode("utf-8")).digest()
        db.add(
            DialogMessage(
                partner_id=partner_id,
                session_id=dialog_session_id,
                user_id=user_id,
                seq_no=i,
                role=role[:16],
                prompt_text_enc=enc,
                content_sha256=h,
                meta_json={"source": "widget_chat_session_sync"},
            )
        )
    row.updated_at = datetime.now(timezone.utc)


def _apply_rls_context(db: Session, partner_id: UUID, user_id: UUID | None = None) -> None:
    try:
        dialect = str(getattr(getattr(db, "bind", None), "dialect", None).name or "").lower()
    except Exception:
        dialect = ""
    if dialect and "postgres" not in dialect:
        # Локальные SQLite/dev окружения не поддерживают set_config для RLS.
        return
    db.execute(sa_text("select set_config('app.current_partner_id', :partner_id, true)"), {"partner_id": str(partner_id)})
    if user_id is not None:
        db.execute(sa_text("select set_config('app.current_user_id', :user_id, true)"), {"user_id": str(user_id)})


def _refresh_after_commit(db: Session, row: object) -> None:
    try:
        dialect = str(getattr(getattr(db, "bind", None), "dialect", None).name or "").lower()
    except Exception:
        dialect = ""
    if dialect == "sqlite":
        return
    db.refresh(row)


def _persist_manyasha_dialog_turn(
    db: Session,
    partner_id: UUID,
    user_id: UUID,
    dialog_session_id: UUID,
    user_message: str,
    assistant_reply: str,
) -> None:
    _apply_rls_context(db, partner_id, user_id)
    row = db.get(DialogSession, dialog_session_id)
    if not row or row.partner_id != partner_id or row.user_id != user_id:
        return
    last = (
        db.query(DialogMessage)
        .filter(DialogMessage.session_id == dialog_session_id)
        .order_by(DialogMessage.seq_no.desc())
        .first()
    )
    base = last.seq_no if last else 0
    pairs: tuple[tuple[str, str], ...] = (("user", user_message), ("assistant", assistant_reply))
    for i, (role, content) in enumerate(pairs):
        seq_no = base + i + 1
        enc_content = _encrypt_text(content) or b""
        content_hash = hashlib.sha256(content.encode("utf-8")).digest()
        db.add(
            DialogMessage(
                partner_id=partner_id,
                session_id=dialog_session_id,
                user_id=user_id,
                seq_no=seq_no,
                role=role[:16],
                prompt_text_enc=enc_content,
                content_sha256=content_hash,
                meta_json={"source": "manyasha_widget"},
            )
        )
    row.updated_at = datetime.now(timezone.utc)


@app.post("/api/tts")
async def tts_endpoint(request: Request, req: TTSRequest) -> StreamingResponse:
    _chat_limiter.hit(request.client.host if request.client else "unknown", limit=30, window_seconds=60)
    text = req.text.strip()
    text = _prepare_tts_text(text)
    if not text:
        return StreamingResponse(iter([b""]), media_type="audio/mpeg")
    cache_key = "manyasha:tts:" + hashlib.sha256(text.encode("utf-8")).hexdigest()
    if _redis_client:
        try:
            cached = _redis_client.get(cache_key)
            if cached:
                cbytes = base64.b64decode(cached)
                return StreamingResponse(io.BytesIO(cbytes), media_type=_detect_audio_mime(cbytes))
        except Exception:
            pass
    try:
        audio = await _synthesize_tts_audio(text)
        if not audio:
            return StreamingResponse(iter([b""]), media_type="audio/mpeg")
        if _redis_client:
            try:
                _redis_client.setex(cache_key, TTS_CACHE_TTL, base64.b64encode(audio).decode("ascii"))
            except Exception:
                pass
        return StreamingResponse(io.BytesIO(audio), media_type=_detect_audio_mime(audio))
    except Exception as exc:
        print(f"[TTS] Error: {exc}", flush=True)
        return StreamingResponse(iter([b""]), media_type="audio/mpeg")


def _prepare_tts_text(text: str) -> str:
    """Чистка текста для TTS: убирает служебные символы, markdown и «ломающие» озвучку паттерны."""
    cleaned = text or ""
    # Markdown/служебные маркеры
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"`{1,3}", "", cleaned)
    cleaned = re.sub(r"\[?\s*КОНСУЛЬТАЦИЯ\s*\]?", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[?\s*НАСТР\s*:\s*[А-ЯЁA-Z_]+\s*\]?", "", cleaned, flags=re.IGNORECASE)
    # Заголовки/списки markdown: #, -, *, • в начале строк
    cleaned = re.sub(r"(?m)^\s*#{1,6}\s*", "", cleaned)
    cleaned = re.sub(r"(?m)^\s*[-*•]+\s+", "", cleaned)
    cleaned = re.sub(r"(?m)^\s*\d+\.\s+", "", cleaned)
    # URL не озвучиваем
    cleaned = re.sub(r"https?://\S+", "", cleaned, flags=re.IGNORECASE)
    # Символы, которые часто «заикаются» в TTS
    cleaned = cleaned.replace("№", " номер ")
    cleaned = re.sub(r"[#_~|]+", " ", cleaned)
    cleaned = re.sub(r"\s[-–—]\s", ", ", cleaned)
    cleaned = re.sub(r"[;:]{2,}", ".", cleaned)
    cleaned = re.sub(r"[!?.,]{2,}", ".", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:800]


def _detect_audio_mime(audio: bytes) -> str:
    if audio[:4] == b"RIFF":
        return "audio/wav"
    return "audio/mpeg"


async def _synthesize_tts_audio(text: str) -> bytes | None:
    provider = MANYASHA_TTS_PROVIDER
    if provider == "xtts":
        return _xtts_tts(text) or await _edge_tts_bytes(text)
    if provider == "eleven":
        return _elevenlabs_tts(text) or await _edge_tts_bytes(text)
    if provider == "edge":
        return await _edge_tts_bytes(text)
    # auto: локальный клонированный голос -> eleven -> edge
    return _xtts_tts(text) or _elevenlabs_tts(text) or await _edge_tts_bytes(text)


def _elevenlabs_tts(text: str) -> bytes | None:
    """Синтез через ElevenLabs, если заданы ключ и voice id."""
    if not ELEVENLABS_API_KEY or not ELEVENLABS_VOICE_ID:
        return None
    try:
        url = (
            "https://api.elevenlabs.io/v1/text-to-speech/"
            + urllib_parse.quote(ELEVENLABS_VOICE_ID)
            + "/stream?optimize_streaming_latency=2&output_format=mp3_44100_128"
        )
        payload = json.dumps(
            {
                "text": text,
                "model_id": ELEVENLABS_MODEL_ID,
                "voice_settings": {
                    "stability": 0.72,
                    "similarity_boost": 0.9,
                    "style": 0.2,
                    "use_speaker_boost": True,
                },
            }
        ).encode("utf-8")
        req = urllib_request.Request(
            url=url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
                "xi-api-key": ELEVENLABS_API_KEY,
            },
            method="POST",
        )
        with urllib_request.urlopen(req, timeout=30) as resp:
            audio = resp.read()
        return audio if audio and len(audio) > 128 else None
    except Exception as exc:
        print(f"[TTS] ElevenLabs error: {exc}", flush=True)
        return None


async def _edge_tts_bytes(text: str) -> bytes:
    """Fallback TTS через edge-tts."""
    import edge_tts  # lazy import — не ломает старт если пакет не установлен

    communicate = edge_tts.Communicate(text, MANYASHA_VOICE)
    buf = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    return buf.getvalue()


_xtts_model = None


def _xtts_tts(text: str) -> bytes | None:
    """Локальный TTS voice clone через Coqui XTTS и референс-аудио."""
    global _xtts_model
    if not MANYASHA_SPEAKER_WAV or not os.path.exists(MANYASHA_SPEAKER_WAV):
        return None
    try:
        if _xtts_model is None:
            from TTS.api import TTS

            _xtts_model = TTS(MANYASHA_XTTS_MODEL)
        wav = _xtts_model.tts(text=text, speaker_wav=MANYASHA_SPEAKER_WAV, language="ru")
        if not wav:
            return None
        return _wav_pcm16_bytes(wav, sample_rate=24000)
    except Exception as exc:
        print(f"[TTS] XTTS error: {exc}", flush=True)
        return None


def _wav_pcm16_bytes(samples: list[float], sample_rate: int = 24000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        pcm = bytearray()
        for x in samples:
            v = max(-1.0, min(1.0, float(x)))
            i = int(v * 32767.0)
            pcm.extend(int(i).to_bytes(2, byteorder="little", signed=True))
        wf.writeframes(bytes(pcm))
    return buf.getvalue()


def _parse_markers(text: str) -> tuple[str, bool, str]:
    """Вырезает маркеры [КОНСУЛЬТАЦИЯ] и [НАСТР:*] и возвращает (чистый текст, флаг, mood)."""
    suggest = _CONSULT_MARKER in text
    clean = text.replace(_CONSULT_MARKER, "")
    mood = "neutral"
    for marker, mood_val in _MOOD_MARKERS.items():
        if marker in clean:
            mood = mood_val
            clean = clean.replace(marker, "")
    # Маркеры без скобок (qwen часто пишет «НАСТР: СОЧУВСТВИЕ» без [ ])
    _bare_mood = {
        k.strip("[]").split(":")[1]: v for k, v in _MOOD_MARKERS.items()
    }  # {"ХОРОШО": "good", "СОЧУВСТВИЕ": "empathy", …}
    for label, mood_val in _bare_mood.items():
        pat = re.compile(r"\[?\s*НАСТР\s*:\s*" + re.escape(label) + r"\s*\]?", re.IGNORECASE)
        if pat.search(clean):
            if mood == "neutral":
                mood = mood_val
            clean = pat.sub("", clean)
    # «КОНСУЛЬТАЦИЯ» без скобок
    if re.search(r"(?<!\[)\bКОНСУЛЬТАЦИЯ\b(?!\])", clean):
        suggest = True
    clean = re.sub(r"\[?\s*КОНСУЛЬТАЦИЯ\s*\]?", "", clean)
    # Убираем словесные описания маркеров если LLM написал их текстом
    _leak_patterns = [
        r"маркер настроения\s*:?\s*\[?[а-яёa-z:]*\]?",
        r"\[?\s*настр\s*:\s*[а-яёa-z]+\s*\]?",
        r"маркер\s+настроения",
        r"настроение\s*ответа",
    ]
    for pat in _leak_patterns:
        clean = re.sub(pat, "", clean, flags=re.IGNORECASE)
    # Убираем повторные пустые строки
    clean = re.sub(r"\n{3,}", "\n\n", clean)
    return clean.strip(), suggest, mood


def _enforce_female_self_reference(text: str) -> str:
    """Пост-фильтр: выравнивает самореференс Маняши в женский род."""
    out = text or ""
    replacements: tuple[tuple[str, str], ...] = (
        (r"\bя\s+сделал\b", "я сделала"),
        (r"\bя\s+подготовил\b", "я подготовила"),
        (r"\bя\s+проверил\b", "я проверила"),
        (r"\bя\s+уточнил\b", "я уточнила"),
        (r"\bя\s+собрал\b", "я собрала"),
        (r"\bя\s+наш[её]л\b", "я нашла"),
        (r"\bя\s+понял\b", "я поняла"),
        (r"\bя\s+смог\b", "я смогла"),
        (r"\bя\s+должен\b", "я должна"),
        (r"\bя\s+готов\b", "я готова"),
        (r"\bя\s+уверен\b", "я уверена"),
        (r"\bя\s+рад\b", "я рада"),
        (r"\bя\s+согласен\b", "я согласна"),
        (r"\bя\s+обязан\b", "я обязана"),
        (r"\bя\s+постарался\b", "я постаралась"),
        (r"\bя\s+разобрал\b", "я разобрала"),
        (r"\bчем\s+могу\s+быть\s+полезен\b", "чем могу быть полезна"),
        (r"\bбуду\s+полезен\b", "буду полезна"),
    )
    for pattern, repl in replacements:
        out = re.sub(pattern, repl, out, flags=re.IGNORECASE)
    # Исправляем частую грамматическую ошибку:
    # "Какой (именно) (вам) нужна помощь" -> "Какая (именно) (вам) нужна помощь"
    def _help_question_repl(match: re.Match) -> str:
        interrogative = match.group(1) or "какой"
        result_word = "Какая" if interrogative[:1].isupper() else "какая"
        tokens = [result_word]
        if match.group(2):
            tokens.append("именно")
        if match.group(3):
            tokens.append("вам")
        tokens.extend(["нужна", "помощь"])
        return " ".join(tokens)

    out = re.sub(
        r"\b(какой)\s+(именно\s+)?(вам\s+)?нужна\s+помощь\b",
        _help_question_repl,
        out,
        flags=re.IGNORECASE,
    )
    return out


def _normalize_voice_text(text: str) -> str:
    """Подготавливает текст к короткой голосовой версии: без markdown и служебных пометок."""
    t = str(text or "")
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r"\1", t)
    t = re.sub(r"\*\*(.*?)\*\*", r"\1", t)
    t = re.sub(r"`{1,3}", "", t)
    t = re.sub(r"\[?\s*КОНСУЛЬТАЦИЯ\s*\]?", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\[?\s*НАСТР\s*:\s*[А-ЯЁA-Z_]+\s*\]?", "", t, flags=re.IGNORECASE)
    t = re.sub(r"^\s*#{1,6}\s*", "", t, flags=re.MULTILINE)
    t = re.sub(r"^\s*[-*•]+\s+", "", t, flags=re.MULTILINE)
    t = re.sub(r"^\s*\d+\.\s+", "", t, flags=re.MULTILINE)
    t = re.sub(r"https?://\S+", "", t)
    t = re.sub(r"[\[\]{}()<>]", "", t)
    t = re.sub(r"\b90\s*\+\s*дн(?:ей|я|\.?)\b", "больше девяноста дней", t, flags=re.IGNORECASE)
    t = re.sub(r"\b1\s*[-–—]\s*2\b", "один-два", t)
    t = re.sub(
        r"\b(?:фз\s*№?\s*127|127\s*[-–—]?\s*фз)\b",
        "сто двадцать седьмой федеральный закон",
        t,
        flags=re.IGNORECASE,
    )
    t = re.sub(r"\bмфц\b", "многофункциональный центр", t, flags=re.IGNORECASE)
    t = re.sub(r"\bфссп\b", "служба судебных приставов", t, flags=re.IGNORECASE)
    t = re.sub(
        r"\bип\b(?=\s*(?:у|по|в)?\s*пристав)",
        "исполнительное производство",
        t,
        flags=re.IGNORECASE,
    )
    t = re.sub(
        r"\bип\b(?=\s*(?:возбуждено|открыто|ид[её]т|в\s*работе))",
        "исполнительное производство",
        t,
        flags=re.IGNORECASE,
    )
    t = re.sub(r"[;:]{2,}", ".", t)
    t = re.sub(r"[!?.,]{2,}", ".", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _build_short_speech_reply(text: str) -> str | None:
    """Собирает короткую голосовую версию ответа: 1–3 фразы, без маркеров и гарантий."""
    base = _normalize_voice_text(text)
    if not base:
        return None
    banned_patterns = [
        r"не\s+является\s+юридической\s+консультацией",
        r"не\s+заменяет\s+юридическую\s+консультацию",
        r"не\s+представляет\s+юридическую\s+консультацию",
        r"без\s+юридических\s+гарантий",
        r"я\s+(не|без)\s+ответственности",
        r"\bгарантир\w*\b",
        r"\b100\s*%\b",
        r"\bточно\s+спиш\w*\b",
    ]
    heavy_legal_patterns = [
        r"\bст\.?\s*\d+",
        r"\bстатья\b",
        r"\bподпункт\b",
        r"\bпункт\b",
        r"\bчаст[ьи]\b",
        r"\bабзац\b",
    ]
    parts = re.findall(r"[^.!?…\n]+[.!?…]?", base)
    if not parts:
        parts = [base]
    chunks: list[str] = []
    max_len = 220
    soft_min_len = 110

    def _finish_sentence(value: str) -> str:
        value = re.sub(r"\s+", " ", str(value or "")).strip(" ,;:—-")
        if value and not re.search(r"[.!?…]$", value):
            value += "."
        return value

    def _shorten_segment(value: str) -> str:
        value = str(value or "").strip()
        if len(value) <= max_len:
            return value
        clause_parts = [p.strip() for p in re.split(r"[,;:—–-]+", value) if p.strip()]
        collected: list[str] = []
        for clause in clause_parts:
            candidate = ", ".join(collected + [clause]).strip()
            if len(candidate) > max_len:
                break
            collected.append(clause)
            if len(candidate) >= soft_min_len:
                break
        if collected:
            return _finish_sentence(", ".join(collected))
        trimmed = value[:max_len].rsplit(" ", 1)[0].strip()
        return _finish_sentence(trimmed)

    for part in parts:
        segment = str(part or "").strip()
        if not segment:
            continue
        if not re.search(r"[а-яёa-z]", segment, flags=re.IGNORECASE):
            continue
        if any(re.search(pat, segment, flags=re.IGNORECASE) for pat in banned_patterns):
            continue
        if any(re.search(pat, segment, flags=re.IGNORECASE) for pat in heavy_legal_patterns):
            continue
        segment = _shorten_segment(segment)
        candidate = " ".join(chunks + [segment]).strip()
        if len(candidate) > max_len:
            if chunks:
                break
            segment = _shorten_segment(segment)
            candidate = segment
        chunks.append(segment)
        if len(chunks) >= 2 or len(candidate) >= soft_min_len:
            break
    speech_text = " ".join(chunks).strip()
    if not speech_text:
        speech_text = _shorten_segment(base)
    speech_text = re.sub(r"[#*_`|]+", " ", speech_text)
    speech_text = re.sub(r"\s+", " ", speech_text).strip()
    if len(speech_text) > max_len:
        speech_text = _shorten_segment(speech_text)
    speech_text = _finish_sentence(speech_text)
    return speech_text.strip() or None


def _speech_reply_from_reply_text(reply: str) -> str | None:
    short = _build_short_speech_reply(reply)
    if short:
        return short.strip()
    normalized = _normalize_voice_text(reply)
    if not normalized:
        return None
    if len(normalized) > 260:
        normalized = normalized[:260].rsplit(" ", 1)[0]
    return normalized.strip() or None


def _navy_chat_url() -> str:
    base = str(NAVY_API_BASE_URL or "https://api.navy/v1").strip().rstrip("/")
    if not base:
        base = "https://api.navy/v1"
    if base.endswith("/chat/completions"):
        return base
    if base.endswith("/v1"):
        return f"{base}/chat/completions"
    return f"{base}/v1/chat/completions"


def _extract_navy_chat_content(payload: dict) -> str:
    choices = payload.get("choices") or []
    if not choices:
        return ""
    message = (choices[0] or {}).get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if not isinstance(item, dict):
                continue
            text = item.get("text")
            if isinstance(text, str) and text.strip():
                parts.append(text.strip())
        return "\n".join(parts).strip()
    return ""


def _navy_chat_complete(messages: list[dict], timeout_seconds: float | None = None) -> str | None:
    if not NAVY_API_KEY:
        return None
    url = _navy_chat_url()
    try:
        request_timeout = max(1.0, float(timeout_seconds or MANYASHA_CHAT_LLM_TIMEOUT_SECONDS))
        payload = json.dumps(
            {
                "model": NAVY_MODEL,
                "messages": messages,
                "stream": False,
                "temperature": 0.8,
                "top_p": 0.92,
                "max_tokens": 1024,
            }
        ).encode("utf-8")
        navy_request = urllib_request.Request(
            url=url,
            data=payload,
            headers={
                "Authorization": f"Bearer {NAVY_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib_request.urlopen(navy_request, timeout=request_timeout) as response:
            raw = response.read().decode("utf-8")
        parsed = json.loads(raw)
        if parsed.get("error"):
            print(f"[MANYASHA CHAT] Navy API error: {parsed.get('error')}", flush=True)
            return None
        content = _extract_navy_chat_content(parsed)
        if content:
            print(f"[MANYASHA CHAT] Navy OK, len={len(content)} model={NAVY_MODEL}", flush=True)
            return content
        print("[MANYASHA CHAT] Navy вернул пустой content", flush=True)
        return None
    except urllib_error.HTTPError as exc:
        print(f"[MANYASHA CHAT] Navy HTTP {exc.code}", flush=True)
        return None
    except Exception as exc:
        print(f"[MANYASHA CHAT] Navy Error ({type(exc).__name__}): {exc}", flush=True)
        return None


def _ollama_chat_complete(messages: list[dict], timeout_seconds: float | None = None) -> str | None:
    url = f"{OLLAMA_URL.rstrip('/')}/api/chat"
    print(f"[MANYASHA CHAT] Ollama → {url} model={OLLAMA_MODEL}", flush=True)
    try:
        request_timeout = max(1.0, float(timeout_seconds or MANYASHA_CHAT_LLM_TIMEOUT_SECONDS))
        payload = json.dumps({
            "model": OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.85,
                "num_predict": 380,
                "repeat_penalty": 1.18,
                "top_p": 0.92,
                "min_p": 0.05,
            },
        }).encode("utf-8")

        ollama_request = urllib_request.Request(
            url=url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib_request.urlopen(ollama_request, timeout=request_timeout) as response:
            raw = response.read().decode("utf-8")
        parsed = json.loads(raw)
        content = parsed.get("message", {}).get("content", "").strip()
        if content:
            print(f"[MANYASHA CHAT] Ollama OK, len={len(content)}", flush=True)
        else:
            print("[MANYASHA CHAT] Ollama вернул пустой content", flush=True)
        return content if content else None
    except Exception as exc:
        print(f"[MANYASHA CHAT] Ollama Error ({type(exc).__name__}): {exc}", flush=True)
        return None


@app.get("/api/manyasha/widget-context")
def manyasha_widget_context(
    request: Request,
    pid: str = "default",
    sid: str = "",
    site_key: str = "",
    install_token: str = "",
    embed_contract_version: str = "",
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """
    Для встраиваемого виджета: проверяет, что партнёр есть в БД, и возвращает UUID.
    `pid` — UUID партнёра или ключ default/widget (см. DEFAULT_DEV_PARTNER_ID).
    """
    protection_enabled = _require_widget_context_protection()
    if protection_enabled:
        _validate_widget_embed_contract_version(embed_contract_version, strict=True)
    else:
        _validate_widget_embed_contract_version(embed_contract_version, strict=False)
    partner_uuid = _resolve_widget_partner_id(pid)
    row = None
    try:
        row = db.get(Partner, partner_uuid)
    except Exception as exc:
        if not _is_widget_local_dev_preview_bypass_enabled(partner_uuid, bool(protection_enabled), request):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="db_unavailable — не удалось проверить партнёра в БД.",
            ) from exc
    if row is None and _is_widget_context_partner_check_required(partner_uuid, protection_enabled, request):
        raise HTTPException(
            status_code=404,
            detail="partner_not_found — зарегистрируйте партнёра в БД или передайте корректный pid (UUID).",
        )
    if protection_enabled:
        _is_widget_context_authorized(
            request,
            partner_uuid,
            str(site_key or "").strip(),
            str(install_token or "").strip(),
            strict=protection_enabled,
        )
    if sid:
        session_id = _normalize_widget_session_id(sid, detail="Некорректный sid в widget-context.")
    else:
        session_id = f"sid-{uuid4().hex[:20]}"
    token, expires_at = _encode_widget_token(partner_uuid, session_id)
    return {
        "partner_id": str(partner_uuid),
        "session_id": session_id,
        "widget_token": token,
        "expires_at": expires_at.isoformat(),
    }


@app.get("/api/manyasha/widget-install-health")
def manyasha_widget_install_health(
    request: Request,
    pid: str = "default",
    site_key: str = "",
    install_token: str = "",
    embed_contract_version: str = "",
    db: Session = Depends(get_db),
) -> dict:
    checks: list[dict[str, str]] = []

    def add_check(name: str, status_name: str, code: str, message: str) -> None:
        checks.append(
            {
                "name": str(name),
                "status": str(status_name),
                "code": str(code),
                "message": str(message),
            }
        )

    add_check("api", "ok", "api_reachable", "API доступен.")

    protection_enabled = _require_widget_context_protection()
    contract_ok = False
    try:
        contract_version = _validate_widget_embed_contract_version(
            embed_contract_version,
            strict=protection_enabled,
        )
        contract_ok = True
        add_check(
            "embed_contract",
            "ok",
            "embed_contract_supported",
            f"Версия embed-контракта {contract_version} поддерживается.",
        )
    except HTTPException as exc:
        error_text = str(exc.detail or "")
        contract_code = (
            "embed_contract_unsupported"
            if "Поддерживаются версии" in error_text
            else "embed_contract_missing"
            if "обязателен" in error_text.lower()
            else "embed_contract_invalid"
        )
        add_check("embed_contract", "error", contract_code, error_text)

    partner_uuid: UUID | None = None
    partner_ok = False
    try:
        partner_uuid = _resolve_widget_partner_id(pid)
        partner_row = None
        try:
            partner_row = db.get(Partner, partner_uuid)
        except Exception:
            partner_row = None
            if _is_widget_local_dev_preview_bypass_enabled(partner_uuid, bool(protection_enabled), request):
                add_check(
                    "partner_db",
                    "warn",
                    "partner_db_unavailable_local_preview",
                    "БД недоступна, работаем в локальном dev-preview режиме.",
                )
            else:
                add_check(
                    "partner_db",
                    "error",
                    "partner_db_unavailable",
                    "БД недоступна: невозможно проверить partner_id.",
                )
        if partner_row is None and _is_widget_context_partner_check_required(partner_uuid, protection_enabled, request):
            add_check(
                "partner",
                "error",
                "partner_not_found",
                "Партнёр не найден в БД для заданного pid.",
            )
        elif partner_row is None:
            partner_ok = True
            if _is_widget_local_dev_preview_bypass_enabled(partner_uuid, bool(protection_enabled), request):
                add_check(
                    "partner",
                    "ok",
                    "partner_default_dev_preview_local",
                    "Локальный dev-preview использует default партнёра без записи в БД.",
                )
            else:
                add_check(
                    "partner",
                    "warn",
                    "partner_default_dev_without_db",
                    "Используется dev-preview партнёр без записи в БД.",
                )
        else:
            partner_ok = True
            add_check("partner", "ok", "partner_found", "Партнёр найден в БД.")
    except HTTPException as exc:
        add_check("partner", "error", "partner_id_invalid", str(exc.detail))

    add_check(
        "protection",
        "ok" if protection_enabled else "warn",
        "widget_context_protection_enabled" if protection_enabled else "widget_context_protection_disabled",
        "Widget context protection включена." if protection_enabled else "Widget context protection отключена (dev режим).",
    )

    request_host = _extract_origin_host(request)
    normalized_site_key = str(site_key or "").strip()
    normalized_install_token = str(install_token or "").strip()

    allowed_domains: list[str] = []
    domain_authorized = False
    site_key_ok = False
    token_ok = False

    if partner_uuid is not None:
        allowed_domains = _get_widget_partner_domain_allowlist(partner_uuid)
        allowed_keys = _get_widget_partner_site_keys(partner_uuid)
        strict_mode = bool(protection_enabled)
        local_dev_bypass = _is_widget_local_dev_preview_bypass_enabled(partner_uuid, strict_mode, request)
        if local_dev_bypass:
            domain_authorized = True
            site_key_ok = True
            token_ok = True
            add_check(
                "origin",
                "ok",
                "origin_local_dev_preview",
                f"Локальный origin {request_host or 'localhost'} разрешён через dev-preview bypass.",
            )
            add_check(
                "site_key",
                "ok",
                "site_key_optional_local_dev_preview",
                "site_key не обязателен для локального dev-preview.",
            )
            add_check(
                "install_token",
                "ok",
                "install_token_optional_local_dev_preview",
                "install_token не обязателен для локального dev-preview.",
            )
        elif request_host and allowed_domains and any(_host_matches_pattern(request_host, pat) for pat in allowed_domains):
            domain_authorized = True
            add_check("origin", "ok", "origin_allowlisted", f"Origin {request_host} разрешён для партнёра.")
        elif allowed_domains and request_host:
            add_check(
                "origin",
                "error",
                "origin_not_allowlisted",
                f"Origin {request_host} не входит в allowlist партнёра.",
            )
        elif allowed_domains and not request_host:
            add_check(
                "origin",
                "warn",
                "origin_missing",
                "Origin/Referer не передан, проверка доменного allowlist не выполнена.",
            )
        else:
            add_check(
                "origin",
                "warn",
                "origin_allowlist_not_configured",
                "Для партнёра не настроен доменный allowlist.",
            )

        if local_dev_bypass:
            pass
        elif not strict_mode:
            add_check(
                "site_key",
                "warn" if normalized_site_key else "ok",
                "site_key_optional_without_protection",
                "site_key не обязателен, потому что protection отключена.",
            )
            add_check(
                "install_token",
                "warn" if normalized_install_token else "ok",
                "install_token_optional_without_protection",
                "install_token не обязателен, потому что protection отключена.",
            )
            site_key_ok = True
            token_ok = True
        else:
            if not normalized_site_key:
                add_check(
                    "site_key",
                    "error",
                    "site_key_required",
                    "site_key обязателен в защищенном режиме.",
                )
            elif allowed_keys and normalized_site_key not in allowed_keys:
                add_check(
                    "site_key",
                    "error",
                    "site_key_not_registered",
                    "site_key не зарегистрирован для этого партнёра.",
                )
            else:
                site_key_ok = True
                add_check(
                    "site_key",
                    "ok" if allowed_keys else "warn",
                    "site_key_valid" if allowed_keys else "site_key_not_restricted",
                    "site_key принят." if allowed_keys else "site_key принят (строгий allowlist site_key не настроен).",
                )

            if strict_mode and not normalized_install_token:
                add_check(
                    "install_token",
                    "error",
                    "install_token_required",
                    "install_token обязателен в защищенном режиме.",
                )
            elif not site_key_ok:
                add_check(
                    "install_token",
                    "error",
                    "install_token_blocked_by_site_key",
                    "Проверка install_token невозможна без валидного site_key.",
                )
            else:
                token_valid, token_code, token_message = _inspect_install_token_for_health(
                    request,
                    partner_uuid,
                    normalized_site_key,
                    normalized_install_token,
                )
                token_ok = token_valid
                add_check("install_token", "ok" if token_valid else "error", token_code, token_message)

    overall_status = "ok"
    overall_code = "widget_install_ready"
    overall_message = "Embed-конфиг валиден. Виджет можно подключать."
    if any(item["status"] == "error" for item in checks):
        overall_status = "error"
        first_error = next(item for item in checks if item["status"] == "error")
        overall_code = first_error["code"]
        overall_message = first_error["message"]
    elif any(item["status"] == "warn" for item in checks):
        overall_status = "warn"
        first_warn = next(item for item in checks if item["status"] == "warn")
        overall_code = first_warn["code"]
        overall_message = first_warn["message"]

    can_issue_widget_context = bool(
        contract_ok
        and partner_ok
        and (
            not protection_enabled
            or ((not allowed_domains or domain_authorized or not request_host) and site_key_ok and token_ok)
        )
    )
    try:
        WIDGET_INSTALL_HEALTH_TOTAL.labels(status=overall_status, code=overall_code).inc()
    except Exception:
        pass
    for item in checks:
        try:
            WIDGET_INSTALL_HEALTH_CHECK_TOTAL.labels(
                name=str(item.get("name", "")),
                status=str(item.get("status", "")),
                code=str(item.get("code", "")),
            ).inc()
        except Exception:
            continue

    return {
        "status": overall_status,
        "code": overall_code,
        "summary": overall_message,
        "pid": str(pid or "default"),
        "partner_id": str(partner_uuid) if partner_uuid else "",
        "request_host": request_host,
        "protection_enabled": protection_enabled,
        "can_issue_widget_context": can_issue_widget_context,
        "checks": checks,
    }


@app.post("/api/manyasha/widget-install-token", response_model=WidgetInstallTokenResponse)
def manyasha_issue_widget_install_token(
    req: WidgetInstallTokenRequest,
    _: None = Depends(_require_widget_install_provision),
) -> WidgetInstallTokenResponse:
    """
    Выпуск install_token для партнёрского embedding.

    Требует server-side секрет (`X-Widget-Install-Secret` или `Authorization: Bearer ...`).
    """
    if req.ttl_seconds is not None:
        if req.ttl_seconds < 60 or req.ttl_seconds > 86400:
            raise HTTPException(status_code=422, detail="ttl_seconds должен быть между 60 и 86400.")
    partner_uuid = _resolve_widget_partner_id(req.partner_id)
    site_key = req.site_key.strip()
    if not site_key:
        raise HTTPException(status_code=422, detail="site_key обязателен.")
    known_keys = _get_widget_partner_site_keys(partner_uuid)
    if known_keys and site_key not in known_keys:
        raise HTTPException(status_code=403, detail="site_key не зарегистрирован для этого партнёра.")
    token, expires_at = _encode_widget_install_token(
        partner_uuid,
        site_key=site_key,
        origin=req.origin.strip() or None,
        ttl_seconds=req.ttl_seconds,
    )
    return WidgetInstallTokenResponse(
        partner_id=partner_uuid,
        site_key=site_key,
        token=token,
        expires_at=expires_at,
        ttl_seconds=max(60, int(req.ttl_seconds or WIDGET_INSTALL_TOKEN_TTL_SECONDS)),
    )


@app.get("/api/manyasha/debug")
def manyasha_debug() -> dict:
    """Диагностика: проверяет соединение с Ollama."""
    import urllib.request as _ur
    url = f"{OLLAMA_URL.rstrip('/')}/api/tags"
    try:
        with _ur.urlopen(url, timeout=5) as r:
            data = json.loads(r.read())
        models = [m.get("name") for m in data.get("models", [])]
        return {
            "ollama_url": OLLAMA_URL,
            "ollama_model": OLLAMA_MODEL,
            "ollama_status": "ok",
            "available_models": models,
            "model_found": OLLAMA_MODEL in models,
        }
    except Exception as exc:
        return {
            "ollama_url": OLLAMA_URL,
            "ollama_model": OLLAMA_MODEL,
            "ollama_status": "error",
            "error": str(exc),
        }


def _gemini_one_model(
    messages: list[dict],
    model: str,
    api_key: str,
    timeout_seconds: float | None = None,
) -> str | None:
    system_chunks: list[str] = []
    contents: list[dict] = []
    for m in messages:
        role = m.get("role")
        text = (m.get("content") or "").strip()
        if not text:
            continue
        if role == "system":
            system_chunks.append(text)
        elif role == "user":
            contents.append({"role": "user", "parts": [{"text": text}]})
        elif role == "assistant":
            contents.append({"role": "model", "parts": [{"text": text}]})
    if not contents:
        return None
    body: dict = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.8,
            "maxOutputTokens": 1024,
            "topP": 0.92,
        },
    }
    if system_chunks:
        body["systemInstruction"] = {"parts": [{"text": "\n\n".join(system_chunks)}]}

    q = urllib_parse.urlencode({"key": api_key})
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?{q}"
    )
    data = json.dumps(body).encode("utf-8")
    gemini_req = urllib_request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        request_timeout = max(1.0, float(timeout_seconds or MANYASHA_CHAT_LLM_TIMEOUT_SECONDS))
        with urllib_request.urlopen(gemini_req, timeout=request_timeout) as response:
            raw = response.read().decode("utf-8")
    except Exception as exc:
        print(f"[MANYASHA CHAT] Gemini model={model!r}: {exc}", flush=True)
        return None
    parsed = json.loads(raw)
    if parsed.get("error"):
        print(f"[MANYASHA CHAT] Gemini API error ({model}): {parsed.get('error')}", flush=True)
        return None
    candidates = parsed.get("candidates") or []
    if not candidates:
        print("[MANYASHA CHAT] Gemini: no candidates in response", flush=True)
        return None
    parts = (candidates[0].get("content") or {}).get("parts") or []
    texts = [p.get("text", "") for p in parts if isinstance(p, dict)]
    content = "".join(texts).strip()
    return content if content else None


def _gemini_chat_complete(messages: list[dict], timeout_seconds: float | None = None) -> str | None:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    total_timeout = max(1.0, float(timeout_seconds or MANYASHA_CHAT_LLM_TIMEOUT_SECONDS))
    models = [m.strip() for m in GEMINI_MODEL.split(",") if m.strip()]
    per_model_timeout = max(1.0, total_timeout / max(1, len(models)))
    for model in models:
        out = _gemini_one_model(messages, model, api_key, timeout_seconds=per_model_timeout)
        if out:
            print(f"[MANYASHA CHAT] Gemini OK: model={model!r}", flush=True)
            return out
    return None


def _extract_debt_amount_from_message(user_message: str) -> int:
    text = str(user_message or "").lower().replace("\xa0", " ")
    if not text:
        return 0
    pattern = re.compile(r"(\d[\d\s.,]{0,16})(?:\s*)(млн|миллион[а-я]*|тыс|тысяч[а-я]*)?", re.IGNORECASE)
    best = 0
    for raw_num, raw_suffix in pattern.findall(text):
        token = str(raw_num or "").strip()
        if not token:
            continue
        digits_only = re.sub(r"[^\d]", "", token)
        if not digits_only:
            continue
        value = 0
        try:
            if len(digits_only) > 4:
                value = int(digits_only)
            else:
                normalized = token.replace(" ", "").replace(",", ".")
                value = int(float(normalized))
        except Exception:
            continue
        suffix = str(raw_suffix or "").lower()
        if suffix.startswith("млн") or suffix.startswith("миллион"):
            value *= 1_000_000
        elif suffix.startswith("тыс") or suffix.startswith("тысяч"):
            value *= 1_000
        if value > best:
            best = value
    return max(0, best)


def _format_rub_amount(amount: int) -> str:
    return f"{int(amount):,}".replace(",", " ") + " рублей"


def _contains_any(text: str, keywords: tuple[str, ...] | list[str]) -> bool:
    base = str(text or "").lower()
    return any(k in base for k in keywords)


def _diagnostic_text(value: object, *, limit: int = 90) -> str:
    if value is None or isinstance(value, bool):
        return ""
    text_value = str(value or "").replace("\xa0", " ")
    text_value = re.sub(r"\s+", " ", text_value).strip()
    if not text_value or text_value.lower() in {"0", "false", "none", "null", "-"}:
        return ""
    return text_value[:limit].strip()


def _diagnostic_list(value: object, *, limit: int = 6) -> list[str]:
    if isinstance(value, (list, tuple, set)):
        raw_items = value
    elif value:
        raw_items = [value]
    else:
        raw_items = []
    items: list[str] = []
    for raw in raw_items:
        item = _diagnostic_text(raw, limit=70)
        if item and item not in items:
            items.append(item)
        if len(items) >= limit:
            break
    return items


def _normalize_manyasha_diagnostics(raw: object) -> dict[str, object]:
    if not isinstance(raw, dict):
        return {}

    out: dict[str, object] = {}
    for key in ("debt_amount", "bailiffs", "income", "collectors", "overdue_stage", "route_hint", "risk_level"):
        value = _diagnostic_text(raw.get(key))
        if value:
            out[key] = value

    debt_amount_value = 0
    try:
        debt_amount_value = int(float(str(raw.get("debt_amount_value") or 0).replace(" ", "")))
    except Exception:
        debt_amount_value = 0
    if debt_amount_value <= 0 and out.get("debt_amount"):
        debt_amount_value = _extract_debt_amount_from_message(str(out.get("debt_amount") or ""))
    if debt_amount_value > 0:
        out["debt_amount_value"] = debt_amount_value

    debt_types = _diagnostic_list(raw.get("debt_types"))
    if debt_types:
        out["debt_types"] = debt_types
    property_items = _diagnostic_list(raw.get("property"))
    if property_items:
        out["property"] = property_items
    missing_fields = _diagnostic_list(raw.get("missing_fields"), limit=5)
    if missing_fields:
        out["missing_fields"] = missing_fields
    risk_reasons = _diagnostic_list(raw.get("risk_reasons"), limit=5)
    if risk_reasons:
        out["risk_reasons"] = risk_reasons

    try:
        known_count = int(raw.get("known_count") or 0)
    except Exception:
        known_count = 0
    if known_count > 0:
        out["known_count"] = min(known_count, 12)
    return out


def _manyasha_diagnostics_lead_packet(raw: object) -> dict[str, object]:
    normalized = _normalize_manyasha_diagnostics(raw)
    if not normalized:
        return {}

    packet: dict[str, object] = {}
    for key in ("debt_amount", "bailiffs", "income", "collectors", "route_hint", "risk_level"):
        value = normalized.get(key)
        if value:
            packet[key] = value
    for key in ("debt_types", "property", "risk_reasons", "missing_fields"):
        value = normalized.get(key)
        if isinstance(value, list) and value:
            packet[key] = value[:6 if key in {"debt_types", "property"} else 5]
    known_count = normalized.get("known_count")
    if isinstance(known_count, int) and known_count > 0:
        packet["known_count"] = min(known_count, 12)
    return packet


def _attach_diagnostics_lead_packet(target: dict, *sources: object) -> dict:
    out = dict(target or {})
    raw_packet: dict[str, object] = {}
    for source in sources:
        raw_packet = _manyasha_diagnostics_lead_packet(source)
        if raw_packet:
            break
    out.pop("diagnostics", None)
    out.pop("diagnostic_summary", None)
    if raw_packet:
        out["diagnostics"] = raw_packet
        out["diagnostic_summary"] = raw_packet
    return out


def _extract_manyasha_diagnostics(profile: object) -> dict[str, object]:
    if not isinstance(profile, dict):
        return {}
    return _normalize_manyasha_diagnostics(profile.get("diagnostics"))


def _diagnostics_has_value(diagnostics: dict[str, object], key: str) -> bool:
    value = diagnostics.get(key)
    if isinstance(value, list):
        return bool(value)
    if isinstance(value, int):
        return value > 0
    return bool(_diagnostic_text(value))


def _manyasha_diagnostics_context_line(diagnostics: dict[str, object]) -> str:
    if not diagnostics:
        return ""
    parts: list[str] = []
    if diagnostics.get("debt_amount"):
        parts.append(f"сумма долга={diagnostics['debt_amount']}")
    if diagnostics.get("debt_types"):
        parts.append("типы долгов=" + ", ".join(diagnostics["debt_types"][:4]))  # type: ignore[index]
    if diagnostics.get("bailiffs"):
        parts.append(f"приставы={diagnostics['bailiffs']}")
    if diagnostics.get("income"):
        parts.append(f"доход={diagnostics['income']}")
    if diagnostics.get("property"):
        parts.append("имущество=" + ", ".join(diagnostics["property"][:4]))  # type: ignore[index]
    if diagnostics.get("collectors"):
        parts.append(f"коллекторы={diagnostics['collectors']}")
    if diagnostics.get("overdue_stage"):
        parts.append(f"стадия={diagnostics['overdue_stage']}")
    if diagnostics.get("route_hint"):
        parts.append(f"маршрут={diagnostics['route_hint']}")
    if diagnostics.get("known_count"):
        parts.append(f"известных пунктов={diagnostics['known_count']}")
    if diagnostics.get("risk_level"):
        parts.append(f"уровень риска={diagnostics['risk_level']}")
    if diagnostics.get("risk_reasons"):
        parts.append("причины риска=" + ", ".join(diagnostics["risk_reasons"][:3]))  # type: ignore[index]
    if not parts:
        return ""

    line = "Диагностика Маняши по диалогу, предварительно и по словам пользователя: " + "; ".join(parts) + "."
    missing = diagnostics.get("missing_fields") if isinstance(diagnostics.get("missing_fields"), list) else []
    if missing:
        line += " Не спрашивай повторно известные поля; если нужно продолжить, уточни максимум 1-2 пункта из missing_fields: " + ", ".join(missing[:2]) + "."  # type: ignore[index]
    else:
        line += " Не спрашивай повторно известные поля; уточняй только то, чего явно не хватает."
    line += " Выбери один лучший следующий вопрос по недостающим данным. Не делай окончательный вывод без проверки документов."
    return line


def _diagnostics_known_summary(diagnostics: dict[str, object], fields: tuple[str, ...] | None = None) -> str:
    if not diagnostics:
        return ""
    selected = set(fields or ())
    parts: list[str] = []
    if (not selected or "debt_amount" in selected) and diagnostics.get("debt_amount"):
        parts.append(f"долг около {diagnostics['debt_amount']}")
    if (not selected or "debt_types" in selected) and diagnostics.get("debt_types"):
        parts.append("тип долгов: " + ", ".join(diagnostics["debt_types"][:2]))  # type: ignore[index]
    if (not selected or "bailiffs" in selected) and diagnostics.get("bailiffs"):
        parts.append(f"приставы: {diagnostics['bailiffs']}")
    if (not selected or "income" in selected) and diagnostics.get("income"):
        parts.append(f"доход: {diagnostics['income']}")
    if (not selected or "property" in selected) and diagnostics.get("property"):
        parts.append("имущество: " + ", ".join(diagnostics["property"][:2]))  # type: ignore[index]
    if (not selected or "collectors" in selected) and diagnostics.get("collectors"):
        parts.append(f"коллекторы: {diagnostics['collectors']}")
    if not parts:
        return ""
    return " По вашим словам, уже видно: " + "; ".join(parts) + "."


def _diagnostics_missing_question(field: str, diagnostics: dict[str, object]) -> str:
    text = str(field or "").lower()
    property_known = _diagnostics_has_value(diagnostics, "property")
    income_known = _diagnostics_has_value(diagnostics, "income")
    bailiffs_known = _diagnostics_has_value(diagnostics, "bailiffs")
    debt_amount_known = _diagnostics_has_value(diagnostics, "debt_amount")
    debt_types_known = _diagnostics_has_value(diagnostics, "debt_types")

    if "единствен" in text:
        return "это единственное жильё и есть ли доли или недавние сделки"
    if "ипотек" in text or "залог" in text:
        return "есть ли ипотека, залог или спор по квартире"
    if "дол" in text and property_known and ("имуществ" in text or "жиль" in text or "квартир" in text):
        return "есть ли доли, залог или недавние сделки с имуществом"
    if ("удерж" in text or "прожит" in text) and income_known:
        return "какой размер удержаний и остаётся ли прожиточный минимум"

    if "сумм" in text and not _diagnostics_has_value(diagnostics, "debt_amount"):
        return "какая сейчас примерная сумма долга"
    if ("тип" in text or "долг" in text) and not debt_types_known:
        return "какой тип обязательств сейчас основной — кредиты, микрозаймы или смешанный долг"
    if ("пристав" in text or "ип" in text) and not bailiffs_known:
        return "есть ли активные исполнительные производства у приставов"
    if ("доход" in text or "работ" in text) and not income_known:
        return "есть ли сейчас официальный доход"
    if ("имуществ" in text or "жиль" in text or "квартир" in text) and not property_known:
        return "есть ли имущество, которое важно сохранить"
    if ("коллектор" in text or "звон" in text) and not _diagnostics_has_value(diagnostics, "collectors"):
        return "есть ли звонки или давление коллекторов"
    if "сумм" in text and debt_amount_known:
        return ""
    return ""


def _diagnostics_property_followup(diagnostics: dict[str, object], user_message: str) -> str:
    if not _diagnostics_has_value(diagnostics, "property"):
        return ""
    text = str(user_message or "").lower()
    property_text = " ".join(diagnostics.get("property") or []) if isinstance(diagnostics.get("property"), list) else str(diagnostics.get("property") or "")
    combined = (text + " " + property_text).lower()
    needs_single_home = not _contains_any(combined, ("единственн", "единственное"))
    needs_deal_details = not _contains_any(combined, ("дол", "сделк", "дарен", "продаж"))
    if "ипотек" in combined or "залог" in combined:
        return "это единственное жильё, есть ли доли и были ли недавние сделки"
    if needs_single_home or needs_deal_details:
        return "это единственное жильё и есть ли доли, залог или недавние сделки"
    return ""


def _diagnostics_income_followup(diagnostics: dict[str, object], user_message: str) -> str:
    if not _diagnostics_has_value(diagnostics, "income"):
        return ""
    text = str(user_message or "").lower()
    if _contains_any(text, ("удержан", "списыва", "прожит", "зарплат")):
        return "какой размер удержаний и сколько остаётся после списаний"
    return "какой размер удержаний и дохода, и остаётся ли прожиточный минимум"


def _diagnostics_rank_followup(question: str, diagnostics: dict[str, object], primary: str) -> tuple[int, str]:
    q = str(question or "").lower()
    risk = str(diagnostics.get("risk_level") or "").lower()
    priority = 50
    if primary == "home" and _contains_any(q, ("жиль", "квартир", "ипотек", "залог", "дол", "сделк")):
        priority = 5
    elif primary == "income" and _contains_any(q, ("доход", "удерж", "прожит")):
        priority = 6
    elif primary == "bailiffs" and _contains_any(q, ("удерж", "прожит", "доход")):
        priority = 7
    elif "тип обязательств" in q:
        priority = 10
    elif "официальный доход" in q or "размер дохода" in q:
        priority = 12
    elif "имущество" in q or "жильё" in q or "квартира" in q:
        priority = 14
    elif "пристав" in q:
        priority = 16
    elif "коллектор" in q:
        priority = 18
    if risk == "high" and _contains_any(q, ("имущество", "жиль", "квартир", "удерж", "прожит")):
        priority -= 3
    return priority, q


_MANYASHA_INTENT_PRIORITY = [
    "about_assistant",
    "mfc",
    "court",
    "bailiffs",
    "documents",
    "income",
    "home",
    "timeline",
    "collectors",
    "debt",
    "offtopic",
]

_MANYASHA_INTENT_KEYWORDS: dict[str, tuple[str, ...]] = {
    "about_assistant": ("что ты умеешь", "что умеешь", "что ты делаешь", "ты кто", "кто ты", "чем помогаешь"),
    "mfc": ("мфц", "внесудеб", "внесудебного", "внесудебное"),
    "court": ("суд", "судеб", "арбитраж", "заседан"),
    "bailiffs": ("пристав", "фссп", "арест", "списыва", "исполнительн", "взыскани"),
    "documents": ("документ", "справк", "выписк", "паспорт", "договор", "снилс", "инн"),
    "income": ("официальн", "зарплат", "доход", "работаю", "работа", "трудоустро"),
    "home": ("квартир", "жиль", "ипотек", "имуществ", "единственн"),
    "timeline": ("сколько длится", "срок", "как долго", "длится", "когда законч"),
    "collectors": ("коллектор", "звонят", "угрож", "давят", "требуют"),
    "debt": ("долг", "кредит", "микрозайм", "займ", "мфо", "задолж", "миллион", "млн", "руб"),
}

_MANYASHA_INTENT_ANCHORS: dict[str, tuple[str, ...]] = {
    "about_assistant": ("я помога", "могу помочь", "банкрот", "долг"),
    "mfc": ("мфц", "внесудеб", "судеб"),
    "court": ("суд", "судеб", "процедур"),
    "bailiffs": ("пристав", "исполнитель", "удержан", "взыскан", "арест"),
    "documents": ("документ", "спис", "справк", "паспорт", "договор"),
    "income": ("доход", "зарплат", "официаль", "работ", "удержан"),
    "home": ("квартир", "жиль", "ипотек", "имуществ"),
    "timeline": ("срок", "дл", "этап", "время"),
    "collectors": ("коллект", "звон", "давлен", "требован"),
    "debt": ("долг", "кредит", "доход", "имуществ", "пристав", "банкрот"),
}


def _pick_manyasha_variant(source_text: str, variants: tuple[str, ...]) -> str:
    if not variants:
        return ""
    if len(variants) == 1:
        return variants[0]
    seed = hashlib.sha1(str(source_text or "").strip().lower().encode("utf-8")).hexdigest()
    idx = int(seed[:8], 16) % len(variants)
    return variants[idx]


def _detect_manyasha_fallback_intents(user_message: str) -> list[str]:
    text = str(user_message or "").lower()
    debt_amount = _extract_debt_amount_from_message(user_message)
    found: list[str] = []

    for intent, keywords in _MANYASHA_INTENT_KEYWORDS.items():
        if _contains_any(text, keywords):
            found.append(intent)
    if debt_amount > 0 and "debt" not in found:
        found.append("debt")
    if not found:
        return ["offtopic"]

    ordered: list[str] = []
    for intent in _MANYASHA_INTENT_PRIORITY:
        if intent in found and intent not in ordered:
            ordered.append(intent)
    return ordered or ["offtopic"]


def _detect_manyasha_fallback_intent(user_message: str) -> str:
    return _detect_manyasha_fallback_intents(user_message)[0]


def _build_debt_followup_questions(user_message: str, diagnostics: dict[str, object] | None = None) -> list[str]:
    text = str(user_message or "").lower()
    diagnostics = _normalize_manyasha_diagnostics(diagnostics or {})
    primary = _detect_manyasha_fallback_intent(user_message)
    followups: list[str] = []

    missing_fields = diagnostics.get("missing_fields")
    if isinstance(missing_fields, list) and missing_fields:
        for field in missing_fields:
            question = _diagnostics_missing_question(str(field or ""), diagnostics)
            if question and question not in followups:
                followups.append(question)
    if primary == "home":
        property_question = _diagnostics_property_followup(diagnostics, user_message)
        if property_question and property_question not in followups:
            followups.insert(0, property_question)
    if primary == "income" and _diagnostics_has_value(diagnostics, "income"):
        income_question = _diagnostics_income_followup(diagnostics, user_message)
        if income_question and income_question not in followups:
            followups.insert(0, income_question)
    if primary == "bailiffs" and _diagnostics_has_value(diagnostics, "bailiffs") and _diagnostics_has_value(diagnostics, "income"):
        income_question = _diagnostics_income_followup(diagnostics, user_message)
        if income_question and income_question not in followups:
            followups.insert(0, income_question)

    if not _diagnostics_has_value(diagnostics, "debt_types") and not _contains_any(text, ("кредит", "кредиты", "микрозайм", "микрозаймы", "займ", "займы", "карта")):
        followups.append("какой тип обязательств сейчас основной — кредиты, микрозаймы или смешанный долг")
    if not _diagnostics_has_value(diagnostics, "income") and not _contains_any(text, ("доход", "зарплат", "работ", "официальн")):
        followups.append("есть ли сейчас официальный доход")
    if not _diagnostics_has_value(diagnostics, "property") and not _contains_any(text, ("имуществ", "квартир", "жиль", "машин", "авто", "ипотек")):
        followups.append("есть ли имущество, которое важно сохранить")
    if not _diagnostics_has_value(diagnostics, "bailiffs") and not _contains_any(text, ("пристав", "фссп", "исполнительн", "арест", "удержан")):
        followups.append("есть ли активные исполнительные производства у приставов")
    deduped: list[str] = []
    for item in followups:
        clean = str(item or "").strip()
        if clean and clean not in deduped:
            deduped.append(clean)
    deduped.sort(key=lambda question: _diagnostics_rank_followup(question, diagnostics, primary))
    return deduped[:2]


def _manyasha_secondary_intent_hint(intent: str) -> str:
    hints = {
        "mfc": "Если нужно, отдельно сравню условия МФЦ и суда именно под ваши вводные.",
        "court": "При желании отдельно разберу судебный сценарий по шагам и рискам.",
        "bailiffs": "Отдельно могу разобрать текущие действия приставов и как их зафиксировать.",
        "documents": "Также могу собрать короткий приоритетный список документов под ваш случай.",
        "income": "Если доход официальный, отдельно оценим удержания, прожиточный минимум и влияние зарплаты на процедуру.",
        "home": "Если вопрос про имущество критичен, отдельно разберём риски по квартире и ограничения.",
        "timeline": "При необходимости отдельно посчитаем реалистичный диапазон сроков.",
        "collectors": "Если есть давление коллекторов, отдельно дам безопасный порядок действий.",
        "debt": "Дополнительно могу быстро оценить маршрут по сумме долга и текущей нагрузке.",
    }
    return hints.get(str(intent or "").strip(), "")


def _manyasha_reply_is_relevant(user_message: str, reply: str) -> bool:
    message = str(user_message or "").strip().lower()
    answer = str(reply or "").strip().lower()
    if not message or not answer:
        return False

    intents = _detect_manyasha_fallback_intents(message)
    primary = intents[0] if intents else "offtopic"
    dangerous_noise = (
        r"\bбезнадзорн\w*\s+лиц",
        r"\bедин\w*\s+платформ\w*",
        r"\bбанкроств\w*",
        r"\bнепонятно\s+конкретн\w*\s+вопрос",
        r"\bпризнани[ея]\s+долгов\s+непогаш",
        r"\bнесудебн\w*\s+способом\s+из-за",
    )
    if any(re.search(pattern, answer, flags=re.IGNORECASE) for pattern in dangerous_noise):
        return False
    user_voice_leaks = (
        r"\bу\s+меня\s+(?:долг|кредит|займ|пристав|списал|списали|арест|зарплат|работ)",
        r"\bя\s+(?:уже\s+)?(?:обратил|обратилась|подал|подала|получил|получила|работаю|имею|испытываю|хочу|должен|должна)\b",
    )
    if any(re.search(pattern, answer, flags=re.IGNORECASE) for pattern in user_voice_leaks):
        return False
    if _extract_debt_amount_from_message(message) <= 0:
        fabricated_amount_pattern = (
            r"(?:у\s+меня|при\s+(?:ваш(?:ем|ей|их)?\s+)?долг|"
            r"ваш(?:ем|ей|их)?\s+долг|долг[аи]?\s+крупн\w*\s+размер|около\s+\d[\d\s.,]*(?:руб|₽|тыс|млн))"
        )
        if _extract_debt_amount_from_message(answer) > 0 and re.search(fabricated_amount_pattern, answer):
            return False
    if primary != "debt" and answer.startswith("понимаю. банкротство можно рассмотреть"):
        return False
    weak_legal_patterns_by_intent: dict[str, tuple[str, ...]] = {
        "home": (
            r"страхов\w*\s+на\s+случай\s+ипотек",
            r"застрахован\w*\s+на\s+случай\s+ипотек",
            r"страхов\w*.*избеж\w*\s+.*реализац",
        ),
        "collectors": (
            r"\bнотариус\w*\b",
            r"соглашени[ея][-\s]?контракт",
            r"открыт\w*\s+общени\w*\s+с\s+коллектор",
        ),
        "income": (
            r"\bофичн\w*\b",
            r"трудов\w*\s+прав",
            r"незаконн\w*\s+задерж\w*",
            r"неоправданн\w*\s+начислен\w*\s+на\s+работ",
            r"полной\s+оплат\w*\s+заработн",
        ),
        "timeline": (
            r"передач\w*\s+имуществ\w*\s+взыскател",
            r"статус\w*\s+должник\w*\s*\(?\s*неустойчив",
        ),
        "bailiffs": (
            r"немедленн\w*\s+связаться\s+с\s+пристав",
            r"остановк\w*\s+любых\s+новых\s+списан",
            r"представител\w*\s+судебн\w*\s+орган",
        ),
    }
    if any(re.search(pattern, answer, flags=re.IGNORECASE) for pattern in weak_legal_patterns_by_intent.get(primary, ())):
        return False

    if primary == "offtopic":
        return _contains_any(answer, ("долг", "банкрот", "пристав", "взыскан", "кредит", "задолж"))

    anchors = _MANYASHA_INTENT_ANCHORS.get(primary) or ()
    if anchors and not _contains_any(answer, anchors):
        return False
    if primary == "home" and _contains_any(message, ("квартир", "жиль")):
        if not _contains_any(answer, ("квартир", "жиль", "единствен", "ипотек")):
            return False
    if primary == "mfc" and _contains_any(message, ("суд", "суда", "судеб")):
        if not (_contains_any(answer, ("мфц", "внесудеб")) and _contains_any(answer, ("суд", "судеб"))):
            return False
    if primary == "bailiffs" and not _contains_any(answer, ("исполнитель", "пристав", "удержан", "списан", "арест")):
        return False
    if primary == "income" and not _contains_any(answer, ("доход", "зарплат", "официаль", "работ", "удержан")):
        return False

    if primary == "about_assistant":
        return _contains_any(answer, ("я помога", "я могу", "чем могу"))
    return True


def _manyasha_fallback_reply_bundle(user_message: str, diagnostics: dict[str, object] | None = None) -> dict[str, object]:
    lower_message = str(user_message or "").lower()
    diagnostics = _normalize_manyasha_diagnostics(diagnostics or {})
    debt_amount = _extract_debt_amount_from_message(user_message)
    diagnostic_debt_amount = int(diagnostics.get("debt_amount_value") or 0)
    effective_debt_amount = debt_amount or diagnostic_debt_amount
    intents = _detect_manyasha_fallback_intents(user_message)
    primary = intents[0] if intents else "offtopic"
    secondary = intents[1] if len(intents) > 1 else ""
    consult = effective_debt_amount >= 500_000 or _contains_any(lower_message, _HEAVY_KEYWORDS)
    speech_reply = ""

    if primary == "about_assistant":
        intro = _pick_manyasha_variant(
            user_message,
            (
                "Я Маняша, помогаю по долгам и банкротству без перегруза юридическим языком.",
                "Я Маняша — ваш помощник по вопросам долгов, приставов и банкротства физлиц.",
                "Я Маняша, помогаю разложить долговую ситуацию по шагам и выбрать безопасный маршрут.",
            ),
        )
        reply = (
            intro
            + " Я могу сравнить МФЦ и суд, разобрать риски по имуществу, список документов и первые действия при взыскании. "
            + "Если хотите, начнём с вашей текущей суммы долга и статуса исполнительных производств."
        )
        speech_reply = "Я Маняша. Помогаю спокойно разобраться с долгами, приставами и банкротством, выбрать безопасный следующий шаг и не обещаю того, что нельзя гарантировать."
    elif primary == "mfc":
        intro = _pick_manyasha_variant(
            user_message,
            (
                "По сути, МФЦ и суд — это разные маршруты с разными условиями входа.",
                "МФЦ и судебная процедура отличаются по критериям допуска и управляемости процесса.",
                "Разница между МФЦ и судом в требованиях на вход и в контроле над сложными кейсами.",
            ),
        )
        known = _diagnostics_known_summary(diagnostics, ("debt_amount", "bailiffs", "property"))
        if known:
            followups = _build_debt_followup_questions(user_message, diagnostics)
            followup_tail = (
                "Чтобы выбрать точный вариант, уточните, пожалуйста: " + "; ".join(followups) + "."
                if followups
                else "По текущим вводным можно сравнить МФЦ и суд без повторных вопросов по уже известным данным."
            )
        else:
            followup_tail = "Чтобы выбрать точный вариант, уточните сумму долга и есть ли активные исполнительные производства."
        reply = (
            intro
            + known
            + " Внесудебный формат обычно жёстче по условиям, а судебный чаще подходит при сложном составе долгов и рисках по имуществу. "
            + followup_tail
        )
        speech_reply = "МФЦ и суд подходят для разных ситуаций. Я бы сначала проверила сумму долга, приставов и имущество, а потом выбрала более безопасный маршрут."
    elif primary == "court":
        intro = _pick_manyasha_variant(
            user_message,
            (
                "Судебное банкротство идёт по этапам и требует аккуратной подготовки документов.",
                "Судебный путь обычно строится как последовательность этапов с процессуальными сроками.",
                "Через суд процедуру ведут поэтапно: подготовка, подача и сопровождение до итогового решения.",
            ),
        )
        reply = (
            intro
            + " Сроки и нагрузка зависят от состава долгов, доказательств и позиции участников дела. "
            + "Если хотите, я помогу оценить реалистичный план под ваши вводные."
        )
        speech_reply = "Судебный путь требует подготовки документов и оценки рисков. Я помогу разложить этапы и понять, насколько он подходит под вашу ситуацию."
    elif primary == "bailiffs":
        intro = _pick_manyasha_variant(
            user_message,
            (
                "Если уже идут списания, сначала фиксируют активные исполнительные производства и основания удержаний.",
                "При действиях приставов первоочередной шаг — проверить каждое исполнительное производство и объем удержаний.",
                "Когда приставы списывают деньги, важно сразу сверить производство, удержания и правовые основания.",
            ),
        )
        debt_phrase = (
            f" При вашем долге около {_format_rub_amount(effective_debt_amount)} важно сразу зафиксировать текущую картину взыскания."
            if effective_debt_amount > 0
            else ""
        )
        known = _diagnostics_known_summary(diagnostics, ("debt_amount", "bailiffs", "income"))
        followups = _build_debt_followup_questions(user_message, diagnostics)
        followup_tail = (
            "Уточните, пожалуйста: " + "; ".join(followups) + "."
            if followups
            else "Дальше стоит проверить документы ФССП и защищённые выплаты."
        )
        reply = (
            intro
            + debt_phrase
            + known
            + " Дальше проверяют исполнительные производства, размер удержаний, защищённые выплаты и документы по ФССП; банкротство может быть системным решением, но не мгновенной кнопкой. "
            + followup_tail
        )
        speech_reply = "Если приставы списывают деньги, сначала проверяем исполнительные производства, размер удержаний и защищённые выплаты. Потом выбираем безопасный шаг."
    elif primary == "documents":
        intro = _pick_manyasha_variant(
            user_message,
            (
                "Для старта важен базовый пакет документов без лишних справок.",
                "Обычно начинают с опорного набора документов и только потом добирают уточняющие.",
                "Лучше собирать документы по приоритету, чтобы не терять время на второстепенные бумаги.",
            ),
        )
        known = _diagnostics_known_summary(diagnostics, ("bailiffs", "income", "property"))
        followups = _build_debt_followup_questions(user_message, diagnostics)
        followup_tail = (
            "Уточните, пожалуйста: " + "; ".join(followups) + "."
            if followups
            else "По текущим вводным можно сразу собрать приоритетный список документов."
        )
        reply = (
            intro
            + known
            + " В ядро обычно входят паспорт, документы по обязательствам, сведения о доходах и имуществе, плюс материалы по исполнительным производствам при их наличии. "
            + followup_tail
        )
        speech_reply = "Документы лучше собирать по приоритету: долги, доход, имущество и приставы, если они есть. Так быстрее понять, какой маршрут подходит."
    elif primary == "income":
        if _diagnostics_has_value(diagnostics, "income"):
            intro = f"По вашим словам, уже есть вводная по доходу: {diagnostics['income']}."
        else:
            intro = _pick_manyasha_variant(
                user_message,
                (
                    "Официальная работа сама по себе не делает ситуацию хуже, но влияет на расчёт дохода и возможные удержания.",
                    "Официальный доход важно учитывать спокойно: он помогает понять реальную нагрузку и порядок защиты денег.",
                    "Если вы работаете официально, сначала смотрят размер дохода, удержания и минимальную сумму, которую нужно сохранить.",
                ),
            )
        followups = _build_debt_followup_questions(user_message, diagnostics)
        followup_tail = (
            "Уточните, пожалуйста: " + "; ".join(followups) + "."
            if followups
            else "Следующий шаг — сверить размер дохода, удержания и прожиточный минимум по документам."
        )
        reply = (
            intro
            + " При банкротстве или взыскании отдельно проверяют зарплату, прожиточный минимум, иждивенцев и активные исполнительные производства. "
            + followup_tail
        )
        speech_reply = "Официальная работа не означает, что всё плохо. Нужно проверить доход, удержания, прожиточный минимум и приставов, чтобы выбрать безопасный шаг."
    elif primary == "home":
        if _diagnostics_has_value(diagnostics, "property"):
            intro = "По вашим словам, по имуществу уже есть важная вводная: " + ", ".join(diagnostics["property"][:3]) + "."  # type: ignore[index]
        else:
            intro = _pick_manyasha_variant(
                user_message,
                (
                    "Вопрос сохранения квартиры всегда зависит от статуса жилья и структуры имущества.",
                    "Сохранение жилья оценивают по юридическому статусу квартиры и сопутствующим обременениям.",
                    "По квартире важно отдельно проверить статус объекта, обременения и общий имущественный контур.",
                ),
            )
        followups = _build_debt_followup_questions(user_message, diagnostics)
        followup_tail = (
            "Уточните, пожалуйста: " + "; ".join(followups) + "."
            if followups
            else "Следующий шаг — проверить, единственное ли это жильё, есть ли залог, доли и недавние сделки."
        )
        reply = (
            intro
            + " Единственное жильё обычно защищено, но ипотека, залог, доли, сделки с имуществом и другие активы требуют отдельной проверки. "
            + followup_tail
        )
        speech_reply = "По квартире важно проверить, единственное ли это жильё, есть ли ипотека, залог, доли и сделки с имуществом. Тогда можно оценить риски."
    elif primary == "timeline":
        intro = _pick_manyasha_variant(
            user_message,
            (
                "Срок процедуры зависит от маршрута и фактической сложности дела.",
                "Точный горизонт по времени считают после первичной диагностики документов и долгового профиля.",
                "По срокам нет одного числа для всех: они зависят от сценария и деталей производства.",
            ),
        )
        reply = (
            intro
            + " По срокам МФЦ обычно быстрее, но подходит только при строгих условиях; судебная процедура чаще длится дольше и зависит от имущества, кредиторов, суда и управляющего. "
            + "Если хотите, я разложу этапы по вашей ситуации и подскажу, что может ускорить подготовку."
        )
        speech_reply = "Срок зависит от маршрута и этапов. МФЦ обычно быстрее при строгих условиях, а суд дольше и зависит от имущества, кредиторов и управляющего."
    elif primary == "collectors":
        intro = _pick_manyasha_variant(
            user_message,
            (
                "При давлении коллекторов сначала важно отделить подтверждённые требования от эмоционального давления.",
                "По звонкам коллекторов первый шаг — фиксация коммуникаций и проверка основания требований.",
                "Когда активно звонят коллекторы, лучше сразу перейти к документируемому и спокойному порядку действий.",
            ),
        )
        reply = (
            intro
            + " Фиксируйте звонки и сообщения, не передавайте лишние данные и проверьте законность требований. "
            + "Если есть нарушения или давление, можно готовить жалобу и параллельно выстраивать общий план по долгам."
        )
        speech_reply = "Если звонят коллекторы, фиксируйте обращения, не передавайте лишние данные и проверяйте законность требований. Дальше выбираем правовой шаг."
    elif primary == "debt":
        if effective_debt_amount > 0:
            intro = _pick_manyasha_variant(
                user_message,
                (
                    f"При долге около {_format_rub_amount(effective_debt_amount)} банкротство уже можно предметно проверять, но без обещаний результата.",
                    f"С суммой порядка {_format_rub_amount(effective_debt_amount)} я бы начала с быстрой диагностики рисков и подходящего маршрута.",
                    f"При долговой нагрузке около {_format_rub_amount(effective_debt_amount)} важно сразу оценить состав долгов, доход и ограничения.",
                ),
            )
            speech_reply = (
                f"При долге около {_format_rub_amount(effective_debt_amount)} стоит проверить банкротство, но сначала нужны доход, имущество, тип долгов и приставы. "
                "Так можно выбрать безопасный следующий шаг."
            )
        else:
            intro = _pick_manyasha_variant(
                user_message,
                (
                    "Понимаю. Если уже есть долги, первый шаг — быстро отделить срочные риски от обычной долговой нагрузки.",
                    "Давайте начнём с короткой диагностики: по долгам важно понять сумму, тип обязательств и текущие взыскания.",
                    "С долгами лучше не гадать: сначала проверяем состав обязательств, доход и риски по имуществу.",
                ),
            )
            speech_reply = "Понимаю. По долгам сначала проверяем сумму, тип обязательств, доход, имущество и приставов. После этого станет ясно, подходит ли банкротство или нужен другой шаг."
        known = _diagnostics_known_summary(diagnostics)
        followups = _build_debt_followup_questions(user_message, diagnostics)
        if followups:
            tail = "Чтобы дать точный следующий шаг, уточните, пожалуйста: " + "; ".join(followups) + "."
        else:
            tail = "Если хотите, я сразу предложу безопасный порядок действий по вашему текущему профилю."
        reply = (
            intro
            + known
            + " В первую очередь оценивают тип обязательств, доход, имущество и исполнительные производства."
            + " "
            + tail
        )
    else:
        reply = (
            "Я лучше всего помогаю по долгам, взысканию и банкротству физлиц, поэтому по этой теме дам точный и практичный разбор. "
            "Если вопрос не по долгам, могу коротко сориентировать и вернуться к вашему долговому сценарию."
        )
        speech_reply = "Я лучше всего помогаю по долгам, взысканию и банкротству физлиц. Если вопрос рядом с этой темой, я помогу разобрать его простыми шагами."

    if secondary and secondary != "offtopic" and secondary != primary:
        hint = _manyasha_secondary_intent_hint(secondary)
        if hint:
            reply = reply.strip() + " " + hint

    clean_reply = _enforce_female_self_reference(reply.strip())
    speech_reply = speech_reply.strip() or _speech_reply_from_reply_text(clean_reply) or clean_reply
    return {
        "reply": clean_reply,
        "speech_reply": speech_reply.strip(),
        "suggest_consultation": bool(consult),
        "mood": "empathy" if consult else "neutral",
    }


def _manyasha_fallback_text(user_message: str) -> str:
    bundle = _manyasha_fallback_reply_bundle(user_message)
    return str(bundle.get("reply") or "").strip()


def _resolve_manyasha_provider_chain(primary: str | None = None) -> list[str]:
    normalized = str(primary or MANYASHA_LLM_PROVIDER or "").strip().lower()
    if normalized not in {"navy", "ollama", "gemini", "auto"}:
        normalized = "navy"

    if normalized == "navy":
        chain = ["navy", "ollama", "gemini"]
    elif normalized == "gemini":
        chain = ["gemini", "ollama"]
    elif normalized == "auto":
        chain = ["navy", "ollama", "gemini"] if NAVY_API_KEY else ["ollama", "gemini"]
    else:
        chain = ["ollama", "gemini"]

    unique_chain: list[str] = []
    for provider in chain:
        if provider in unique_chain:
            continue
        unique_chain.append(provider)
    return unique_chain


def _manyasha_llm_complete_with_budget(messages: list[dict], timeout_seconds: float) -> tuple[str | None, str | None]:
    total_budget = max(1.5, float(timeout_seconds))
    started = perf_counter()
    provider_chain = _resolve_manyasha_provider_chain()

    for provider in provider_chain:
        elapsed = perf_counter() - started
        remaining = total_budget - elapsed
        if remaining <= 0.15:
            break
        if provider == "navy":
            out = _navy_chat_complete(messages, timeout_seconds=remaining)
            if out:
                return out, f"navy:{NAVY_MODEL}"
            continue
        if provider == "ollama":
            out = _ollama_chat_complete(messages, timeout_seconds=remaining)
            if out:
                return out, f"ollama:{OLLAMA_MODEL}"
            continue
        if provider == "gemini":
            out = _gemini_chat_complete(messages, timeout_seconds=remaining)
            if out:
                return out, f"gemini:{GEMINI_MODEL}"

    return None, None


async def _manyasha_llm_complete_with_timeout(messages: list[dict], timeout_seconds: float) -> tuple[str | None, str | None]:
    hard_timeout = max(1.5, float(timeout_seconds))
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_manyasha_llm_complete_with_budget, messages, hard_timeout),
            timeout=hard_timeout + 0.4,
        )
    except asyncio.TimeoutError:
        LLM_TIMEOUT_TOTAL.inc()
        print(f"[MANYASHA CHAT] LLM timeout after {hard_timeout:.2f}s -> fallback", flush=True)
        return None, None


@app.post("/api/manyasha/chat", response_model=ChatResponse)
async def manyasha_chat(
    request: Request,
    req: ChatRequest,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
):
    _validate_widget_embed_contract_version(req.embed_contract_version, strict=_require_widget_context_protection())
    _started = perf_counter()
    client_key = f"{auth.partner_id}:{_client_ip(request)}"
    _chat_limiter.hit(client_key, limit=max(1, int(os.getenv("WIDGET_CHAT_RATE_LIMIT", "25"))), window_seconds=60)
    resolved_partner_id = _enforce_widget_partner(auth, req.partner_id)
    if req.user_id and req.dialog_session_id:
        drow = _verify_widget_dialog_session(
            db,
            resolved_partner_id,
            req.user_id,
            req.dialog_session_id,
            auth.session_id,
        )
        if not drow:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="dialog_session_id не принадлежит текущему виджету.")
    _enforce_captcha_if_required(request, req.captcha_token)
    _enforce_payload_limit(
        req.model_dump(mode="json"),
        max_bytes=max(MAX_WIDGET_DATA_BLOB_BYTES * 2, 9000),
        detail="Payload чата слишком большой.",
    )
    # Фильтр мата — каждый раз разная тёплая формулировка
    if _MAT_PATTERNS.search(req.message):
        reply = random.choice(_MANYASHA_MAT_REPLIES)
        return ChatResponse(reply=reply, speech_reply=_build_short_speech_reply(reply))

    diagnostics = _extract_manyasha_diagnostics(req.profile)

    # ── Redis кэш ──
    _hist_dicts = [{"role": m.role, "content": m.content} for m in req.history]
    _ck = _make_cache_key(req.message, _hist_dicts, diagnostics or None)
    if _redis_client:
        try:
            _cached = _redis_client.get(_ck)
            if _cached:
                return ChatResponse(**json.loads(_cached))
        except Exception:
            pass

    # Собираем сообщения
    messages = [{"role": "system", "content": MANYASHA_SYSTEM_PROMPT}]
    if req.profile:
        role = str(req.profile.get("role") or "").strip()
        stage = str(req.profile.get("case_stage") or "").strip()
        debt_type = str(req.profile.get("debt_type") or "").strip()
        debt_amount = str(req.profile.get("debt_amount") or "").strip()
        priority = str(req.profile.get("priority") or "").strip()
        profile_line = (
            f"Контекст клиента (CRM): role={role or '-'}; stage={stage or '-'}; "
            f"debt_type={debt_type or '-'}; debt_amount={debt_amount or '-'}; priority={priority or '-'}."
        )
        messages.append({"role": "system", "content": profile_line})
    diagnostics_line = _manyasha_diagnostics_context_line(diagnostics)
    if diagnostics_line:
        messages.append({"role": "system", "content": diagnostics_line})
    if req.experiment_variants:
        exp_ctx = ", ".join(
            f"{k}:{v}" for k, v in list((req.experiment_variants or {}).items())[:5]
            if str(k).strip() and str(v).strip()
        )
        if exp_ctx:
            messages.append({"role": "system", "content": f"Активные сценарии UX: {exp_ctx}"})
    for msg in req.history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": req.message})

    # 1) Выбранный LLM provider-chain в рамках короткого бюджета  2) тематический fallback
    _llm_content, _llm_source = await _manyasha_llm_complete_with_timeout(
        messages,
        timeout_seconds=MANYASHA_CHAT_LLM_TIMEOUT_SECONDS,
    )
    _used_fallback = _llm_content is None
    speech_reply = ""
    if _used_fallback:
        print(
            f"[MANYASHA CHAT] fast fallback after {MANYASHA_CHAT_LLM_TIMEOUT_SECONDS:.2f}s budget",
            flush=True,
        )
        fallback_bundle = _manyasha_fallback_reply_bundle(req.message, diagnostics=diagnostics)
        clean = _enforce_female_self_reference(str(fallback_bundle.get("reply") or "").strip())
        suggest = bool(fallback_bundle.get("suggest_consultation"))
        mood = str(fallback_bundle.get("mood") or "neutral")
        speech_reply = str(fallback_bundle.get("speech_reply") or "").strip() or _speech_reply_from_reply_text(clean)
    else:
        content = str(_llm_content or "")
        # Фильтр CJK-символов
        cjk_pattern = re.compile(r'[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+')
        if cjk_pattern.search(content):
            print("[MANYASHA] Обнаружены CJK символы, чищу ответ", flush=True)
            content = cjk_pattern.sub('', content)
            content = re.sub(r'[ \t]{2,}', ' ', content).strip()
            content = re.sub(r'[、。，！？；：]+', '.', content)
            content = re.sub(r'\.{2,}', '.', content)
        clean, suggest, mood = _parse_markers(content)
        clean = _enforce_female_self_reference(clean)
        if not suggest:
            msg_lower = req.message.lower()
            suggest = any(kw in msg_lower for kw in _HEAVY_KEYWORDS)
            if suggest:
                print("[MANYASHA] suggest_consultation via keyword fallback", flush=True)
        if not _manyasha_reply_is_relevant(req.message, clean):
            print("[MANYASHA CHAT] relevance guard triggered -> intent fallback", flush=True)
            fallback_bundle = _manyasha_fallback_reply_bundle(req.message, diagnostics=diagnostics)
            clean = _enforce_female_self_reference(str(fallback_bundle.get("reply") or "").strip())
            suggest = bool(fallback_bundle.get("suggest_consultation"))
            mood = str(fallback_bundle.get("mood") or "neutral")
            speech_reply = str(fallback_bundle.get("speech_reply") or "").strip() or _speech_reply_from_reply_text(clean)
            _used_fallback = True
            _llm_source = None
        if not speech_reply:
            speech_reply = _speech_reply_from_reply_text(clean)
    if not speech_reply:
        speech_reply = _speech_reply_from_reply_text(clean) or clean[:220]

    resp = ChatResponse(
        reply=clean,
        speech_reply=speech_reply,
        suggest_consultation=suggest,
        mood=mood,
    )
    # Не кэшируем fallback-ответы — только настоящие ответы от LLM
    if _redis_client and not _used_fallback:
        try:
            _redis_client.setex(_ck, CHAT_CACHE_TTL, resp.model_dump_json())
        except Exception:
            pass
    if req.partner_id and req.user_id:
        try:
            if req.dialog_session_id:
                _persist_manyasha_dialog_turn(
                    db,
                    resolved_partner_id,
                    req.user_id,
                    req.dialog_session_id,
                    req.message,
                    clean,
                )
            _apply_rls_context(db, resolved_partner_id, req.user_id)
            prompt_hash = hashlib.sha256((req.message or "").strip().encode("utf-8")).digest()
            model_name = _llm_source or "fallback:intent-aware"
            db.add(LLMAuditLog(
                partner_id=resolved_partner_id,
                user_id=req.user_id,
                prompt_hash=prompt_hash,
                response_len=len(clean or ""),
                model=model_name,
                latency_ms=int((perf_counter() - _started) * 1000),
                status="ok" if not _used_fallback else "fallback",
            ))
            db.commit()
        except Exception as exc:
            db.rollback()
            print(f"[MANYASHA AUDIT] skip audit/dialog write: {exc}", flush=True)
    return resp


@app.post("/api/users", response_model=UserResponse, status_code=201)
def create_user(
    request: Request,
    req: UserCreateRequest,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> UserResponse:
    _enforce_payload_limit(
        req.model_dump(mode="json"),
        max_bytes=max(MAX_WIDGET_DATA_BLOB_BYTES * 2, 8192),
        detail="Payload пользователя слишком большой.",
    )
    _rate_limit_widget_request(
        request,
        bucket="widget_user_create",
        limit=max(1, int(os.getenv("WIDGET_USER_CREATE_RATE_LIMIT", "20"))),
        window_seconds=max(30, int(os.getenv("WIDGET_USER_CREATE_RATE_WINDOW_SECONDS", "60"))),
    )
    resolved_partner_id = _enforce_widget_partner(auth, req.partner_id)
    try:
        _apply_rls_context(db, resolved_partner_id)
        user = AppUser(
            partner_id=resolved_partner_id,
            external_subject=req.external_subject,
            nickname=req.nickname,
            locale=req.locale,
            timezone_name=req.timezone,
            pii_email_hash=_hash_pii(req.email),
            pii_phone_hash=_hash_pii(req.phone),
        )
        db.add(user)
        db.flush()
        if req.email or req.phone or req.full_name:
            db.add(UserPersonalData(
                user_id=user.user_id,
                partner_id=resolved_partner_id,
                email_enc=_encrypt_text(req.email),
                phone_enc=_encrypt_text(req.phone),
                full_name_enc=_encrypt_text(req.full_name),
                encryption_key_id="local-aesgcm-v1",
            ))
        db.commit()
        _refresh_after_commit(db, user)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        print(f"[WIDGET USERS] create_user persistence unavailable: {exc}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="User persistence temporarily unavailable",
        )
    return UserResponse(
        user_id=user.user_id,
        partner_id=user.partner_id,
        user_public_id=user.user_public_id,
        external_subject=user.external_subject,
        nickname=user.nickname,
        status=user.status,
        locale=user.locale,
        timezone=user.timezone_name,
        created_at=user.created_at,
    )


@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    partner_id: UUID,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> UserResponse:
    resolved_partner_id = _enforce_widget_partner(auth, partner_id)
    try:
        _apply_rls_context(db, resolved_partner_id)
        user = db.get(AppUser, user_id)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        print(f"[WIDGET USERS] get_user persistence unavailable: {exc}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="User persistence temporarily unavailable",
        )
    if not user or user.partner_id != resolved_partner_id:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        user_id=user.user_id,
        partner_id=user.partner_id,
        user_public_id=user.user_public_id,
        external_subject=user.external_subject,
        nickname=user.nickname,
        status=user.status,
        locale=user.locale,
        timezone=user.timezone_name,
        created_at=user.created_at,
    )


@app.put("/api/users/{user_id}/personal-data", status_code=200)
def upsert_user_personal_data(
    request: Request,
    user_id: UUID,
    req: UserPersonalDataUpsertRequest,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> dict:
    _rate_limit_widget_request(
        request,
        bucket="widget_user_personal_data",
        limit=max(1, int(os.getenv("WIDGET_USER_PERSONAL_DATA_RATE_LIMIT", "30"))),
        window_seconds=max(30, int(os.getenv("WIDGET_USER_PERSONAL_DATA_RATE_WINDOW_SECONDS", "120"))),
    )
    _enforce_payload_limit(
        req.model_dump(mode="json"),
        max_bytes=max(MAX_WIDGET_DATA_BLOB_BYTES, 8192),
        detail="Payload персональных данных слишком большой.",
    )
    resolved_partner_id = _enforce_widget_partner(auth, req.partner_id)
    _apply_rls_context(db, resolved_partner_id, user_id)
    user = db.get(AppUser, user_id)
    if not user or user.partner_id != resolved_partner_id:
        raise HTTPException(status_code=404, detail="User not found")
    user.pii_email_hash = _hash_pii(req.email) if req.email is not None else user.pii_email_hash
    user.pii_phone_hash = _hash_pii(req.phone) if req.phone is not None else user.pii_phone_hash
    row = db.get(UserPersonalData, user_id)
    if row is None:
        row = UserPersonalData(user_id=user_id, partner_id=resolved_partner_id, encryption_key_id="local-aesgcm-v1")
        db.add(row)
    if req.email is not None:
        row.email_enc = _encrypt_text(req.email)
    if req.phone is not None:
        row.phone_enc = _encrypt_text(req.phone)
    if req.full_name is not None:
        row.full_name_enc = _encrypt_text(req.full_name)
    if req.notes is not None:
        row.notes_enc = _encrypt_text(req.notes)
    row.updated_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@app.post("/api/dialog/sessions", status_code=201)
def create_dialog_session(
    request: Request,
    req: DialogSessionCreateRequest,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> dict:
    _rate_limit_widget_request(
        request,
        bucket="dialog_session_create",
        limit=max(1, int(os.getenv("WIDGET_DIALOG_SESSION_CREATE_RATE_LIMIT", "30"))),
        window_seconds=max(30, int(os.getenv("WIDGET_DIALOG_SESSION_CREATE_RATE_WINDOW_SECONDS", "120"))),
    )
    _enforce_payload_limit(
        req.model_dump(mode="json"),
        max_bytes=max(MAX_WIDGET_DATA_BLOB_BYTES, 8192),
        detail="Payload диалог-сессии слишком большой.",
    )
    resolved_partner_id = _enforce_widget_partner(auth, req.partner_id)
    try:
        _apply_rls_context(db, resolved_partner_id, req.user_id)
        user = db.get(AppUser, req.user_id)
        if not user or user.partner_id != resolved_partner_id:
            raise HTTPException(status_code=404, detail="User not found")
        session = DialogSession(
            partner_id=resolved_partner_id,
            user_id=req.user_id,
            user_public_id_snapshot=user.user_public_id,
            channel=req.channel,
            title=req.title,
            meta_json=req.metadata or {},
        )
        db.add(session)
        db.commit()
        _refresh_after_commit(db, session)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        print(f"[WIDGET DIALOG] create_dialog_session persistence unavailable: {exc}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dialog persistence temporarily unavailable",
        )
    return {
        "session_id": str(session.session_id),
        "partner_id": str(session.partner_id),
        "user_id": str(session.user_id),
        "started_at": session.started_at.isoformat(),
        "channel": session.channel,
        "title": session.title,
    }


@app.get("/api/dialog/sessions/{session_id}")
def get_dialog_session(
    request: Request,
    session_id: UUID,
    partner_id: UUID,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> dict:
    _rate_limit_widget_request(
        request,
        bucket="dialog_session_get",
        limit=max(1, int(os.getenv("WIDGET_DIALOG_SESSION_GET_RATE_LIMIT", "80"))),
        window_seconds=max(30, int(os.getenv("WIDGET_DIALOG_SESSION_GET_RATE_WINDOW_SECONDS", "60"))),
    )
    resolved_partner_id = _enforce_widget_partner(auth, partner_id)
    _apply_rls_context(db, resolved_partner_id)
    row = db.get(DialogSession, session_id)
    if not row or row.partner_id != resolved_partner_id:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": str(row.session_id),
        "partner_id": str(row.partner_id),
        "user_id": str(row.user_id),
        "user_public_id_snapshot": str(row.user_public_id_snapshot),
        "channel": row.channel,
        "title": row.title,
        "started_at": row.started_at.isoformat(),
        "ended_at": row.ended_at.isoformat() if row.ended_at else None,
        "metadata": row.meta_json,
    }


@app.post("/api/dialog/sessions/{session_id}/messages", status_code=201)
def add_dialog_message(
    request: Request,
    session_id: UUID,
    req: DialogMessageCreateRequest,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> dict:
    _rate_limit_widget_request(
        request,
        bucket="dialog_message_post",
        limit=max(1, int(os.getenv("WIDGET_DIALOG_MESSAGE_RATE_LIMIT", "120"))),
        window_seconds=max(30, int(os.getenv("WIDGET_DIALOG_MESSAGE_RATE_WINDOW_SECONDS", "60"))),
    )
    _enforce_payload_limit(
        req.model_dump(mode="json"),
        max_bytes=max(MAX_WIDGET_DATA_BLOB_BYTES, 8192),
        detail="Payload сообщения слишком большой.",
    )
    resolved_partner_id = _enforce_widget_partner(auth, req.partner_id)
    _apply_rls_context(db, resolved_partner_id, req.user_id)
    row = db.get(DialogSession, session_id)
    if not row or row.partner_id != resolved_partner_id:
        raise HTTPException(status_code=404, detail="Session not found")
    last = (
        db.query(DialogMessage)
        .filter(DialogMessage.session_id == session_id)
        .order_by(DialogMessage.seq_no.desc())
        .first()
    )
    seq_no = (last.seq_no + 1) if last else 1
    enc_content = _encrypt_text(req.content) or b""
    content_hash = hashlib.sha256(req.content.encode("utf-8")).digest()
    msg = DialogMessage(
        partner_id=resolved_partner_id,
        session_id=session_id,
        user_id=req.user_id,
        seq_no=seq_no,
        role=req.role[:16],
        prompt_text_enc=enc_content,
        content_sha256=content_hash,
        token_count_input=req.token_count_input,
        token_count_output=req.token_count_output,
        meta_json=req.metadata or {},
    )
    db.add(msg)
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok", "message_id": str(msg.message_id), "seq_no": seq_no}


@app.get("/api/dialog/sessions/{session_id}/messages")
def list_dialog_messages(
    request: Request,
    session_id: UUID,
    partner_id: UUID,
    limit: int = 100,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> list[dict]:
    _rate_limit_widget_request(
        request,
        bucket="dialog_messages_list",
        limit=max(1, int(os.getenv("WIDGET_DIALOG_MESSAGES_LIST_RATE_LIMIT", "90"))),
        window_seconds=max(30, int(os.getenv("WIDGET_DIALOG_MESSAGES_LIST_RATE_WINDOW_SECONDS", "60"))),
    )
    resolved_partner_id = _enforce_widget_partner(auth, partner_id)
    _apply_rls_context(db, resolved_partner_id)
    row = db.get(DialogSession, session_id)
    if not row or row.partner_id != resolved_partner_id:
        return []
    items = (
        db.query(DialogMessage)
        .filter(DialogMessage.session_id == session_id, DialogMessage.partner_id == resolved_partner_id)
        .order_by(DialogMessage.seq_no.asc())
        .limit(max(1, min(limit, 500)))
        .all()
    )
    return [{
        "message_id": str(m.message_id),
        "seq_no": m.seq_no,
        "role": m.role,
        "content_sha256": m.content_sha256,
        "token_count_input": m.token_count_input,
        "token_count_output": m.token_count_output,
        "created_at": m.created_at.isoformat(),
        "metadata": m.meta_json,
    } for m in items]


# ──────────────────────────────────────────────
# Заявки на консультацию
# ──────────────────────────────────────────────

class ConsultationRequest(Base):
    __tablename__ = "consultation_requests"

    id: Mapped[UUID] = mapped_column(PortableUUID(), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    question: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class ConsultationRequestCreate(BaseModel):
    name: str = Field(min_length=1, max_length=MAX_WIDGET_FIELD_LEN)
    phone: str = Field(min_length=3, max_length=64)
    email: str = Field(default="", max_length=MAX_WIDGET_FIELD_LEN)
    question: str = Field(default="", max_length=MAX_WIDGET_REASON_LEN)
    session_id: str = Field(min_length=1, max_length=64)
    diagnostics: dict = Field(default_factory=dict)
    diagnostic_summary: dict = Field(default_factory=dict)
    metadata: dict = Field(default_factory=dict)
    captcha_token: str | None = Field(default=None, max_length=2048)
    website: str = Field(default="", max_length=64)


@app.post("/api/consultation-request", status_code=201)
def submit_consultation_request(
    request: Request,
    req: ConsultationRequestCreate,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    _enforce_widget_session(auth, req.session_id)
    if req.website.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid lead payload.")
    _rate_limit_widget_request(
        request,
        bucket="consultation_request",
        limit=max(1, int(os.getenv("WIDGET_CONSULTATION_RATE_LIMIT", "8"))),
        window_seconds=max(30, int(os.getenv("WIDGET_CONSULTATION_RATE_WINDOW_SECONDS", "300"))),
    )
    _enforce_payload_limit(
        req.model_dump(mode="json"),
        max_bytes=max(MAX_WIDGET_DATA_BLOB_BYTES, 8192),
        detail="Consultation payload слишком большой.",
    )
    _enforce_captcha_if_required(request, req.captcha_token)

    entry = ConsultationRequest(
        name=req.name.strip(),
        phone=req.phone.strip(),
        email=req.email.strip(),
        question=req.question.strip(),
    )
    db.add(entry)
    db.commit()

    # CRM webhook
    if CRM_WEBHOOK_URL:
        try:
            lead_metadata = _attach_diagnostics_lead_packet(
                req.metadata if isinstance(req.metadata, dict) else {},
                req.diagnostics,
                req.diagnostic_summary,
            )
            payload = json.dumps({
                "name": req.name.strip(),
                "phone": req.phone.strip(),
                "email": req.email.strip(),
                "question": req.question.strip(),
                "session_id": req.session_id,
                "partner_id": str(auth.partner_id),
                "source": "manyasha_widget",
                "metadata": lead_metadata,
            }).encode("utf-8")
            crm_req = urllib_request.Request(
                url=CRM_WEBHOOK_URL,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            urllib_request.urlopen(crm_req, timeout=5)
        except Exception as e:
            print(f"[CRM] Webhook error: {e}", flush=True)

    return {"status": "accepted"}


# ──────────────────────────────────────────────
# Аналитика событий
# ──────────────────────────────────────────────

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[UUID] = mapped_column(PortableUUID(), primary_key=True, default=uuid4)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    data: Mapped[dict] = mapped_column(SAJSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class WidgetHandoffTicket(Base):
    __tablename__ = "widget_handoff_tickets"

    ticket_id: Mapped[UUID] = mapped_column(PortableUUID(), primary_key=True, default=uuid4)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    partner_id: Mapped[UUID | None] = mapped_column(PortableUUID(), nullable=True, index=True)
    user_id: Mapped[UUID | None] = mapped_column(PortableUUID(), nullable=True, index=True)
    dialog_session_id: Mapped[UUID | None] = mapped_column(PortableUUID(), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="queued", index=True)
    priority: Mapped[str] = mapped_column(String(16), nullable=False, default="normal")
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    category: Mapped[str] = mapped_column(String(48), nullable=False, default="general")
    queue_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    eta_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sla_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=WIDGET_HUMAN_HANDOFF_SLA_SEC)
    requested_channel: Mapped[str] = mapped_column(String(24), nullable=False, default="web_chat")
    target_channel: Mapped[str] = mapped_column(String(24), nullable=False, default="phone")
    operator_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    handoff_context: Mapped[dict] = mapped_column(SAJSON, nullable=False, default=dict)
    transcript_tail: Mapped[list] = mapped_column(SAJSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AnalyticsEventCreate(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)
    event_type: str = Field(min_length=1, max_length=64)
    data: dict = Field(default_factory=dict)


class EscalationEvalRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    context: dict = Field(default_factory=dict)


class EscalationEvalResponse(BaseModel):
    should_handoff: bool
    risk_level: str
    priority: str
    category: str
    sla_seconds: int
    reasons: list[str] = Field(default_factory=list)


class HandoffRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)
    reason: str = Field(default="", max_length=MAX_WIDGET_REASON_LEN)
    category: str = Field(default="general", max_length=48)
    risk_level: str = Field(default="medium", max_length=16)
    priority: str = Field(default="normal", max_length=16)
    requested_channel: str = Field(default="web_chat", max_length=24)
    preferred_channel: str = Field(default="phone", max_length=24)
    partner_id: UUID | None = None
    user_id: UUID | None = None
    dialog_session_id: UUID | None = None
    context: dict = Field(default_factory=dict)
    transcript_tail: list[dict] = Field(default_factory=list)
    captcha_token: str | None = Field(default=None, max_length=2048)
    website: str = Field(default="", max_length=64)


class HandoffTicketResponse(BaseModel):
    ticket_id: UUID
    status: str
    queue_position: int | None = None
    eta_seconds: int | None = None
    sla_seconds: int
    priority: str
    risk_level: str
    category: str
    requested_channel: str
    target_channel: str
    operator_name: str | None = None
    created_at: datetime
    updated_at: datetime


class HandoffTicketLeadListItem(BaseModel):
    ticket_id: UUID
    partner_id: UUID | None = None
    status: str
    priority: str
    risk_level: str
    category: str
    channel: str
    requested_channel: str
    target_channel: str
    lead_reason: str
    operator_note: str = ""
    contact: dict = Field(default_factory=dict)
    diagnostic_summary: dict = Field(default_factory=dict)
    report_email_sent: bool = False
    report_email_sent_at: datetime | None = None
    report_email_status: str = ""
    report_email_masked: str = ""
    quality_score: int = 0
    quality_label: str = "low"
    quality_reasons: list[str] = Field(default_factory=list)
    next_best_action: str = "request_documents"
    next_best_action_reason: str = "Недостаточно данных для уверенного следующего шага."
    readiness_state: str = "needs_more_info"
    readiness_label: str = "Нужно уточнить"
    readiness_reasons: list[str] = Field(default_factory=list)
    blocking_items: list[str] = Field(default_factory=list)
    recommended_operator_action: str = "Уточните вводные и запросите базовые документы."
    created_at: datetime
    updated_at: datetime


class HandoffTicketLeadTimelineItem(BaseModel):
    kind: str
    label: str
    at: datetime | None = None
    detail: str = ""


class HandoffTicketDocumentChecklistItem(BaseModel):
    key: str
    title: str
    reason: str
    priority: str
    source: str


class HandoffTicketFollowUpMessage(BaseModel):
    text: str = ""
    sections: list[str] = Field(default_factory=list)
    tone: str = "calm/professional"
    warnings: list[str] = Field(default_factory=list)


class HandoffTicketDecisionChecklistItem(BaseModel):
    key: str
    title: str
    reason: str
    source: str
    required: bool = False
    done: bool = False


class HandoffTicketInternalCaseSummary(BaseModel):
    text: str = ""
    sections: list[str] = Field(default_factory=list)
    generated_at: datetime | None = None


class HandoffTicketLeadDetailItem(HandoffTicketLeadListItem):
    timeline: list[HandoffTicketLeadTimelineItem] = Field(default_factory=list)
    document_checklist: list[HandoffTicketDocumentChecklistItem] = Field(default_factory=list)
    decision_checklist: list[HandoffTicketDecisionChecklistItem] = Field(default_factory=list)
    follow_up_message: HandoffTicketFollowUpMessage = Field(default_factory=HandoffTicketFollowUpMessage)
    internal_case_summary: HandoffTicketInternalCaseSummary = Field(default_factory=HandoffTicketInternalCaseSummary)


class HandoffStatusUpdateRequest(BaseModel):
    status: str
    operator_name: str | None = None
    queue_position: int | None = None
    eta_seconds: int | None = None


class HandoffTicketLeadStatusUpdateRequest(BaseModel):
    status: str


class HandoffTicketLeadNoteUpdateRequest(BaseModel):
    note: str = Field(default="", max_length=1000)


class HandoffTicketLeadChecklistUpdateRequest(BaseModel):
    item_key: str = Field(min_length=1, max_length=64)
    done: bool


class KBSearchResponseItem(BaseModel):
    id: str
    title: str
    category: str
    snippet: str
    score: float


class QualityDashboardResponse(BaseModel):
    period_days: int
    sessions_total: int
    resolution_rate: float
    escalation_rate: float
    failed_rate: float
    negative_cx_rate: float
    first_response_ms_avg: float
    csat_avg: float | None = None
    totals: dict
    by_day: list[dict]


def _normalize_escalation_level(raw: str | None) -> str:
    val = (raw or "").strip().lower()
    if val in {"low", "medium", "high", "critical"}:
        return val
    return "medium"


def _normalize_priority(raw: str | None) -> str:
    val = (raw or "").strip().lower()
    if val in {"low", "normal", "high", "urgent"}:
        return val
    return "normal"


def _normalize_handoff_status(raw: str | None) -> str:
    val = (raw or "").strip().lower()
    if val in {"queued", "assigned", "active", "resolved", "canceled", "failed"}:
        return val
    return "queued"


HANDOFF_LEAD_ALLOWED_STATUSES = {"new", "contacted", "qualified", "closed"}
HANDOFF_LEAD_FILTER_RISK_LEVELS = {"low", "medium", "high", "critical"}


def _normalize_handoff_lead_status(raw: str | None) -> str:
    val = (raw or "").strip().lower()
    if val in HANDOFF_LEAD_ALLOWED_STATUSES:
        return val
    if val in {"queued", "assigned", "active", "resolved", "canceled", "failed"}:
        return {
            "queued": "new",
            "assigned": "contacted",
            "active": "contacted",
            "resolved": "closed",
            "canceled": "closed",
            "failed": "closed",
        }.get(val, "new")
    return "new"


def _handoff_lead_status_storage_values(raw: str | None) -> list[str]:
    status_value = _normalize_handoff_lead_status(raw)
    if status_value == "new":
        return ["new", "queued"]
    if status_value == "contacted":
        return ["contacted", "assigned", "active"]
    if status_value == "closed":
        return ["closed", "resolved", "canceled", "failed"]
    return [status_value]


def _parse_handoff_lead_status_filter(raw: str | None) -> str:
    val = (raw or "").strip().lower()
    if not val or val == "all":
        return ""
    if val not in HANDOFF_LEAD_ALLOWED_STATUSES and val not in {"queued", "assigned", "active", "resolved", "canceled", "failed"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недопустимый фильтр статуса заявки.")
    return _normalize_handoff_lead_status(val)


def _parse_handoff_lead_risk_filter(raw: str | None) -> str:
    val = (raw or "").strip().lower()
    if not val or val == "all":
        return ""
    if val not in HANDOFF_LEAD_FILTER_RISK_LEVELS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недопустимый фильтр риска заявки.")
    return val


def _handoff_lead_risk_filter_values(raw: str | None) -> list[str]:
    risk = _parse_handoff_lead_risk_filter(raw)
    if risk == "high":
        return ["high", "critical"]
    return [risk] if risk else []


def _escalation_sla_seconds(risk_level: str, priority: str) -> int:
    base = WIDGET_HUMAN_HANDOFF_SLA_SEC
    if risk_level in {"high", "critical"}:
        base = max(60, int(base * 0.6))
    elif risk_level == "low":
        base = max(90, int(base * 1.25))
    if priority == "urgent":
        base = max(45, int(base * 0.7))
    elif priority == "low":
        base = max(90, int(base * 1.3))
    return int(base)


def _estimate_handoff_eta_seconds(queue_position: int, risk_level: str, priority: str) -> int:
    queue_position = max(1, int(queue_position or 1))
    eta = WIDGET_HUMAN_HANDOFF_BASE_ETA_SEC + (queue_position - 1) * 70
    if risk_level in {"high", "critical"}:
        eta = int(eta * 0.78)
    if priority == "urgent":
        eta = int(eta * 0.74)
    elif priority == "high":
        eta = int(eta * 0.86)
    elif priority == "low":
        eta = int(eta * 1.22)
    return int(min(max(30, eta), 1800))


def _extract_debt_amount(context: dict) -> int:
    if not isinstance(context, dict):
        return 0
    raw = context.get("debt_amount")
    if raw is None and isinstance(context.get("diagnostics"), dict):
        diagnostics = context.get("diagnostics") or {}
        raw = diagnostics.get("debt_amount_value") or diagnostics.get("debt_amount")
    if raw is None:
        return 0
    try:
        text = str(raw).lower().replace(" ", "").replace(",", ".")
        text = re.sub(r"[^\d.]", "", text)
        if not text:
            return 0
        if "." in text:
            return int(float(text))
        return int(text)
    except Exception:
        return 0


def _evaluate_escalation(message: str, history: list[ChatMessage], context: dict) -> EscalationEvalResponse:
    msg = (message or "").strip().lower()
    hist_joined = " ".join((m.content or "").strip().lower() for m in history[-8:] if m and m.content)
    text = (msg + " " + hist_joined).strip()

    high_keywords = [
        "угрож", "коллектор", "арест", "пристав", "исполнительн", "блокиров",
        "мошеннич", "уголов", "срочно", "сегодня суд", "повестк", "изъят",
    ]
    medium_keywords = [
        "банкрот", "долг", "кредит", "микрозайм", "мфо", "просроч",
        "реструктур", "рефинанс", "график платеж",
    ]
    negative_cx_keywords = ["бесполез", "ужас", "не помогло", "плох", "не работает", "ошибка"]

    reasons: list[str] = []
    risk_points = 0

    if any(k in text for k in high_keywords):
        risk_points += 3
        reasons.append("Обнаружены высокорисковые юридические триггеры (приставы/арест/угрозы).")
    if any(k in text for k in medium_keywords):
        risk_points += 1
    if any(k in text for k in negative_cx_keywords):
        risk_points += 2
        reasons.append("Негативный CX-сигнал: нужен приоритетный разбор человеком.")

    debt_amount = _extract_debt_amount(context or {})
    if debt_amount >= 1_000_000:
        risk_points += 3
        reasons.append("Крупная сумма долга (>= 1 млн).")
    elif debt_amount >= 500_000:
        risk_points += 2
        reasons.append("Сумма долга >= 500 тыс.")

    case_stage = str((context or {}).get("case_stage") or "").strip().lower()
    if case_stage in {"critical", "enforcement", "court"}:
        risk_points += 2
        reasons.append("Стадия кейса требует ускоренной эскалации.")

    if len([m for m in history if (m.role or "").lower() == "user"]) >= 5 and not reasons:
        risk_points += 1
        reasons.append("Длинный диалог без явного закрытия запроса.")

    forced = str((context or {}).get("force_handoff") or "").strip().lower() in {"1", "true", "yes"}
    if forced:
        risk_points += 99
        reasons.append("Handoff принудительно включен бизнес-правилом.")

    if risk_points >= 7:
        risk_level = "critical"
        priority = "urgent"
    elif risk_points >= 4:
        risk_level = "high"
        priority = "high"
    elif risk_points >= 2:
        risk_level = "medium"
        priority = "normal"
    else:
        risk_level = "low"
        priority = "low"

    category = "general"
    if any(k in text for k in ("арест", "пристав", "исполнительн", "изъят")):
        category = "enforcement"
    elif any(k in text for k in ("коллектор", "угрож")):
        category = "collector_pressure"
    elif any(k in text for k in ("мошеннич", "уголов", "суд")):
        category = "legal_risk"
    elif "банкрот" in text:
        category = "bankruptcy_strategy"

    should_handoff = forced or risk_level in {"high", "critical"} or ("оператор" in text or "юрист" in text)
    sla_seconds = _escalation_sla_seconds(risk_level, priority)

    return EscalationEvalResponse(
        should_handoff=should_handoff,
        risk_level=risk_level,
        priority=priority,
        category=category,
        sla_seconds=sla_seconds,
        reasons=reasons,
    )


def _serialize_handoff_ticket(ticket: WidgetHandoffTicket) -> HandoffTicketResponse:
    return HandoffTicketResponse(
        ticket_id=ticket.ticket_id,
        status=ticket.status,
        queue_position=ticket.queue_position,
        eta_seconds=ticket.eta_seconds,
        sla_seconds=ticket.sla_seconds,
        priority=ticket.priority,
        risk_level=ticket.risk_level,
        category=ticket.category,
        requested_channel=ticket.requested_channel,
        target_channel=ticket.target_channel,
        operator_name=ticket.operator_name,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


def _handoff_ticket_diagnostic_summary(ticket: WidgetHandoffTicket) -> dict[str, object]:
    context = ticket.handoff_context if isinstance(ticket.handoff_context, dict) else {}
    return _manyasha_diagnostics_lead_packet(
        context.get("diagnostics") or context.get("diagnostic_summary") or {}
    )


def _handoff_lead_reason(ticket: WidgetHandoffTicket, diagnostics: dict[str, object]) -> str:
    risk_reasons = diagnostics.get("risk_reasons")
    if isinstance(risk_reasons, list) and risk_reasons:
        return "Причины риска: " + ", ".join(str(item) for item in risk_reasons[:3])
    reason = _diagnostic_text(ticket.reason, limit=220)
    if reason:
        return reason
    return "Клиент запросил консультацию."


def _handoff_operator_note(ticket: WidgetHandoffTicket) -> str:
    context = ticket.handoff_context if isinstance(ticket.handoff_context, dict) else {}
    note = context.get("operator_note")
    if note is None:
        return ""
    return str(note).strip()[:1000]


def _handoff_contact_text(raw: object, limit: int = 160) -> str:
    return re.sub(r"[\r\n\t]+", " ", str(raw or "")).strip()[:limit]


def _handoff_ticket_contact_summary(ticket: WidgetHandoffTicket) -> dict[str, str]:
    context = ticket.handoff_context if isinstance(ticket.handoff_context, dict) else {}
    nested_sources = [
        context.get("contact"),
        context.get("lead_contact"),
        context.get("contact_summary"),
    ]
    contact: dict[str, str] = {}

    def first_value(*keys: str) -> str:
        for key in keys:
            value = _handoff_contact_text(context.get(key))
            if value:
                return value
        for source in nested_sources:
            if isinstance(source, dict):
                for key in keys:
                    value = _handoff_contact_text(source.get(key))
                    if value:
                        return value
        return ""

    name = first_value("name", "full_name", "contact_name")
    phone = first_value("phone", "contact_phone")
    email = first_value("email", "contact_email")
    if name:
        contact["name"] = name
    if phone:
        contact["phone"] = phone
    if email:
        contact["email"] = email
    return contact


def _report_email_summary(row: object | None) -> dict[str, object]:
    if not row:
        return {
            "report_email_sent": False,
            "report_email_sent_at": None,
            "report_email_status": "",
            "report_email_masked": "",
        }
    return {
        "report_email_sent": True,
        "report_email_sent_at": getattr(row, "created_at", None),
        "report_email_status": _diagnostic_text(getattr(row, "status", ""), limit=32) or "sent",
        "report_email_masked": _diagnostic_text(getattr(row, "email_masked", ""), limit=160),
    }


def _handoff_case_quality(
    ticket: WidgetHandoffTicket,
    diagnostics: dict[str, object],
    contact: dict[str, str],
    report_email: dict[str, object],
) -> dict[str, object]:
    score = 10
    reasons: list[str] = []

    risk_level = str(diagnostics.get("risk_level") or ticket.risk_level or "").strip().lower()
    if risk_level in {"critical", "high"}:
        score += 26 if risk_level == "high" else 32
        reasons.append("высокий риск по диагностике")
    elif risk_level == "medium":
        score += 12
        reasons.append("средний риск требует проверки")

    debt_amount = _extract_debt_amount_from_message(str(diagnostics.get("debt_amount") or ""))
    if debt_amount >= 1_000_000:
        score += 22
        reasons.append("крупная сумма долга")
    elif debt_amount >= 500_000:
        score += 16
        reasons.append("долг выше порога банкротства")
    elif debt_amount > 0:
        score += 8
        reasons.append("сумма долга уже известна")

    bailiffs_text = str(diagnostics.get("bailiffs") or "").lower()
    if bailiffs_text:
        score += 16
        reasons.append("есть приставы или списания")

    property_items = diagnostics.get("property")
    if isinstance(property_items, list) and property_items:
        score += 10
        reasons.append("есть имущество для проверки")

    collectors_text = str(diagnostics.get("collectors") or "").lower()
    if collectors_text:
        score += 8
        reasons.append("есть контакт с коллекторами")

    known_count = 0
    try:
        known_count = int(diagnostics.get("known_count") or 0)
    except Exception:
        known_count = 0
    if known_count >= 4:
        score += 8
        reasons.append("собрано достаточно вводных")
    elif known_count >= 2:
        score += 4

    if contact.get("phone") or contact.get("email"):
        score += 10
        reasons.append("есть контакт для связи")
    else:
        score -= 8
        reasons.append("нет контакта для быстрого звонка")

    if report_email.get("report_email_sent"):
        score += 5
        reasons.append("клиент уже получил мини-отчёт")

    missing_fields = diagnostics.get("missing_fields")
    missing_list = missing_fields if isinstance(missing_fields, list) else []
    if missing_list:
        score -= min(18, len(missing_list) * 5)
        reasons.append("есть недостающие данные")

    score = max(0, min(100, score))
    if score >= 78:
        label = "urgent"
    elif score >= 60:
        label = "high"
    elif score >= 35:
        label = "medium"
    else:
        label = "low"

    missing_text = " ".join(str(item).lower() for item in missing_list)
    route_hint = str(diagnostics.get("route_hint") or "").lower()
    has_contact = bool(contact.get("phone") or contact.get("email"))
    if has_contact and report_email.get("report_email_sent") and risk_level in {"critical", "high"}:
        action = "call_client"
        action_reason = "Высокий риск и клиент уже получил мини-отчёт: лучше позвонить и сверить документы."
    elif has_contact and score >= 78:
        action = "call_client"
        action_reason = "Лид приоритетный: есть контакт и несколько значимых факторов риска."
    elif "доход" in missing_text:
        action = "clarify_income"
        action_reason = "Нужно уточнить доход, удержания и прожиточный минимум."
    elif "имуществ" in missing_text or "квартир" in missing_text or "жиль" in missing_text:
        action = "clarify_property"
        action_reason = "Нужно уточнить имущество, залог, доли и единственное жильё."
    elif "пристав" in missing_text or "ип" in missing_text or "исполнитель" in missing_text:
        action = "check_bailiffs"
        action_reason = "Нужно проверить исполнительные производства и основания списаний."
    elif "мфц" in route_hint or "mfc" in route_hint:
        action = "review_mfc_eligibility"
        action_reason = "Нужно проверить, подходит ли внесудебная процедура через МФЦ."
    elif score < 30:
        action = "request_documents"
        action_reason = "Данных мало: попросите базовые документы и уточните вводные."
    elif risk_level == "low" and _normalize_handoff_lead_status(ticket.status) == "closed":
        action = "close_low_fit"
        action_reason = "Низкий риск и заявка закрыта: достаточно зафиксировать итог."
    else:
        action = "request_documents"
        action_reason = "Следующий безопасный шаг — запросить документы и подтвердить вводные."

    deduped_reasons: list[str] = []
    for reason in reasons:
        text = _diagnostic_text(reason, limit=90)
        if text and text not in deduped_reasons:
            deduped_reasons.append(text)

    return {
        "quality_score": score,
        "quality_label": label,
        "quality_reasons": deduped_reasons[:5],
        "next_best_action": action,
        "next_best_action_reason": _diagnostic_text(action_reason, limit=220),
    }


def _handoff_document_item(
    items: list[HandoffTicketDocumentChecklistItem],
    keys: set[str],
    *,
    key: str,
    title: str,
    reason: str,
    priority: str,
    source: str,
) -> None:
    if key in keys:
        return
    normalized_priority = priority if priority in {"required", "recommended", "optional"} else "recommended"
    normalized_source = _diagnostic_text(source, limit=32) or "identity"
    items.append(
        HandoffTicketDocumentChecklistItem(
            key=_diagnostic_text(key, limit=64),
            title=_diagnostic_text(title, limit=120),
            reason=_diagnostic_text(reason, limit=180),
            priority=normalized_priority,
            source=normalized_source,
        )
    )
    keys.add(key)


def _handoff_document_checklist(
    diagnostics: dict[str, object],
    next_best_action: str = "",
) -> list[HandoffTicketDocumentChecklistItem]:
    items: list[HandoffTicketDocumentChecklistItem] = []
    keys: set[str] = set()

    def add(**kwargs: str) -> None:
        _handoff_document_item(items, keys, **kwargs)

    add(
        key="passport",
        title="Паспорт клиента",
        reason="Нужен для первичной идентификации и проверки документов.",
        priority="required",
        source="identity",
    )
    add(
        key="snils_inn",
        title="СНИЛС и ИНН",
        reason="Помогают проверить долги, исполнительные производства и судебные сведения.",
        priority="recommended",
        source="identity",
    )

    debt_types = " ".join(str(item).lower() for item in diagnostics.get("debt_types", []) if item)
    debt_amount = _diagnostic_text(diagnostics.get("debt_amount"))
    if debt_amount or any(token in debt_types for token in ("кредит", "мфо", "микроз", "карта", "банк")):
        add(
            key="credit_agreements",
            title="Кредитные договоры, МФО и графики платежей",
            reason="Нужны, чтобы сверить состав долгов и условия просрочки.",
            priority="required",
            source="debt",
        )
        add(
            key="debt_statements",
            title="Справки о задолженности от банков и МФО",
            reason="Показывают текущий размер долга, штрафы и дату просрочки.",
            priority="required",
            source="debt",
        )
    if any(token in debt_types for token in ("жкх", "налог")):
        add(
            key="utility_tax_debts",
            title="Квитанции ЖКХ или налоговые требования",
            reason="Нужны для отдельной проверки долгов не перед банками.",
            priority="recommended",
            source="debt",
        )

    bailiffs_text = str(diagnostics.get("bailiffs") or "").lower()
    if bailiffs_text or next_best_action == "check_bailiffs":
        add(
            key="fssp_proceedings",
            title="Сведения ФССП об исполнительных производствах",
            reason="Нужно понять основания, суммы и пристава по каждому производству.",
            priority="required",
            source="bailiffs",
        )
        add(
            key="bailiff_orders",
            title="Постановления приставов и документы о списаниях",
            reason="Помогают проверить законность удержаний и защищённые выплаты.",
            priority="required",
            source="bailiffs",
        )

    income_text = str(diagnostics.get("income") or "").lower()
    if income_text or next_best_action == "clarify_income":
        add(
            key="income_certificate",
            title="Справка о доходах или расчётные листки",
            reason="Нужны для оценки удержаний, прожиточного минимума и платежеспособности.",
            priority="required",
            source="income",
        )
        add(
            key="bank_statements",
            title="Выписки по основным банковским счетам",
            reason="Показывают поступления, списания и регулярные платежи.",
            priority="recommended",
            source="income",
        )

    property_items = diagnostics.get("property")
    property_text = " ".join(str(item).lower() for item in property_items if item) if isinstance(property_items, list) else ""
    if property_text or next_best_action == "clarify_property":
        add(
            key="egrn_extract",
            title="Выписка ЕГРН по недвижимости",
            reason="Нужна для проверки жилья, долей, обременений и залога.",
            priority="required",
            source="property",
        )
        if any(token in property_text for token in ("ипотек", "залог")) or next_best_action == "clarify_property":
            add(
                key="mortgage_documents",
                title="Ипотечный договор и сведения о залоге",
                reason="Ипотека и залог требуют отдельной проверки рисков для жилья.",
                priority="required",
                source="property",
            )
        if any(token in property_text for token in ("машин", "авто")):
            add(
                key="vehicle_documents",
                title="Документы на автомобиль",
                reason="Авто нужно проверить как имущество и возможный предмет реализации.",
                priority="recommended",
                source="property",
            )

    collectors_text = str(diagnostics.get("collectors") or "").lower()
    if collectors_text:
        add(
            key="collector_messages",
            title="Сообщения, звонки и требования коллекторов",
            reason="Нужны, чтобы оценить законность общения и подготовить жалобу при нарушениях.",
            priority="recommended",
            source="collectors",
        )

    route_hint = str(diagnostics.get("route_hint") or "").lower()
    if "мфц" in route_hint or "mfc" in route_hint or next_best_action == "review_mfc_eligibility":
        add(
            key="mfc_eligibility_docs",
            title="Документы для проверки условий МФЦ",
            reason="Нужно подтвердить, что внесудебная процедура действительно подходит.",
            priority="recommended",
            source="route",
        )

    priority_order = {"required": 0, "recommended": 1, "optional": 2}
    return sorted(items, key=lambda item: (priority_order.get(item.priority, 9), item.source, item.title))[:12]


def _handoff_follow_up_message(
    diagnostics: dict[str, object],
    document_checklist: list[HandoffTicketDocumentChecklistItem],
    next_best_action: str = "",
) -> HandoffTicketFollowUpMessage:
    known_parts: list[str] = []
    debt_amount = _diagnostic_text(diagnostics.get("debt_amount"), limit=80)
    if debt_amount:
        known_parts.append(f"сумма долга: {debt_amount}")
    bailiffs = _diagnostic_text(diagnostics.get("bailiffs"), limit=80)
    if bailiffs:
        known_parts.append(f"приставы/списания: {bailiffs}")
    income = _diagnostic_text(diagnostics.get("income"), limit=80)
    if income:
        known_parts.append(f"доход: {income}")
    property_items = diagnostics.get("property")
    if isinstance(property_items, list) and property_items:
        known_parts.append("имущество: " + ", ".join(_diagnostic_text(item, limit=40) for item in property_items[:3] if _diagnostic_text(item, limit=40)))
    collectors = _diagnostic_text(diagnostics.get("collectors"), limit=80)
    if collectors:
        known_parts.append(f"коллекторы: {collectors}")

    action_source = {
        "clarify_income": "income",
        "clarify_property": "property",
        "check_bailiffs": "bailiffs",
        "review_mfc_eligibility": "route",
    }.get(str(next_best_action or "").lower(), "")
    priority_order = {"required": 0, "recommended": 1, "optional": 2}
    ranked_documents = sorted(
        document_checklist,
        key=lambda doc: (
            0 if action_source and doc.source == action_source else 1,
            priority_order.get(doc.priority, 9),
            doc.source,
            doc.title,
        ),
    )
    required_docs = [doc.title for doc in ranked_documents if doc.priority == "required"][:4]
    if len(required_docs) < 3:
        required_docs.extend(doc.title for doc in ranked_documents if doc.priority != "required" and doc.title not in required_docs)
    required_docs = required_docs[:5]

    missing = diagnostics.get("missing_fields")
    missing_fields = [_diagnostic_text(item, limit=50) for item in missing[:2]] if isinstance(missing, list) else []
    missing_fields = [item for item in missing_fields if item]

    sections: list[str] = []
    sections.append("Здравствуйте! Чтобы мы могли точнее и безопаснее оценить ситуацию, пришлите, пожалуйста, документы по делу.")
    if known_parts:
        sections.append("По вашим словам уже видно: " + "; ".join(known_parts[:4]) + ".")
    else:
        sections.append("Пока вводных немного, поэтому начнём с базовой проверки документов и коротких уточнений.")
    if required_docs:
        sections.append("Что прислать: " + "; ".join(required_docs) + ".")
    if missing_fields:
        sections.append("Также уточните, пожалуйста: " + "; ".join(missing_fields) + ".")

    action = str(next_best_action or "").lower()
    if action == "call_client":
        sections.append("После этого лучше созвониться и сверить документы по шагам.")
    elif action == "clarify_income":
        sections.append("Отдельно важно понять доход, удержания и прожиточный минимум.")
    elif action == "clarify_property":
        sections.append("Отдельно важно проверить имущество, залог, доли и единственное жильё.")
    elif action == "check_bailiffs":
        sections.append("Отдельно важно проверить исполнительные производства и основания списаний.")
    elif action == "review_mfc_eligibility":
        sections.append("Отдельно проверим, подходит ли внесудебная процедура через МФЦ.")
    else:
        sections.append("После проверки документов можно выбрать следующий безопасный шаг.")

    disclaimer = "Это предварительная проверка по вашим словам, не юридическое заключение и не гарантия списания долгов."
    sections.append(disclaimer)
    text = "\n\n".join(section for section in sections if section)
    return HandoffTicketFollowUpMessage(
        text=text[:2500],
        sections=sections[:6],
        tone="calm/professional",
        warnings=[
            "не отправлять автоматически",
            "без гарантий результата",
            "без raw chatHistory и внутренних заметок",
        ],
    )


DECISION_CHECKLIST_CONTEXT_KEY = "operator_decision_checklist"


def _handoff_decision_checklist_state(ticket: WidgetHandoffTicket) -> dict[str, bool]:
    context = ticket.handoff_context if isinstance(ticket.handoff_context, dict) else {}
    raw_state = context.get(DECISION_CHECKLIST_CONTEXT_KEY)
    if not isinstance(raw_state, dict):
        return {}
    raw_done = raw_state.get("done", raw_state)
    if not isinstance(raw_done, dict):
        return {}
    return {
        _diagnostic_text(key, limit=64): bool(value)
        for key, value in raw_done.items()
        if _diagnostic_text(key, limit=64)
    }


def _handoff_decision_item(
    items: list[HandoffTicketDecisionChecklistItem],
    done_state: dict[str, bool],
    *,
    key: str,
    title: str,
    reason: str,
    source: str,
    required: bool,
) -> None:
    normalized_key = _diagnostic_text(key, limit=64)
    if not normalized_key or any(item.key == normalized_key for item in items):
        return
    items.append(
        HandoffTicketDecisionChecklistItem(
            key=normalized_key,
            title=_diagnostic_text(title, limit=120),
            reason=_diagnostic_text(reason, limit=180),
            source=_diagnostic_text(source, limit=32) or "case",
            required=bool(required),
            done=bool(done_state.get(normalized_key, False)),
        )
    )


def _handoff_decision_checklist(
    ticket: WidgetHandoffTicket,
    diagnostics: dict[str, object],
    document_checklist: list[HandoffTicketDocumentChecklistItem],
    next_best_action: str = "",
) -> list[HandoffTicketDecisionChecklistItem]:
    done_state = _handoff_decision_checklist_state(ticket)
    items: list[HandoffTicketDecisionChecklistItem] = []
    missing = " ".join(str(item).lower() for item in diagnostics.get("missing_fields", []) if item) if isinstance(diagnostics.get("missing_fields"), list) else ""
    debt_amount = _diagnostic_text(diagnostics.get("debt_amount"))
    bailiffs_text = str(diagnostics.get("bailiffs") or "").lower()
    income_text = str(diagnostics.get("income") or "").lower()
    collectors_text = str(diagnostics.get("collectors") or "").lower()
    property_items = diagnostics.get("property")
    property_text = " ".join(str(item).lower() for item in property_items if item) if isinstance(property_items, list) else ""
    document_keys = {doc.key for doc in document_checklist}
    action = str(next_best_action or "").lower()

    def add(**kwargs: object) -> None:
        _handoff_decision_item(items, done_state, **kwargs)  # type: ignore[arg-type]

    add(
        key="verify_debt_amount",
        title="Проверить сумму долга",
        reason="Сумму нужно сверить по справкам и договорам до выбора процедуры.",
        source="debt",
        required=bool(debt_amount or "долг" in missing or "credit_agreements" in document_keys),
    )
    add(
        key="check_bailiffs",
        title="Проверить приставов и ИП",
        reason="Нужно подтвердить исполнительные производства, основания и удержания.",
        source="bailiffs",
        required=bool(bailiffs_text or "пристав" in missing or action == "check_bailiffs" or "fssp_proceedings" in document_keys),
    )
    add(
        key="clarify_income",
        title="Уточнить доход и удержания",
        reason="Доход влияет на удержания, прожиточный минимум и план общения с клиентом.",
        source="income",
        required=bool(income_text or "доход" in missing or action == "clarify_income" or "income_certificate" in document_keys),
    )
    add(
        key="review_property",
        title="Проверить имущество/ипотеку",
        reason="Имущество, залог, доли и единственное жильё нужно оценить до вывода по маршруту.",
        source="property",
        required=bool(property_text or "имуществ" in missing or "квартир" in missing or action == "clarify_property" or "egrn_extract" in document_keys),
    )
    if collectors_text or "collector_messages" in document_keys:
        add(
            key="review_collectors",
            title="Проверить обращения коллекторов",
            reason="Сообщения и звонки помогут оценить нарушения и подготовить жалобу при необходимости.",
            source="collectors",
            required=True,
        )
    add(
        key="request_documents",
        title="Запросить документы",
        reason="Документы подтверждают вводные и снижают риск неверной консультации.",
        source="documents",
        required=bool(document_checklist or action == "request_documents"),
    )
    add(
        key="set_next_status",
        title="Выбрать следующий статус",
        reason="Статус фиксирует, что оператор решил: связаться, квалифицировать или закрыть заявку.",
        source="workflow",
        required=True,
    )

    source_order = {"debt": 0, "bailiffs": 1, "income": 2, "property": 3, "collectors": 4, "documents": 5, "workflow": 6}
    return sorted(items, key=lambda item: (0 if item.required else 1, source_order.get(item.source, 9), item.title))[:8]


READINESS_LABELS = {
    "ready_to_call": "Готово к звонку",
    "needs_more_info": "Нужно уточнить",
    "needs_document_review": "Нужны документы",
    "low_fit": "Низкая полнота",
    "requires_lawyer_review": "Проверка юриста",
}


def _handoff_case_readiness(
    ticket: WidgetHandoffTicket,
    diagnostics: dict[str, object],
    contact: dict[str, str],
    quality: dict[str, object],
    document_checklist: list[HandoffTicketDocumentChecklistItem],
    decision_checklist: list[HandoffTicketDecisionChecklistItem],
) -> dict[str, object]:
    missing_raw = diagnostics.get("missing_fields")
    missing_fields = [
        _diagnostic_text(item, limit=80)
        for item in (missing_raw if isinstance(missing_raw, list) else [])
    ]
    missing_fields = [item for item in missing_fields if item]

    try:
        known_count = int(diagnostics.get("known_count") or 0)
    except Exception:
        known_count = 0
    try:
        quality_score = int(quality.get("quality_score") or 0)
    except Exception:
        quality_score = 0

    risk_level = str(diagnostics.get("risk_level") or ticket.risk_level or "").strip().lower()
    quality_label = str(quality.get("quality_label") or "").strip().lower()
    has_contact = bool(contact.get("phone") or contact.get("email"))
    lead_status = _normalize_handoff_lead_status(ticket.status)
    bailiffs_text = str(diagnostics.get("bailiffs") or "").lower()
    property_items = diagnostics.get("property")
    property_text = " ".join(str(item).lower() for item in property_items if item) if isinstance(property_items, list) else ""
    has_bailiffs = bool(bailiffs_text)
    has_property = bool(property_text)
    has_mortgage = any(token in property_text for token in ("ипотек", "залог"))
    high_risk = risk_level in {"critical", "high"} or quality_label == "urgent" or quality_score >= 78

    required_items = [item for item in decision_checklist if item.required]
    required_done = [item for item in required_items if item.done]
    required_total = len(required_items)
    required_complete = required_total > 0 and len(required_done) >= required_total
    required_progress = (len(required_done) / required_total) if required_total else 0.0
    unchecked_required = [item.title for item in required_items if not item.done]

    reasons: list[str] = []
    blocking_items: list[str] = []

    def add_reason(text: str) -> None:
        value = _diagnostic_text(text, limit=110)
        if value and value not in reasons:
            reasons.append(value)

    def add_block(text: str) -> None:
        value = _diagnostic_text(text, limit=110)
        if value and value not in blocking_items:
            blocking_items.append(value)

    if has_contact:
        add_reason("есть контакт для связи")
    else:
        add_block("нет контакта для связи")
    if known_count >= 4:
        add_reason("собрано несколько ключевых вводных")
    elif known_count <= 1:
        add_reason("вводных пока мало")
    if high_risk:
        add_reason("есть высокий операционный риск")
    if has_bailiffs:
        add_reason("есть приставы или списания")
    if has_property:
        add_reason("есть имущество для проверки")
    if lead_status == "closed":
        add_reason("заявка уже закрыта")

    for field in missing_fields[:2]:
        add_block(f"уточнить: {field}")
    for title in unchecked_required[:3]:
        add_block(title)

    if known_count <= 1 and quality_score < 35 and not high_risk:
        state = "low_fit"
        action = "Соберите базовые вводные и контакт, прежде чем тратить время юриста."
        if not blocking_items:
            add_block("собрать базовые вводные")
    elif high_risk and (has_mortgage or (has_bailiffs and has_property) or quality_label == "urgent") and required_complete:
        state = "requires_lawyer_review"
        action = "Передайте дело юристу на проверку рисков, без обещаний результата клиенту."
        add_reason("обязательные проверки отмечены, риск требует юридического взгляда")
        if not blocking_items:
            add_block("проверить вывод с юристом")
    elif (high_risk or has_bailiffs or has_property) and not required_complete:
        state = "needs_document_review"
        action = "Сначала запросите и сверьте обязательные документы, затем решайте по звонку или юристу."
        doc_reason = "нужна документальная проверка перед решением"
        if doc_reason not in reasons:
            reasons.insert(0, doc_reason)
        if not unchecked_required and document_checklist:
            for doc in document_checklist[:2]:
                add_block(doc.title)
    elif missing_fields or not has_contact or known_count < 3:
        state = "needs_more_info"
        action = "Уточните недостающие вводные и контакт, затем обновите следующий шаг."
        add_reason("решению не хватает вводных")
        if not blocking_items:
            add_block("уточнить сумму, доход, имущество или приставов")
    elif has_contact and known_count >= 3 and (required_complete or required_progress >= 0.5):
        state = "ready_to_call"
        action = "Можно звонить клиенту: коротко сверить вводные, документы и следующий безопасный шаг."
        add_reason("контакт и основные вводные есть")
    else:
        state = "needs_more_info"
        action = "Уточните 1-2 ключевых поля и проверьте документы перед решением."
        add_reason("нужно подтвердить готовность дела")
        if not blocking_items:
            add_block("подтвердить обязательные проверки")

    return {
        "readiness_state": state,
        "readiness_label": READINESS_LABELS.get(state, "Нужно уточнить"),
        "readiness_reasons": reasons[:5],
        "blocking_items": blocking_items[:5],
        "recommended_operator_action": _diagnostic_text(action, limit=240),
    }


def _latest_report_email_events_by_session(
    db: Session,
    partner_id: UUID,
    session_ids: list[str],
) -> dict[str, object]:
    normalized_sessions = []
    for raw_session in session_ids:
        try:
            normalized = _normalize_widget_session_id(raw_session)
        except HTTPException:
            continue
        if normalized and normalized not in normalized_sessions:
            normalized_sessions.append(normalized)
    if not normalized_sessions:
        return {}
    rows = (
        db.query(ClientReportEmailSend)
        .filter(
            ClientReportEmailSend.partner_id == str(partner_id),
            ClientReportEmailSend.session_id.in_(normalized_sessions),
        )
        .order_by(ClientReportEmailSend.created_at.desc())
        .all()
    )
    latest: dict[str, object] = {}
    for row in rows:
        if row.session_id not in latest:
            latest[row.session_id] = row
    return latest


def _latest_report_email_event_for_ticket(db: Session, ticket: WidgetHandoffTicket) -> object | None:
    if not ticket.partner_id:
        return None
    return (
        db.query(ClientReportEmailSend)
        .filter(
            ClientReportEmailSend.partner_id == str(ticket.partner_id),
            ClientReportEmailSend.session_id == ticket.session_id,
        )
        .order_by(ClientReportEmailSend.created_at.desc())
        .first()
    )


def _serialize_handoff_lead_item(
    ticket: WidgetHandoffTicket,
    report_email_event: object | None = None,
) -> HandoffTicketLeadListItem:
    diagnostics = _handoff_ticket_diagnostic_summary(ticket)
    report_email = _report_email_summary(report_email_event)
    contact = _handoff_ticket_contact_summary(ticket)
    quality = _handoff_case_quality(ticket, diagnostics, contact, report_email)
    document_checklist = _handoff_document_checklist(
        diagnostics,
        str(quality.get("next_best_action") or ""),
    )
    decision_checklist = _handoff_decision_checklist(
        ticket,
        diagnostics,
        document_checklist,
        str(quality.get("next_best_action") or ""),
    )
    readiness = _handoff_case_readiness(
        ticket,
        diagnostics,
        contact,
        quality,
        document_checklist,
        decision_checklist,
    )
    return HandoffTicketLeadListItem(
        ticket_id=ticket.ticket_id,
        partner_id=ticket.partner_id,
        status=_normalize_handoff_lead_status(ticket.status),
        priority=ticket.priority,
        risk_level=ticket.risk_level,
        category=ticket.category,
        channel=ticket.target_channel or ticket.requested_channel or "web_chat",
        requested_channel=ticket.requested_channel,
        target_channel=ticket.target_channel,
        lead_reason=_handoff_lead_reason(ticket, diagnostics),
        operator_note=_handoff_operator_note(ticket),
        contact=contact,
        diagnostic_summary=diagnostics,
        **report_email,
        **quality,
        **readiness,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


def _handoff_ticket_timeline(
    ticket: WidgetHandoffTicket,
    report_email_event: object | None = None,
) -> list[HandoffTicketLeadTimelineItem]:
    events = [
        HandoffTicketLeadTimelineItem(
            kind="created",
            label="Заявка создана",
            at=ticket.created_at,
            detail=f"Канал: {ticket.target_channel or ticket.requested_channel or 'web_chat'}",
        )
    ]
    if report_email_event:
        status_text = _diagnostic_text(getattr(report_email_event, "status", ""), limit=32) or "sent"
        email_text = _diagnostic_text(getattr(report_email_event, "email_masked", ""), limit=160)
        events.append(
            HandoffTicketLeadTimelineItem(
                kind="report_email",
                label="Мини-отчёт отправлен клиенту",
                at=getattr(report_email_event, "created_at", None),
                detail=" · ".join(item for item in [status_text, email_text] if item),
            )
        )
    if ticket.assigned_at:
        events.append(
            HandoffTicketLeadTimelineItem(
                kind="contacted",
                label="Заявку взяли в работу",
                at=ticket.assigned_at,
                detail=_diagnostic_text(ticket.operator_name or "Статус: contacted", limit=120),
            )
        )
    if ticket.resolved_at:
        events.append(
            HandoffTicketLeadTimelineItem(
                kind="closed",
                label="Заявка закрыта",
                at=ticket.resolved_at,
                detail="Статус: closed",
            )
        )
    if ticket.updated_at and ticket.updated_at != ticket.created_at and ticket.updated_at not in {ticket.assigned_at, ticket.resolved_at}:
        events.append(
            HandoffTicketLeadTimelineItem(
                kind="updated",
                label="Последнее обновление",
                at=ticket.updated_at,
                detail=f"Статус: {_normalize_handoff_lead_status(ticket.status)}",
            )
        )
    return sorted(events, key=lambda item: item.at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)


def _handoff_internal_case_summary(
    base: HandoffTicketLeadListItem,
    document_checklist: list[HandoffTicketDocumentChecklistItem],
    decision_checklist: list[HandoffTicketDecisionChecklistItem],
    timeline: list[HandoffTicketLeadTimelineItem],
) -> HandoffTicketInternalCaseSummary:
    def text_value(raw: object, limit: int = 180) -> str:
        return _diagnostic_text(raw, limit=limit)

    def list_values(raw: object, limit: int = 5) -> list[str]:
        if not isinstance(raw, list):
            return []
        values = [text_value(item, limit=90) for item in raw[:limit]]
        return [item for item in values if item]

    def section(title: str, lines: list[str]) -> str:
        clean_lines = [line for line in lines if line]
        if not clean_lines:
            clean_lines = ["нет данных"]
        return title + "\n" + "\n".join(f"- {line}" for line in clean_lines)

    contact = base.contact if isinstance(base.contact, dict) else {}
    diagnostics = base.diagnostic_summary if isinstance(base.diagnostic_summary, dict) else {}
    contact_lines = []
    if contact.get("name"):
        contact_lines.append(f"клиент: {text_value(contact.get('name'), 120)}")
    if contact.get("phone"):
        contact_lines.append(f"телефон: {text_value(contact.get('phone'), 80)}")
    if contact.get("email"):
        contact_lines.append(f"email: {text_value(contact.get('email'), 120)}")

    known_lines = []
    if diagnostics.get("debt_amount"):
        known_lines.append(f"долг: {text_value(diagnostics.get('debt_amount'), 100)}")
    debt_types = list_values(diagnostics.get("debt_types"), limit=4)
    if debt_types:
        known_lines.append("типы долгов: " + ", ".join(debt_types))
    if diagnostics.get("bailiffs"):
        known_lines.append(f"приставы/списания: {text_value(diagnostics.get('bailiffs'), 100)}")
    if diagnostics.get("income"):
        known_lines.append(f"доход: {text_value(diagnostics.get('income'), 100)}")
    property_items = list_values(diagnostics.get("property"), limit=4)
    if property_items:
        known_lines.append("имущество: " + ", ".join(property_items))
    if diagnostics.get("collectors"):
        known_lines.append(f"коллекторы: {text_value(diagnostics.get('collectors'), 100)}")
    if diagnostics.get("route_hint"):
        known_lines.append(f"маршрут: {text_value(diagnostics.get('route_hint'), 100)}")

    missing_lines = list_values(diagnostics.get("missing_fields"), limit=5)
    risk_lines = list_values(diagnostics.get("risk_reasons"), limit=4) or base.quality_reasons[:4] or base.readiness_reasons[:4]
    document_lines = [
        f"{doc.title} ({doc.priority})"
        for doc in document_checklist[:6]
        if doc.title
    ]
    checklist_done = [item.title for item in decision_checklist if item.done]
    checklist_total = len(decision_checklist)
    checklist_lines = [f"прогресс: {len(checklist_done)}/{checklist_total}"]
    if checklist_done:
        checklist_lines.append("отмечено: " + "; ".join(checklist_done[:4]))
    else:
        checklist_lines.append("отмеченных пунктов пока нет")

    history_lines = [event.label for event in timeline[:4] if event.label]
    if base.report_email_sent:
        history_lines.append(f"мини-отчёт отправлен: {base.report_email_status or 'sent'}; {base.report_email_masked or 'email скрыт'}")

    sections = [
        section("Предварительная внутренняя сводка", [
            "требует проверки юристом",
            f"дело: {str(base.ticket_id)[:8]}",
            f"создано: {base.created_at.isoformat() if base.created_at else 'дата не указана'}",
        ]),
        section("Контакт", contact_lines),
        section("Статус и готовность", [
            f"статус: {_normalize_handoff_lead_status(base.status)}",
            f"готовность: {base.readiness_label}",
            f"качество: {base.quality_score}/100 ({base.quality_label})",
            f"следующий шаг: {base.next_best_action_reason}",
            f"рекомендация оператору: {base.recommended_operator_action}",
        ]),
        section("Что известно", known_lines),
        section("Риски", risk_lines),
        section("Что уточнить", missing_lines or base.blocking_items[:5]),
        section("Документы", document_lines),
        section("Проверка оператора", checklist_lines),
        section("История действий", history_lines),
    ]
    note = text_value(base.operator_note, limit=600)
    if note:
        sections.append(section("Заметка оператора", [note]))
    sections.append(section("Ограничение", [
        "внутренняя операционная сводка, не юридическое заключение",
        "без гарантий результата и списания долгов",
        "сверить с документами перед выводами",
    ]))

    text = "\n\n".join(sections)
    return HandoffTicketInternalCaseSummary(
        text=text[:6000],
        sections=sections[:12],
        generated_at=datetime.now(timezone.utc),
    )


def _serialize_handoff_lead_detail(
    ticket: WidgetHandoffTicket,
    report_email_event: object | None = None,
) -> HandoffTicketLeadDetailItem:
    base = _serialize_handoff_lead_item(ticket, report_email_event)
    document_checklist = _handoff_document_checklist(
        base.diagnostic_summary,
        base.next_best_action,
    )
    decision_checklist = _handoff_decision_checklist(
        ticket,
        base.diagnostic_summary,
        document_checklist,
        base.next_best_action,
    )
    readiness = _handoff_case_readiness(
        ticket,
        base.diagnostic_summary,
        base.contact,
        {
            "quality_score": base.quality_score,
            "quality_label": base.quality_label,
            "next_best_action": base.next_best_action,
        },
        document_checklist,
        decision_checklist,
    )
    base_payload = base.model_dump()
    base_payload.update(readiness)
    timeline = _handoff_ticket_timeline(ticket, report_email_event)
    effective_base = HandoffTicketLeadListItem(**base_payload)
    return HandoffTicketLeadDetailItem(
        **base_payload,
        timeline=timeline,
        document_checklist=document_checklist,
        decision_checklist=decision_checklist,
        follow_up_message=_handoff_follow_up_message(
            base.diagnostic_summary,
            document_checklist,
            base.next_best_action,
        ),
        internal_case_summary=_handoff_internal_case_summary(
            effective_base,
            document_checklist,
            decision_checklist,
            timeline,
        ),
    )


def _flatten_handoff_search_values(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, dict):
        out: list[str] = []
        for item in value.values():
            out.extend(_flatten_handoff_search_values(item))
        return out
    if isinstance(value, (list, tuple, set)):
        out: list[str] = []
        for item in value:
            out.extend(_flatten_handoff_search_values(item))
        return out
    text = str(value).strip()
    return [text] if text else []


def _handoff_lead_item_matches_query(item: HandoffTicketLeadListItem, raw_query: str) -> bool:
    query = re.sub(r"\s+", " ", str(raw_query or "").strip().lower())[:120]
    if not query:
        return True
    payload = item.model_dump(mode="json")
    values = _flatten_handoff_search_values({
        "ticket_id": payload.get("ticket_id"),
        "status": payload.get("status"),
        "priority": payload.get("priority"),
        "risk_level": payload.get("risk_level"),
        "category": payload.get("category"),
        "channel": payload.get("channel"),
        "lead_reason": payload.get("lead_reason"),
        "operator_note": payload.get("operator_note"),
        "contact": payload.get("contact"),
        "diagnostic_summary": payload.get("diagnostic_summary"),
        "report_email_status": payload.get("report_email_status"),
        "report_email_masked": payload.get("report_email_masked"),
        "quality_label": payload.get("quality_label"),
        "quality_reasons": payload.get("quality_reasons"),
        "next_best_action": payload.get("next_best_action"),
    })
    haystack = " ".join(values).lower()
    compact_haystack = re.sub(r"[\s()+\-.]", "", haystack)
    tokens = [token for token in re.findall(r"[a-zа-яё0-9@.+-]{2,}", query) if token]
    digits = re.sub(r"\D+", "", query)
    if digits and len(digits) >= 3 and digits in re.sub(r"\D+", "", haystack):
        return True
    if query in haystack or query in compact_haystack:
        return True
    return bool(tokens) and all(token in haystack or token in compact_haystack for token in tokens)


def _kb_score_article(
    article: dict,
    query_tokens: list[str],
    stage: str = "",
    debt_type: str = "",
    role: str = "",
) -> float:
    title = str(article.get("title", "")).lower()
    content = str(article.get("content", "")).lower()
    tags = " ".join(article.get("tags", [])).lower()
    stages = [str(s).strip().lower() for s in article.get("stages", [])]
    score = 0.0

    if not query_tokens:
        score += 0.25
    for token in query_tokens:
        if token in title:
            score += 3.0
        if token in tags:
            score += 2.0
        if token in content:
            score += 1.0

    if stage:
        if stage in stages:
            score += 1.2
        else:
            score -= 0.2
    if debt_type and debt_type.lower() in (title + " " + content + " " + tags):
        score += 0.8
    if role and role.lower() in {"family", "self-employed", "director", "ip"}:
        score += 0.2

    return score


def _kb_snippet(article: dict, query_tokens: list[str]) -> str:
    content = str(article.get("content", "")).strip()
    if not content:
        return ""
    sentences = re.split(r"(?<=[.!?])\s+", content)
    if not query_tokens:
        return sentences[0][:180]
    for s in sentences:
        lower = s.lower()
        if any(t in lower for t in query_tokens):
            return s[:220]
    return sentences[0][:180]


@app.post("/api/manyasha/escalation/evaluate", response_model=EscalationEvalResponse)
def evaluate_escalation(req: EscalationEvalRequest) -> EscalationEvalResponse:
    return _evaluate_escalation(req.message, req.history or [], req.context or {})


@app.get("/api/manyasha/kb/search", response_model=list[KBSearchResponseItem])
def manyasha_kb_search(
    q: str = "",
    limit: int = 5,
    case_stage: str = "",
    debt_type: str = "",
    user_role: str = "",
) -> list[KBSearchResponseItem]:
    limit = max(1, min(limit, 10))
    tokens = [t for t in re.findall(r"[a-zа-яё0-9]{2,}", (q or "").lower()) if len(t) >= 2][:12]
    scored: list[tuple[float, dict]] = []
    for article in MANYASHA_KB_ARTICLES:
        score = _kb_score_article(
            article=article,
            query_tokens=tokens,
            stage=(case_stage or "").strip().lower(),
            debt_type=debt_type,
            role=user_role,
        )
        if score <= 0:
            continue
        scored.append((score, article))
    scored.sort(key=lambda it: it[0], reverse=True)
    out: list[KBSearchResponseItem] = []
    for score, article in scored[:limit]:
        out.append(
            KBSearchResponseItem(
                id=str(article.get("id", "")),
                title=str(article.get("title", "")),
                category=str(article.get("category", "Общее")),
                snippet=_kb_snippet(article, tokens),
                score=round(score, 3),
            )
        )
    return out


@app.get("/api/handoff/tickets", response_model=list[HandoffTicketLeadListItem])
def list_handoff_tickets(
    request: Request,
    lead_status: str = Query("", alias="status"),
    status_filter: str = "",
    risk_level: str = "",
    q: str = Query("", max_length=120),
    limit: int = 30,
    ctx: PartnerDashboardContext = Depends(get_partner_dashboard_context),
    db: Session = Depends(get_db),
) -> list[HandoffTicketLeadListItem]:
    _rate_limit_widget_request(
        request,
        bucket="partner_handoff_tickets",
        limit=max(1, int(os.getenv("PARTNER_HANDOFF_TICKETS_RATE_LIMIT", "60"))),
        window_seconds=max(30, int(os.getenv("PARTNER_HANDOFF_TICKETS_RATE_WINDOW_SECONDS", "60"))),
    )
    normalized_status = _parse_handoff_lead_status_filter(lead_status or status_filter)
    risk_values = _handoff_lead_risk_filter_values(risk_level)
    query = db.query(WidgetHandoffTicket).filter(WidgetHandoffTicket.partner_id == ctx.partner_id)
    if normalized_status:
        query = query.filter(WidgetHandoffTicket.status.in_(_handoff_lead_status_storage_values(normalized_status)))
    if risk_values:
        query = query.filter(WidgetHandoffTicket.risk_level.in_(risk_values))
    search_query = re.sub(r"\s+", " ", (q or "").strip())[:120]
    status_sort = case(
        (WidgetHandoffTicket.status.in_(["new", "queued"]), 0),
        (WidgetHandoffTicket.status.in_(["contacted", "assigned", "active"]), 1),
        (WidgetHandoffTicket.status == "qualified", 2),
        (WidgetHandoffTicket.status.in_(["closed", "resolved", "canceled", "failed"]), 3),
        else_=4,
    )
    risk_sort = case(
        (WidgetHandoffTicket.risk_level == "critical", 0),
        (WidgetHandoffTicket.risk_level == "high", 1),
        (WidgetHandoffTicket.risk_level == "medium", 2),
        (WidgetHandoffTicket.risk_level == "low", 3),
        else_=4,
    )
    limit_value = max(1, min(int(limit or 30), 100))
    fetch_limit = min(500, max(limit_value, limit_value * 5)) if search_query else limit_value
    rows = (
        query
        .order_by(status_sort.asc(), risk_sort.asc(), WidgetHandoffTicket.created_at.desc())
        .limit(fetch_limit)
        .all()
    )
    report_email_by_session = _latest_report_email_events_by_session(
        db,
        ctx.partner_id,
        [row.session_id for row in rows],
    )
    items = [_serialize_handoff_lead_item(row, report_email_by_session.get(row.session_id)) for row in rows]
    if search_query:
        items = [item for item in items if _handoff_lead_item_matches_query(item, search_query)]
    return items[:limit_value]


@app.get("/api/handoff/tickets/{ticket_id}", response_model=HandoffTicketLeadDetailItem)
def get_handoff_ticket_detail(
    request: Request,
    ticket_id: UUID,
    ctx: PartnerDashboardContext = Depends(get_partner_dashboard_context),
    db: Session = Depends(get_db),
) -> HandoffTicketLeadDetailItem:
    _rate_limit_widget_request(
        request,
        bucket="partner_handoff_ticket_detail",
        limit=max(1, int(os.getenv("PARTNER_HANDOFF_TICKET_DETAIL_RATE_LIMIT", "120"))),
        window_seconds=max(30, int(os.getenv("PARTNER_HANDOFF_TICKET_DETAIL_RATE_WINDOW_SECONDS", "60"))),
    )
    row = db.get(WidgetHandoffTicket, ticket_id)
    if not row or row.partner_id != ctx.partner_id:
        raise HTTPException(status_code=404, detail="Handoff ticket not found")
    return _serialize_handoff_lead_detail(row, _latest_report_email_event_for_ticket(db, row))


@app.patch("/api/handoff/tickets/{ticket_id}/status", response_model=HandoffTicketLeadDetailItem)
def update_handoff_ticket_lead_status(
    request: Request,
    ticket_id: UUID,
    req: HandoffTicketLeadStatusUpdateRequest,
    ctx: PartnerDashboardContext = Depends(get_partner_dashboard_context),
    db: Session = Depends(get_db),
) -> HandoffTicketLeadListItem:
    _rate_limit_widget_request(
        request,
        bucket="partner_handoff_ticket_status",
        limit=max(1, int(os.getenv("PARTNER_HANDOFF_TICKET_STATUS_RATE_LIMIT", "80"))),
        window_seconds=max(30, int(os.getenv("PARTNER_HANDOFF_TICKET_STATUS_RATE_WINDOW_SECONDS", "60"))),
    )
    requested_status = (req.status or "").strip().lower()
    if requested_status not in HANDOFF_LEAD_ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Недопустимый статус заявки.",
        )
    row = db.get(WidgetHandoffTicket, ticket_id)
    if not row or row.partner_id != ctx.partner_id:
        raise HTTPException(status_code=404, detail="Handoff ticket not found")

    now = datetime.now(timezone.utc)
    row.status = requested_status
    row.updated_at = now
    if requested_status in {"contacted", "qualified"} and row.assigned_at is None:
        row.assigned_at = now
    if requested_status == "closed":
        row.resolved_at = now
        row.queue_position = 0
        row.eta_seconds = 0
    db.commit()
    _refresh_after_commit(db, row)
    return _serialize_handoff_lead_detail(row, _latest_report_email_event_for_ticket(db, row))


@app.patch("/api/handoff/tickets/{ticket_id}/note", response_model=HandoffTicketLeadDetailItem)
def update_handoff_ticket_lead_note(
    request: Request,
    ticket_id: UUID,
    req: HandoffTicketLeadNoteUpdateRequest,
    ctx: PartnerDashboardContext = Depends(get_partner_dashboard_context),
    db: Session = Depends(get_db),
) -> HandoffTicketLeadListItem:
    _rate_limit_widget_request(
        request,
        bucket="partner_handoff_ticket_note",
        limit=max(1, int(os.getenv("PARTNER_HANDOFF_TICKET_NOTE_RATE_LIMIT", "80"))),
        window_seconds=max(30, int(os.getenv("PARTNER_HANDOFF_TICKET_NOTE_RATE_WINDOW_SECONDS", "60"))),
    )
    row = db.get(WidgetHandoffTicket, ticket_id)
    if not row or row.partner_id != ctx.partner_id:
        raise HTTPException(status_code=404, detail="Handoff ticket not found")

    context = dict(row.handoff_context) if isinstance(row.handoff_context, dict) else {}
    note = (req.note or "").strip()
    if note:
        context["operator_note"] = note
    else:
        context.pop("operator_note", None)

    row.handoff_context = context
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    _refresh_after_commit(db, row)
    return _serialize_handoff_lead_detail(row, _latest_report_email_event_for_ticket(db, row))


@app.patch("/api/handoff/tickets/{ticket_id}/checklist", response_model=HandoffTicketLeadDetailItem)
def update_handoff_ticket_lead_checklist(
    request: Request,
    ticket_id: UUID,
    req: HandoffTicketLeadChecklistUpdateRequest,
    ctx: PartnerDashboardContext = Depends(get_partner_dashboard_context),
    db: Session = Depends(get_db),
) -> HandoffTicketLeadDetailItem:
    _rate_limit_widget_request(
        request,
        bucket="partner_handoff_ticket_checklist",
        limit=max(1, int(os.getenv("PARTNER_HANDOFF_TICKET_CHECKLIST_RATE_LIMIT", "120"))),
        window_seconds=max(30, int(os.getenv("PARTNER_HANDOFF_TICKET_CHECKLIST_RATE_WINDOW_SECONDS", "60"))),
    )
    row = db.get(WidgetHandoffTicket, ticket_id)
    if not row or row.partner_id != ctx.partner_id:
        raise HTTPException(status_code=404, detail="Handoff ticket not found")

    item_key = _diagnostic_text(req.item_key, limit=64)
    detail = _serialize_handoff_lead_detail(row, _latest_report_email_event_for_ticket(db, row))
    valid_keys = {item.key for item in detail.decision_checklist}
    if item_key not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Недопустимый пункт checklist.",
        )

    context = dict(row.handoff_context) if isinstance(row.handoff_context, dict) else {}
    checklist_state = context.get(DECISION_CHECKLIST_CONTEXT_KEY)
    if not isinstance(checklist_state, dict):
        checklist_state = {}
    done_state = checklist_state.get("done")
    if not isinstance(done_state, dict):
        done_state = {}
    done_state[item_key] = bool(req.done)
    checklist_state["done"] = done_state
    context[DECISION_CHECKLIST_CONTEXT_KEY] = checklist_state

    row.handoff_context = context
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    _refresh_after_commit(db, row)
    return _serialize_handoff_lead_detail(row, _latest_report_email_event_for_ticket(db, row))


@app.post("/api/handoff/request", status_code=201, response_model=HandoffTicketResponse)
def request_handoff(
    request: Request,
    req: HandoffRequest,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> HandoffTicketResponse:
    _enforce_widget_session(auth, req.session_id)
    resolved_partner_id = _enforce_widget_partner(auth, req.partner_id)
    if req.website.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid handoff payload.")
    _rate_limit_widget_request(
        request,
        bucket="handoff_request",
        limit=max(1, int(os.getenv("WIDGET_HANDOFF_RATE_LIMIT", "6"))),
        window_seconds=max(30, int(os.getenv("WIDGET_HANDOFF_RATE_WINDOW_SECONDS", "300"))),
    )
    _enforce_captcha_if_required(request, req.captcha_token)

    raw_context = req.context if isinstance(req.context, dict) else {}
    context = _attach_diagnostics_lead_packet(
        raw_context,
        raw_context.get("diagnostics") if isinstance(raw_context, dict) else {},
        raw_context.get("diagnostic_summary") if isinstance(raw_context, dict) else {},
    )
    _enforce_payload_limit(
        context,
        max_bytes=max(MAX_WIDGET_DATA_BLOB_BYTES, 8192),
        detail="Handoff context слишком большой.",
    )
    transcript_tail = (req.transcript_tail or [])[-MAX_WIDGET_TRANSCRIPT_ITEMS:]
    _enforce_payload_limit(
        transcript_tail,
        max_bytes=max(MAX_WIDGET_DATA_BLOB_BYTES * 2, 16384),
        detail="Handoff transcript слишком большой.",
    )
    eval_res = _evaluate_escalation(req.reason or "", [], context)

    risk_level = _normalize_escalation_level(req.risk_level)
    priority = _normalize_priority(req.priority)
    if eval_res.risk_level in {"high", "critical"}:
        risk_level = eval_res.risk_level
    if eval_res.priority in {"high", "urgent"}:
        priority = eval_res.priority

    queue_in_progress = (
        db.query(WidgetHandoffTicket)
        .filter(WidgetHandoffTicket.status.in_(["queued", "assigned", "active"]))
        .count()
    )
    queue_position = queue_in_progress + 1
    eta_seconds = _estimate_handoff_eta_seconds(queue_position, risk_level, priority)
    sla_seconds = _escalation_sla_seconds(risk_level, priority)

    ticket = WidgetHandoffTicket(
        session_id=_normalize_widget_session_id(req.session_id),
        partner_id=resolved_partner_id,
        user_id=req.user_id,
        dialog_session_id=req.dialog_session_id,
        status="queued",
        priority=priority,
        risk_level=risk_level,
        category=(req.category or eval_res.category or "general")[:48],
        queue_position=queue_position,
        eta_seconds=eta_seconds,
        sla_seconds=sla_seconds,
        requested_channel=(req.requested_channel or "web_chat")[:24],
        target_channel=(req.preferred_channel or "phone")[:24],
        reason=(req.reason or "")[:2000],
        handoff_context=context,
        transcript_tail=transcript_tail,
        updated_at=datetime.now(timezone.utc),
    )
    db.add(ticket)
    db.add(
        AnalyticsEvent(
            session_id=_normalize_widget_session_id(req.session_id),
            event_type="handoff_requested",
            data={
                "partner_id": str(resolved_partner_id),
                "priority": priority,
                "risk_level": risk_level,
                "category": ticket.category,
                "queue_position": queue_position,
                "eta_seconds": eta_seconds,
                "target_channel": ticket.target_channel,
            },
        )
    )
    db.commit()
    return _serialize_handoff_ticket(ticket)


@app.get("/api/handoff/status/{ticket_id}", response_model=HandoffTicketResponse)
def handoff_status(
    request: Request,
    ticket_id: UUID,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> HandoffTicketResponse:
    _rate_limit_widget_request(
        request,
        bucket="handoff_status",
        limit=max(1, int(os.getenv("WIDGET_HANDOFF_STATUS_RATE_LIMIT", "80"))),
        window_seconds=max(30, int(os.getenv("WIDGET_HANDOFF_STATUS_RATE_WINDOW_SECONDS", "60"))),
    )
    row = db.get(WidgetHandoffTicket, ticket_id)
    if not row:
        raise HTTPException(status_code=404, detail="Handoff ticket not found")
    if row.partner_id and row.partner_id != auth.partner_id:
        raise HTTPException(status_code=403, detail="Handoff ticket не принадлежит партнёру")
    if row.status == "queued":
        # Динамическая позиция в очереди по времени создания.
        ahead = (
            db.query(WidgetHandoffTicket)
            .filter(
                WidgetHandoffTicket.status == "queued",
                WidgetHandoffTicket.created_at < row.created_at,
            )
            .count()
        )
        row.queue_position = ahead + 1
        row.eta_seconds = _estimate_handoff_eta_seconds(row.queue_position, row.risk_level, row.priority)
        row.updated_at = datetime.now(timezone.utc)
        db.commit()
        _refresh_after_commit(db, row)
    return _serialize_handoff_ticket(row)


@app.post("/api/handoff/status/{ticket_id}", response_model=HandoffTicketResponse)
def update_handoff_status(
    request: Request,
    ticket_id: UUID,
    req: HandoffStatusUpdateRequest,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> HandoffTicketResponse:
    _rate_limit_widget_request(
        request,
        bucket="handoff_status_update",
        limit=max(1, int(os.getenv("WIDGET_HANDOFF_STATUS_UPDATE_RATE_LIMIT", "30"))),
        window_seconds=max(30, int(os.getenv("WIDGET_HANDOFF_STATUS_UPDATE_RATE_WINDOW_SECONDS", "120"))),
    )
    row = db.get(WidgetHandoffTicket, ticket_id)
    if not row:
        raise HTTPException(status_code=404, detail="Handoff ticket not found")
    if row.partner_id and row.partner_id != auth.partner_id:
        raise HTTPException(status_code=403, detail="Handoff ticket не принадлежит партнёру")
    next_status = _normalize_handoff_status(req.status)
    row.status = next_status
    row.operator_name = (req.operator_name or row.operator_name or "")[:120] or None
    if req.queue_position is not None:
        row.queue_position = max(0, req.queue_position)
    if req.eta_seconds is not None:
        row.eta_seconds = max(0, req.eta_seconds)
    now = datetime.now(timezone.utc)
    row.updated_at = now
    if next_status in {"assigned", "active"} and row.assigned_at is None:
        row.assigned_at = now
    if next_status in {"resolved", "canceled", "failed"}:
        row.resolved_at = now
        row.queue_position = 0
        row.eta_seconds = 0
    db.commit()
    _refresh_after_commit(db, row)
    return _serialize_handoff_ticket(row)


@app.post("/api/analytics/event", status_code=202)
async def track_event(
    request: Request,
    req: AnalyticsEventCreate,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> dict:
    _enforce_widget_session(auth, req.session_id)
    _rate_limit_widget_request(
        request,
        bucket="analytics_event",
        limit=max(1, int(os.getenv("WIDGET_ANALYTICS_RATE_LIMIT", "90"))),
        window_seconds=max(30, int(os.getenv("WIDGET_ANALYTICS_RATE_WINDOW_SECONDS", "60"))),
    )
    _enforce_payload_limit(
        req.data,
        max_bytes=max(MAX_WIDGET_DATA_BLOB_BYTES, 8192),
        detail="Analytics payload слишком большой.",
    )
    data = dict(req.data or {})
    data.setdefault("partner_id", str(auth.partner_id))
    db.add(AnalyticsEvent(
        session_id=_normalize_widget_session_id(req.session_id),
        event_type=req.event_type[:64],
        data=data,
    ))
    db.commit()
    return {"status": "ok"}


@app.get("/api/analytics/quality-dashboard", response_model=QualityDashboardResponse)
def analytics_quality_dashboard(days: int = 7, db: Session = Depends(get_db)) -> QualityDashboardResponse:
    days = max(1, min(days, 90))
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(AnalyticsEvent)
        .filter(AnalyticsEvent.created_at >= since)
        .order_by(AnalyticsEvent.created_at.asc())
        .all()
    )

    resolved_events = {"chat_resolved", "handoff_resolved", "consultation_submitted"}
    escalated_events = {"handoff_requested", "handoff_escalated", "consult_modal_opened"}
    failed_events = {"chat_failed", "retry_exhausted", "consultation_submit_failed", "handoff_failed"}

    sessions: dict[str, dict[str, bool]] = defaultdict(
        lambda: {"resolved": False, "escalated": False, "failed": False, "negative": False}
    )
    first_response_values: list[float] = []
    csat_values: list[float] = []
    by_day: dict[str, dict[str, int]] = defaultdict(
        lambda: {
            "events_total": 0,
            "resolved_events": 0,
            "escalated_events": 0,
            "failed_events": 0,
            "negative_events": 0,
        }
    )

    for row in rows:
        sid = (row.session_id or "").strip() or "_unknown"
        et = (row.event_type or "").strip().lower()
        data = row.data if isinstance(row.data, dict) else {}
        day = row.created_at.date().isoformat()
        by_day[day]["events_total"] += 1

        if et in resolved_events:
            sessions[sid]["resolved"] = True
            by_day[day]["resolved_events"] += 1
        if et in escalated_events:
            sessions[sid]["escalated"] = True
            by_day[day]["escalated_events"] += 1
        if et in failed_events:
            sessions[sid]["failed"] = True
            by_day[day]["failed_events"] += 1

        negative = False
        if et in {"cx_negative", "negative_cx"}:
            negative = True
        if et == "cx_feedback":
            sentiment = str(data.get("sentiment") or "").strip().lower()
            if sentiment in {"negative", "bad", "angry"}:
                negative = True
            try:
                csat_raw = data.get("csat")
                if csat_raw is not None:
                    csat_values.append(float(csat_raw))
            except Exception:
                pass
        if et == "first_response_ms":
            try:
                ms = float(data.get("ms"))
                if ms >= 0:
                    first_response_values.append(ms)
            except Exception:
                pass
        if negative:
            sessions[sid]["negative"] = True
            by_day[day]["negative_events"] += 1

    sessions_total = len(sessions)
    resolved_total = sum(1 for v in sessions.values() if v["resolved"])
    escalated_total = sum(1 for v in sessions.values() if v["escalated"])
    failed_total = sum(1 for v in sessions.values() if v["failed"])
    negative_total = sum(1 for v in sessions.values() if v["negative"])

    def _rate(value: int) -> float:
        if sessions_total <= 0:
            return 0.0
        return round((value / sessions_total) * 100.0, 2)

    by_day_rows = [
        {"date": date_key, **bucket}
        for date_key, bucket in sorted(by_day.items(), key=lambda it: it[0])
    ]

    return QualityDashboardResponse(
        period_days=days,
        sessions_total=sessions_total,
        resolution_rate=_rate(resolved_total),
        escalation_rate=_rate(escalated_total),
        failed_rate=_rate(failed_total),
        negative_cx_rate=_rate(negative_total),
        first_response_ms_avg=round(sum(first_response_values) / len(first_response_values), 2)
        if first_response_values
        else 0.0,
        csat_avg=round(sum(csat_values) / len(csat_values), 2) if csat_values else None,
        totals={
            "events_total": len(rows),
            "sessions_resolved": resolved_total,
            "sessions_escalated": escalated_total,
            "sessions_failed": failed_total,
            "sessions_negative": negative_total,
        },
        by_day=by_day_rows,
    )


@app.get("/api/analytics/popular-questions")
def popular_questions(db: Session = Depends(get_db)) -> list[dict]:
    """Топ-5 вопросов за последние 7 дней (по кол-ву message_sent событий)."""
    from sqlalchemy import func, text as satext
    rows = (
        db.query(
            AnalyticsEvent.data["question"].as_string().label("question"),
            func.count().label("cnt"),
        )
        .filter(
            AnalyticsEvent.event_type == "message_sent",
            AnalyticsEvent.created_at >= satext("now() - interval '7 days'"),
        )
        .group_by(satext("1"))
        .order_by(satext("cnt DESC"))
        .limit(5)
        .all()
    )
    return [{"question": r.question, "count": r.cnt} for r in rows if r.question]


# ──────────────────────────────────────────────
# История чатов (сессии)
# ──────────────────────────────────────────────

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    messages: Mapped[list] = mapped_column(SAJSON, nullable=False, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class ChatSessionUpsert(BaseModel):
    messages: list[dict] = Field(default_factory=list)
    partner_id: UUID | None = None
    user_id: UUID | None = None
    dialog_session_id: UUID | None = None


@app.get("/api/chat/session/{session_id}")
def get_chat_session(
    request: Request,
    session_id: str,
    partner_id: UUID | None = None,
    user_id: UUID | None = None,
    dialog_session_id: UUID | None = None,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> dict:
    """История: при переданных partner/user/dialog UUID отдаём расшифрованный `app.dialog_messages`, иначе legacy `chat_sessions`."""
    normalized_session_id = _normalize_widget_session_id(session_id)
    _enforce_widget_session(auth, normalized_session_id)
    _rate_limit_widget_request(
        request,
        bucket="chat_session_get",
        limit=max(1, int(os.getenv("WIDGET_CHAT_SESSION_GET_RATE_LIMIT", "80"))),
        window_seconds=max(30, int(os.getenv("WIDGET_CHAT_SESSION_GET_RATE_WINDOW_SECONDS", "60"))),
    )
    resolved_partner_id = _enforce_widget_partner(auth, partner_id) if partner_id else auth.partner_id
    if user_id and dialog_session_id:
        drow = _verify_widget_dialog_session(db, resolved_partner_id, user_id, dialog_session_id, normalized_session_id)
        if drow:
            msgs = _dialog_transcript_as_chat_messages(db, resolved_partner_id, dialog_session_id, limit=50)
            if msgs:
                return {"session_id": normalized_session_id, "messages": msgs}
    row = db.get(ChatSession, normalized_session_id[:64])
    if not row:
        return {"session_id": normalized_session_id, "messages": []}
    return {"session_id": normalized_session_id, "messages": row.messages}


@app.put("/api/chat/session/{session_id}", status_code=200)
def upsert_chat_session(
    request: Request,
    session_id: str,
    req: ChatSessionUpsert,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> dict:
    normalized_session_id = _normalize_widget_session_id(session_id)
    _enforce_widget_session(auth, normalized_session_id)
    _rate_limit_widget_request(
        request,
        bucket="chat_session_put",
        limit=max(1, int(os.getenv("WIDGET_CHAT_SESSION_PUT_RATE_LIMIT", "40"))),
        window_seconds=max(30, int(os.getenv("WIDGET_CHAT_SESSION_PUT_RATE_WINDOW_SECONDS", "60"))),
    )
    if len(req.messages) > MAX_WIDGET_HISTORY_ITEMS:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Слишком длинная история чата.")
    slice_msgs: list[dict] = []
    for raw_item in req.messages[-50:]:
        if not isinstance(raw_item, dict):
            continue
        item = dict(raw_item)
        content = str(item.get("content", ""))
        if len(content) > MAX_WIDGET_MESSAGE_LEN:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Сообщение слишком длинное.")
        item["content"] = content
        role = str(item.get("role", "")).strip().lower()
        if role:
            item["role"] = role[:32]
        slice_msgs.append(item)
    _enforce_payload_limit(
        slice_msgs,
        max_bytes=max(MAX_WIDGET_DATA_BLOB_BYTES * 2, 16384),
        detail="История чата слишком большая.",
    )

    row = db.get(ChatSession, normalized_session_id[:64])
    now = datetime.now(timezone.utc)
    if row:
        row.messages = slice_msgs
        row.updated_at = now
    else:
        db.add(ChatSession(id=normalized_session_id[:64], messages=slice_msgs, updated_at=now, created_at=now))

    resolved_partner_id = _enforce_widget_partner(auth, req.partner_id) if req.partner_id else auth.partner_id
    if req.user_id and req.dialog_session_id:
        drow = _verify_widget_dialog_session(
            db, resolved_partner_id, req.user_id, req.dialog_session_id, normalized_session_id
        )
        if drow:
            _replace_dialog_messages_from_chat_snapshot(
                db, resolved_partner_id, req.user_id, req.dialog_session_id, slice_msgs
            )
    db.commit()
    return {"status": "saved"}


# ──────────────────────────────────────────────
# Email-захват
# ──────────────────────────────────────────────

class EmailCapture(Base):
    __tablename__ = "email_captures"

    id: Mapped[UUID] = mapped_column(PortableUUID(), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False, default="")
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class ClientReportEmailSend(Base):
    __tablename__ = "client_report_email_sends"

    id: Mapped[UUID] = mapped_column(PortableUUID(), primary_key=True, default=uuid4)
    partner_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    email_hash: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    email_masked: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="sent", index=True)
    report_checksum: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    report_length: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    diagnostic_summary: Mapped[dict] = mapped_column(SAJSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class EmailCaptureCreate(BaseModel):
    email: str = Field(min_length=5, max_length=MAX_WIDGET_FIELD_LEN)
    question: str = Field(default="", max_length=MAX_WIDGET_REASON_LEN)
    session_id: str = Field(min_length=1, max_length=64)
    captcha_token: str | None = Field(default=None, max_length=2048)
    website: str = Field(default="", max_length=64)


class ClientReportEmailCreate(BaseModel):
    model_config = ConfigDict(extra="allow")

    email: str = Field(min_length=5, max_length=MAX_WIDGET_FIELD_LEN)
    session_id: str = Field(min_length=1, max_length=64)
    report_text: str = Field(min_length=20)
    diagnostics: dict = Field(default_factory=dict)
    consent: bool = False
    captcha_token: str | None = Field(default=None, max_length=2048)
    website: str = Field(default="", max_length=64)


def _reject_client_report_email_extra_fields(req: ClientReportEmailCreate) -> None:
    extra = getattr(req, "__pydantic_extra__", None) or {}
    if extra:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report email payload contains unsupported fields.")


def _normalize_client_report_email(raw_email: str) -> str:
    email = str(raw_email or "").strip().lower()
    if len(email) > MAX_WIDGET_FIELD_LEN or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный email.")
    return email


def _mask_email_for_operator(email: str) -> str:
    local, _, domain = str(email or "").partition("@")
    if not local or not domain:
        return ""
    if len(local) <= 2:
        masked_local = local[:1] + "***"
    else:
        masked_local = local[:1] + "***" + local[-1:]
    return f"{masked_local}@{domain}"


def _client_report_email_payload(req: ClientReportEmailCreate, email: str) -> dict[str, object]:
    report_text = req.report_text.strip()
    diagnostics = _manyasha_diagnostics_lead_packet(req.diagnostics)
    return {
        "email": email,
        "session_id": _normalize_widget_session_id(req.session_id),
        "report_text": report_text,
        "diagnostics": diagnostics,
        "disclaimer": (
            "Это предварительный итог по вашим словам, не юридическое заключение "
            "и не гарантия списания долгов."
        ),
    }


def _send_client_report_email(payload: dict[str, object]) -> str:
    webhook_url = (os.getenv("CLIENT_REPORT_EMAIL_WEBHOOK_URL") or "").strip()
    if webhook_url:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        report_req = urllib_request.Request(
            url=webhook_url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib_request.urlopen(report_req, timeout=5) as resp:
                if int(getattr(resp, "status", 200)) >= 400:
                    raise RuntimeError("email webhook returned error")
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Email delivery service недоступен.",
            ) from exc
        return "webhook"

    if _is_production_or_staging_env():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery не настроен для этого окружения.",
        )
    return "mock"


@app.post("/api/email-capture", status_code=201)
def capture_email(
    request: Request,
    req: EmailCaptureCreate,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> dict:
    _enforce_widget_session(auth, req.session_id)
    if req.website.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email capture payload.")
    _rate_limit_widget_request(
        request,
        bucket="email_capture",
        limit=max(1, int(os.getenv("WIDGET_EMAIL_CAPTURE_RATE_LIMIT", "8"))),
        window_seconds=max(30, int(os.getenv("WIDGET_EMAIL_CAPTURE_RATE_WINDOW_SECONDS", "300"))),
    )
    _enforce_payload_limit(
        req.model_dump(mode="json"),
        max_bytes=max(MAX_WIDGET_DATA_BLOB_BYTES, 8192),
        detail="Email capture payload слишком большой.",
    )
    _enforce_captcha_if_required(request, req.captcha_token)
    db.add(EmailCapture(
        email=req.email.strip().lower(),
        question=req.question.strip(),
        session_id=_normalize_widget_session_id(req.session_id),
    ))
    db.commit()
    return {"status": "captured"}


@app.post("/api/client-report-email", status_code=202)
def send_client_report_email(
    request: Request,
    req: ClientReportEmailCreate,
    auth: WidgetAuthContext = Depends(require_widget_auth),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    _reject_client_report_email_extra_fields(req)
    _enforce_widget_session(auth, req.session_id)
    if req.website.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report email payload.")
    if not req.consent:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Требуется согласие на отправку отчёта.")

    email = _normalize_client_report_email(req.email)
    report_text = req.report_text.strip()
    if len(report_text) > MAX_CLIENT_REPORT_EMAIL_TEXT_LEN:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Report text слишком большой.")

    safe_payload = _client_report_email_payload(req, email)
    _enforce_payload_limit(
        safe_payload,
        max_bytes=max(MAX_WIDGET_DATA_BLOB_BYTES, 12_000),
        detail="Report email payload слишком большой.",
    )
    _rate_limit_widget_request(
        request,
        bucket="client_report_email:" + hashlib.sha256(f"{auth.session_id}:{email}".encode("utf-8")).hexdigest()[:16],
        limit=max(1, int(os.getenv("WIDGET_CLIENT_REPORT_EMAIL_RATE_LIMIT", "4"))),
        window_seconds=max(60, int(os.getenv("WIDGET_CLIENT_REPORT_EMAIL_RATE_WINDOW_SECONDS", "900"))),
    )
    _enforce_captcha_if_required(request, req.captcha_token)
    _send_client_report_email(safe_payload)
    db.add(ClientReportEmailSend(
        id=uuid4(),
        partner_id=str(auth.partner_id) if auth.partner_id else None,
        session_id=_normalize_widget_session_id(req.session_id),
        email_hash=_hash_pii(email),
        email_masked=_mask_email_for_operator(email),
        status="sent",
        report_checksum=hashlib.sha256(report_text.encode("utf-8")).hexdigest(),
        report_length=len(report_text),
        diagnostic_summary=safe_payload.get("diagnostics") if isinstance(safe_payload.get("diagnostics"), dict) else {},
    ))
    db.commit()
    return {"status": "sent"}


# ──────────────────────────────────────────────
# Embed-скрипт для партнёров
# ──────────────────────────────────────────────

@app.get("/embed.js", response_class=PlainTextResponse)
def embed_script(request: Request, id: str = "") -> PlainTextResponse:
    """Универсальный embed-скрипт для подключения виджета Маняши на внешних сайтах."""
    api_origin = str(request.base_url).rstrip("/")
    widget_origin = os.getenv("MANYASHA_WIDGET_ORIGIN", "").strip()
    default_site_key = os.getenv("WIDGET_SITE_KEY", "").strip()
    default_install_token = os.getenv("WIDGET_INSTALL_TOKEN", "").strip()
    default_contract_version = _default_supported_embed_contract_version()
    frontend_url = (os.getenv("FRONTEND_URL") or "").strip()

    def _add_origin(target: list[str], raw: str) -> None:
        clean = str(raw or "").strip().rstrip("/")
        if not clean or clean in target:
            return
        if not re.match(r"^https?://", clean, flags=re.IGNORECASE):
            return
        target.append(clean)

    widget_origin_candidates: list[str] = []
    # Предпочитаем явно заданный UI origin, затем локальный фронт (5173/3000), затем API origin.
    _add_origin(widget_origin_candidates, widget_origin)
    try:
        parsed_api = urllib_parse.urlsplit(api_origin)
        if (parsed_api.hostname or "").strip():
            if parsed_api.port == 8000:
                origin_with_frontend = urllib_parse.urlunsplit((
                    parsed_api.scheme,
                    f"{parsed_api.hostname}:5173",
                    "",
                    "",
                    "",
                ))
                _add_origin(widget_origin_candidates, origin_with_frontend)
            elif parsed_api.port == 5173:
                origin_with_backend = urllib_parse.urlunsplit((
                    parsed_api.scheme,
                    f"{parsed_api.hostname}:8000",
                    "",
                    "",
                    "",
                ))
                _add_origin(widget_origin_candidates, origin_with_backend)
    except Exception:
        pass
    _add_origin(widget_origin_candidates, frontend_url)
    _add_origin(widget_origin_candidates, api_origin)

    if not widget_origin_candidates:
        widget_origin_candidates = [api_origin]

    # Оставляем совместимость: первый кандидат — основной, остальные используем как фоллбеки.
    default_widget_origin = widget_origin_candidates[0]
    partner_id = id or "default"
    js_template = r"""(function() {
  var NS = window.ManyashaWidget = window.ManyashaWidget || {};
  NS.instances = NS.instances || {};

  function pickValue() {
    for (var i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (v !== null && v !== undefined) {
        var s = String(v).trim();
        if (s !== '') return s;
      }
    }
    return '';
  }

  function asBool(value, fallback) {
    var raw = pickValue(value);
    if (!raw) return !!fallback;
    return /^(1|true|yes|on|open)$/i.test(raw);
  }

  function asInt(value, fallback, min, max) {
    var n = parseInt(pickValue(value), 10);
    if (!isFinite(n)) n = fallback;
    if (typeof min === 'number' && n < min) n = min;
    if (typeof max === 'number' && n > max) n = max;
    return n;
  }

  function asNumber(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : fallback;
  }

  function parseHostColor(value) {
    var m = String(value || '').match(/rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)(?:\s*[,/]\s*([0-9.]+))?\s*\)/i);
    if (!m) return null;
    return {
      r: asInt(m[1], 255, 0, 255),
      g: asInt(m[2], 255, 0, 255),
      b: asInt(m[3], 255, 0, 255),
      a: m[4] === undefined ? 1 : Math.min(Math.max(asNumber(m[4], 1), 0), 1)
    };
  }

  function detectHostTheme() {
    var bg = '';
    try { bg = getComputedStyle(document.body).backgroundColor || ''; } catch (_err) {}
    var c = parseHostColor(bg);
    if (!c || c.a < 0.35) return { mode: 'light', tone: 'neutral' };
    var lum = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
    var warmBias = c.r - c.b;
    return {
      mode: lum < 0.45 ? 'dark' : 'light',
      tone: warmBias > 14 ? 'warm' : 'neutral'
    };
  }

  var defaultPid = __DEFAULT_PID__;
  var defaultWidgetOrigins = __DEFAULT_WIDGET_ORIGINS__;
  var defaultWidgetOrigin = '';
  if (Object.prototype.toString.call(defaultWidgetOrigins) === '[object Array]' && defaultWidgetOrigins.length) {
    defaultWidgetOrigin = defaultWidgetOrigins[0] || '';
  } else if (typeof defaultWidgetOrigins === 'string') {
    defaultWidgetOrigin = defaultWidgetOrigins;
    defaultWidgetOrigins = [defaultWidgetOrigins];
  } else {
    defaultWidgetOrigins = [];
  }
  var defaultApiOrigin = __DEFAULT_API_ORIGIN__;
  var defaultSiteKey = __DEFAULT_SITE_KEY__;
  var defaultInstallToken = __DEFAULT_INSTALL_TOKEN__;
  var defaultEmbedContractVersion = __DEFAULT_EMBED_CONTRACT_VERSION__;

  var scriptEl = document.currentScript;
  if (!scriptEl) {
    var scripts = document.getElementsByTagName('script');
    scriptEl = scripts.length ? scripts[scripts.length - 1] : null;
  }

  function dataAttr(name) {
    return scriptEl ? scriptEl.getAttribute(name) : '';
  }

  var sourceHref = scriptEl && scriptEl.src ? scriptEl.src : window.location.href;
  var sourceUrl;
  try {
    sourceUrl = new URL(sourceHref, window.location.href);
  } catch (_e) {
    sourceUrl = null;
  }
  var scriptOrigin = sourceUrl ? sourceUrl.origin : window.location.origin;
  var sourceParams = sourceUrl ? sourceUrl.searchParams : new URLSearchParams();

  var pid = pickValue(
    sourceParams.get('pid'),
    sourceParams.get('id'),
    dataAttr('data-pid'),
    dataAttr('data-id'),
    defaultPid,
    'default'
  );
  if (!pid) pid = 'default';

  var instanceId = pickValue(
    sourceParams.get('instance'),
    dataAttr('data-instance'),
    'manyasha-' + pid
  );
  if (NS.instances[instanceId]) return;

  var side = pickValue(
    sourceParams.get('side'),
    dataAttr('data-side'),
    'right'
  ).toLowerCase() === 'left' ? 'left' : 'right';

  var size = pickValue(
    sourceParams.get('size'),
    dataAttr('data-size'),
    'medium'
  ).toLowerCase();

  var startOpen = asBool(
    pickValue(
      sourceParams.get('startOpen'),
      sourceParams.get('start_open'),
      dataAttr('data-start-open'),
      dataAttr('data-startopen')
    ),
    false
  );

  var autoOpenDelayMs = asInt(
    pickValue(
      sourceParams.get('autoOpenMs'),
      sourceParams.get('auto_open_ms'),
      dataAttr('data-auto-open-ms')
    ),
    0,
    0,
    120000
  );

  var zIndex = asInt(
    pickValue(
      sourceParams.get('zIndex'),
      sourceParams.get('z_index'),
      dataAttr('data-z-index'),
      dataAttr('data-zindex')
    ),
    2147483000,
    1,
    2147483647
  );

  var launcherType = pickValue(
    sourceParams.get('launcher'),
    dataAttr('data-launcher'),
    'avatar'
  ).toLowerCase();

  var siteKey = pickValue(
    sourceParams.get('site_key'),
    sourceParams.get('siteKey'),
    dataAttr('data-site-key'),
    dataAttr('data-sitekey'),
    window.__MANYASHA_SITE_KEY,
    defaultSiteKey
  );

  var installToken = pickValue(
    sourceParams.get('install_token'),
    sourceParams.get('installToken'),
    dataAttr('data-install-token'),
    dataAttr('data-installtoken'),
    window.__MANYASHA_INSTALL_TOKEN,
    defaultInstallToken
  );

  var embedContractVersion = pickValue(
    sourceParams.get('embed_contract_version'),
    sourceParams.get('embedContractVersion'),
    dataAttr('data-embed-contract-version'),
    dataAttr('data-embedcontractversion'),
    dataAttr('data-contract-version'),
    window.__MANYASHA_EMBED_CONTRACT_VERSION,
    defaultEmbedContractVersion
  );

  var hostOffsetX = asInt(
    pickValue(
      sourceParams.get('offsetX'),
      sourceParams.get('offset_x'),
      dataAttr('data-offset-x'),
      dataAttr('data-offsetx')
    ),
    18,
    0,
    160
  );
  var hostOffsetY = asInt(
    pickValue(
      sourceParams.get('offsetY'),
      sourceParams.get('offset_y'),
      dataAttr('data-offset-y'),
      dataAttr('data-offsety')
    ),
    18,
    0,
    160
  );

  var launcherSize = asInt(
    pickValue(
      sourceParams.get('launcherSize'),
      sourceParams.get('launcher_size'),
      dataAttr('data-launcher-size')
    ),
    72,
    56,
    120
  );

  var apiOrigin = pickValue(
    sourceParams.get('api_origin'),
    sourceParams.get('apiOrigin'),
    dataAttr('data-api-origin'),
    dataAttr('data-apiorigin'),
    window.__MANYASHA_API_ORIGIN,
    defaultApiOrigin
  );

  var widgetOriginInput = pickValue(
    sourceParams.get('widget_origin'),
    sourceParams.get('widgetOrigin'),
    dataAttr('data-widget-origin'),
    dataAttr('data-widgetorigin'),
    window.__MANYASHA_WIDGET_ORIGIN,
    defaultWidgetOrigin,
    scriptOrigin
  );

  var widgetPath = pickValue(
    sourceParams.get('widget_path'),
    sourceParams.get('widgetPath'),
    dataAttr('data-widget-path'),
    dataAttr('data-widgetpath'),
    ''
  ).replace(/^\/+|\/+$/g, '');

  var widgetOriginCandidates = [];
  function addWidgetOriginCandidate(raw) {
    var clean = String(raw || '').replace(/\/+$/, '');
    if (!clean) return;
    if (clean.indexOf('://') === -1) return;
    for (var i = 0; i < widgetOriginCandidates.length; i++) {
      if (widgetOriginCandidates[i] === clean) return;
    }
    widgetOriginCandidates.push(clean);
  }

  if (widgetOriginInput) addWidgetOriginCandidate(widgetOriginInput);
  if (Array.isArray(defaultWidgetOrigins)) {
    for (var wi = 0; wi < defaultWidgetOrigins.length; wi++) {
      addWidgetOriginCandidate(defaultWidgetOrigins[wi]);
    }
  } else {
    addWidgetOriginCandidate(defaultWidgetOrigins);
  }
  addWidgetOriginCandidate(scriptOrigin);
  if (!widgetOriginCandidates.length) widgetOriginCandidates.push(scriptOrigin || window.location.origin);

  var widgetOriginIndex = 0;
  function getWidgetOriginCandidate() {
    return widgetOriginCandidates[Math.min(widgetOriginIndex, widgetOriginCandidates.length - 1)] || '';
  }
  function normalizeOrigin(raw) {
    try {
      return new URL(raw).origin;
    } catch (_eCandidate) {
      return '';
    }
  }
  var widgetBaseUrl = null;
  function rebuildWidgetBase() {
    var baseCandidate = getWidgetOriginCandidate();
    var prepared = baseCandidate || scriptOrigin || window.location.href;
    try {
      widgetBaseUrl = new URL(prepared, scriptOrigin || window.location.href);
    } catch (_eRebuild) {
      widgetBaseUrl = new URL(scriptOrigin || window.location.origin);
    }
  }
  function buildWidgetBase() {
    var base = new URL(widgetBaseUrl.toString());
    var cleanPath = base.pathname.replace(/\/+$/g, '');
    if (widgetPath) {
      cleanPath = (cleanPath ? cleanPath : '') + '/' + widgetPath;
    }
    base.pathname = (cleanPath ? cleanPath : '') + '/';
    return base;
  }

  rebuildWidgetBase();
  var widgetBase = buildWidgetBase();
  var widgetOrigin = normalizeOrigin(widgetBase.origin);
  function toWidgetUrl(pathname) {
    return new URL(String(pathname || '').replace(/^\/+/, ''), widgetBase).toString();
  }

  var sizes = {
    compact: { w: 340, h: 620 },
    medium: { w: 380, h: 700 },
    large: { w: 420, h: 760 }
  };
  var selected = sizes[size] || sizes.medium;
  var MOBILE_BREAKPOINT = 640;
  var MOBILE_W = 94;
  var MOBILE_H = 122;
  var widgetContextOrigin = '';
  try {
    widgetContextOrigin = (window.location && window.location.origin) ? window.location.origin : '';
  } catch (_eOrigin) {
    widgetContextOrigin = '';
  }
  var POS_KEY = 'manyasha_embed_pos_v3:' + String(widgetContextOrigin || 'unknown-origin') + ':' + instanceId + ':' + pid;
  var customPosition = null;
  var launcherDrag = null;
  var suppressLauncherClickUntil = 0;
  var embedDragSession = null;

  var host = document.createElement('div');
  host.setAttribute('data-manyasha-embed', '');
  host.setAttribute('data-manyasha-instance', instanceId);
  host.style.position = 'fixed';
  host.style.zIndex = String(zIndex);
  host.style.width = 'auto';
  host.style.height = 'auto';
  host.style.background = 'transparent';
  host.style.border = '0';
  host.style.boxShadow = 'none';
  host.style.overflow = 'visible';
  host.style.pointerEvents = 'none';

  var panel = document.createElement('div');
  panel.style.position = 'absolute';
  panel.style.bottom = '0';
  panel.style.width = selected.w + 'px';
  panel.style.height = selected.h + 'px';
  panel.style.maxWidth = 'calc(100vw - 20px)';
  panel.style.maxHeight = 'calc(100vh - 20px)';
  panel.style.background = 'transparent';
  panel.style.border = '0';
  panel.style.boxShadow = 'none';
  panel.style.overflow = 'hidden';
  panel.style.display = startOpen ? 'block' : 'none';
  panel.style.pointerEvents = 'auto';

  var iframe = document.createElement('iframe');
  iframe.allow = 'microphone';
  iframe.title = 'Маняша — AI-помощник';
  iframe.setAttribute('scrolling', 'no');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.display = 'block';
  iframe.style.border = '0';
  iframe.style.background = 'transparent';
  iframe.style.boxShadow = 'none';
  iframe.style.overflow = 'hidden';

  var iframeMounted = false;
  var widgetReady = false;
  var widgetReadyTimer = null;
  var installHealth = {
    status: 'booting',
    code: 'booting',
    message: 'Инициализация embed-виджета...',
    updatedAt: new Date().toISOString()
  };
  function cloneInstallHealth() {
    try {
      return JSON.parse(JSON.stringify(installHealth));
    } catch (_eHealthClone) {
      return {
        status: String(installHealth.status || 'unknown'),
        code: String(installHealth.code || 'unknown'),
        message: String(installHealth.message || ''),
        updatedAt: String(installHealth.updatedAt || '')
      };
    }
  }
  function setInstallHealth(statusName, code, message) {
    installHealth = {
      status: String(statusName || 'unknown'),
      code: String(code || 'unknown'),
      message: String(message || ''),
      updatedAt: new Date().toISOString()
    };
    try {
      window.dispatchEvent(new CustomEvent('manyasha:install-health', { detail: cloneInstallHealth() }));
    } catch (_eHealthEvent) {}
  }
  function clearWidgetReadyTimer() {
    if (widgetReadyTimer) {
      try { clearTimeout(widgetReadyTimer); } catch (_e8) {}
      widgetReadyTimer = null;
    }
  }
  function beginWidgetOriginWatchdog() {
    clearWidgetReadyTimer();
    widgetReady = false;
    widgetReadyTimer = setTimeout(function() {
      if (widgetReady) return;
      if (widgetOriginIndex < widgetOriginCandidates.length - 1) {
        setInstallHealth('warn', 'widget_origin_retry', 'Пробую резервный origin виджета...');
        widgetOriginIndex = widgetOriginIndex + 1;
        rebuildWidgetBase();
        widgetBase = buildWidgetBase();
        widgetOrigin = normalizeOrigin(widgetBase.origin);
        if (iframeMounted) mountIframe(true);
      } else {
        setInstallHealth(
          'error',
          'widget_iframe_timeout',
          'Виджет не загрузился. Проверьте CSP (script-src/frame-src), widget_origin и доступность API.'
        );
      }
    }, 4500);
  }
  function mountIframe(forceReload) {
    if (iframeMounted && !forceReload) return;
    if (forceReload && iframeMounted) {
      try { panel.removeChild(iframe); } catch (_e3) {}
      iframeMounted = false;
    }
    rebuildWidgetBase();
    widgetBase = buildWidgetBase();
    widgetOrigin = normalizeOrigin(widgetBase.origin);

    var hostTheme = detectHostTheme();
    var iframeUrl = new URL(toWidgetUrl('widget.html'));
    iframeUrl.searchParams.set('pid', pid);
    if (instanceId) iframeUrl.searchParams.set('instance', instanceId);
    iframeUrl.searchParams.set('embed', '1');
    iframeUrl.searchParams.set('embed_size', size);
    if (apiOrigin) iframeUrl.searchParams.set('api_origin', apiOrigin);
    if (siteKey) iframeUrl.searchParams.set('site_key', siteKey);
    if (installToken) iframeUrl.searchParams.set('install_token', installToken);
    iframeUrl.searchParams.set('embed_contract_version', String(embedContractVersion || defaultEmbedContractVersion || '1'));
    iframeUrl.searchParams.set('host_mode', hostTheme.mode);
    iframeUrl.searchParams.set('host_tone', hostTheme.tone);
    setInstallHealth('booting', 'widget_iframe_loading', 'Загружаю iframe виджета...');
    iframe.src = iframeUrl.toString();
    panel.appendChild(iframe);
    iframeMounted = true;
    beginWidgetOriginWatchdog();
  }
  iframe.addEventListener('error', function() {
    setInstallHealth(
      'error',
      'widget_iframe_error',
      'Ошибка загрузки iframe виджета. Проверьте CSP/frame-src и доступность widget origin.'
    );
  });

  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Открыть Маняшу');
  launcher.style.position = 'absolute';
  launcher.style.bottom = '0';
  launcher.style.width = launcherSize + 'px';
  launcher.style.height = launcherSize + 'px';
  launcher.style.border = '0';
  launcher.style.padding = '0';
  launcher.style.borderRadius = '999px';
  launcher.style.background = 'transparent';
  launcher.style.cursor = 'pointer';
  launcher.style.pointerEvents = 'auto';
  launcher.style.display = startOpen ? 'none' : 'flex';
  launcher.style.alignItems = 'center';
  launcher.style.justifyContent = 'center';
  launcher.style.boxShadow = 'none';

  if (launcherType === 'round' || launcherType === 'avatar') {
    var avatar = document.createElement('img');
    avatar.src = toWidgetUrl('mascot/mascot-idle-open.jpg');
    avatar.alt = 'Маняша';
    avatar.style.width = '100%';
    avatar.style.height = '100%';
    avatar.style.display = 'block';
    avatar.style.objectFit = 'cover';
    avatar.style.borderRadius = '999px';
    avatar.style.border = '2px solid rgba(196,149,106,0.62)';
    avatar.style.background = 'linear-gradient(180deg,#fff,#f6efe6)';
    launcher.appendChild(avatar);
  } else {
    launcher.textContent = 'Маняша';
    launcher.style.width = '108px';
    launcher.style.background = 'linear-gradient(135deg,#ffffff,#f6efe6)';
    launcher.style.color = '#8a633c';
    launcher.style.font = '700 14px Inter,Arial,sans-serif';
    launcher.style.border = '1px solid rgba(196,149,106,0.35)';
  }

  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Закрыть Маняшу');
  closeBtn.textContent = '×';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '8px';
  closeBtn.style.width = '28px';
  closeBtn.style.height = '28px';
  closeBtn.style.border = '0';
  closeBtn.style.borderRadius = '999px';
  closeBtn.style.background = 'rgba(255,255,255,0.92)';
  closeBtn.style.color = '#8a633c';
  closeBtn.style.font = '400 22px/1 Arial,sans-serif';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.display = 'none';
  closeBtn.style.alignItems = 'center';
  closeBtn.style.justifyContent = 'center';
  closeBtn.style.pointerEvents = 'none';
  closeBtn.style.boxShadow = '0 2px 10px rgba(26,58,92,0.10)';
  closeBtn.style.zIndex = '6';

  function loadCustomPosition() {
    try {
      var raw = localStorage.getItem(POS_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.left !== 'number' || typeof parsed.top !== 'number') return null;
      return { left: parsed.left, top: parsed.top };
    } catch (_e4) {
      return null;
    }
  }

  function saveCustomPosition() {
    if (!customPosition) return;
    try { localStorage.setItem(POS_KEY, JSON.stringify(customPosition)); } catch (_e5) {}
  }

  function clearCustomPosition() {
    try { localStorage.removeItem(POS_KEY); } catch (_e6) {}
  }

  function activeBounds() {
    if (opened && panel.style.display !== 'none') {
      return {
        w: panel.offsetWidth || asInt(panel.style.width, selected.w, 260, 960),
        h: panel.offsetHeight || asInt(panel.style.height, selected.h, 320, 1200)
      };
    }
    return {
      w: launcher.offsetWidth || launcherSize,
      h: launcher.offsetHeight || launcherSize
    };
  }

  function clampHostPosition(left, top) {
    var sizeBox = activeBounds();
    var maxLeft = Math.max(0, window.innerWidth - sizeBox.w);
    var maxTop = Math.max(0, window.innerHeight - sizeBox.h);
    return {
      left: Math.min(Math.max(left, 0), maxLeft),
      top: Math.min(Math.max(top, 0), maxTop)
    };
  }

  function applyCustomPosition(persist) {
    if (!customPosition) return false;
    var next = clampHostPosition(customPosition.left, customPosition.top);
    customPosition = next;
    host.style.left = Math.round(next.left) + 'px';
    host.style.top = Math.round(next.top) + 'px';
    host.style.right = 'auto';
    host.style.bottom = 'auto';
    if (persist) saveCustomPosition();
    return true;
  }

  function applyAnchor() {
    host.style.left = '';
    host.style.right = '';
    host.style.top = '';
    host.style.bottom = '';
    panel.style.left = '';
    panel.style.right = '';
    panel.style.top = '';
    panel.style.bottom = '';
    launcher.style.left = '';
    launcher.style.right = '';
    launcher.style.top = '';
    launcher.style.bottom = '';
    closeBtn.style.left = '';
    closeBtn.style.right = '';

    if (applyCustomPosition(false)) {
      panel.style.top = '0';
      panel.style.bottom = 'auto';
      launcher.style.top = '0';
      launcher.style.bottom = 'auto';
      if (side === 'left') {
        panel.style.left = '0';
        launcher.style.left = '0';
        closeBtn.style.left = '8px';
      } else {
        panel.style.right = '0';
        launcher.style.right = '0';
        closeBtn.style.right = '8px';
      }
      return;
    }

    host.style.bottom = hostOffsetY + 'px';
    panel.style.top = 'auto';
    panel.style.bottom = '0';
    launcher.style.top = 'auto';
    launcher.style.bottom = '0';
    if (side === 'left') {
      host.style.left = hostOffsetX + 'px';
      panel.style.left = '0';
      launcher.style.left = '0';
      closeBtn.style.left = '8px';
    } else {
      host.style.right = hostOffsetX + 'px';
      panel.style.right = '0';
      launcher.style.right = '0';
      closeBtn.style.right = '8px';
    }
  }

  function applyResponsive() {
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      panel.style.width = MOBILE_W + 'vw';
      panel.style.height = MOBILE_H + 'vw';
      panel.style.maxWidth = '360px';
      panel.style.maxHeight = '560px';
    } else {
      panel.style.width = selected.w + 'px';
      panel.style.height = selected.h + 'px';
      panel.style.maxWidth = 'calc(100vw - 20px)';
      panel.style.maxHeight = 'calc(100vh - 20px)';
    }
  }

  var opened = !!startOpen;
  customPosition = loadCustomPosition();
  function openWidget() {
    mountIframe(false);
    panel.style.display = 'block';
    launcher.style.display = 'none';
    closeBtn.style.display = 'none';
    opened = true;
    applyResponsive();
    applyAnchor();
  }

  function closeWidget() {
    panel.style.display = 'none';
    launcher.style.display = 'flex';
    closeBtn.style.display = 'none';
    opened = false;
    clearWidgetReadyTimer();
    applyResponsive();
    applyAnchor();
  }

  function toggleWidget() {
    if (opened) closeWidget();
    else openWidget();
  }

  function setPid(nextPid) {
    var safe = pickValue(nextPid);
    if (!safe || safe === pid) return;
    pid = safe;
    mountIframe(true);
  }

  function attachHost() {
    if (host.parentNode || !document.body) return;
    host.appendChild(panel);
    host.appendChild(launcher);
    document.body.appendChild(host);
    applyResponsive();
    applyAnchor();
  }

  function onMessage(e) {
    var incomingOrigin = normalizeOrigin(e.origin || '');
    if (!incomingOrigin) return;
    if (incomingOrigin !== widgetOrigin) {
      for (var wi = 0; wi < widgetOriginCandidates.length; wi++) {
        if (normalizeOrigin(widgetOriginCandidates[wi]) === incomingOrigin) {
          widgetOrigin = incomingOrigin;
          break;
        }
      }
    }
    if (incomingOrigin !== widgetOrigin) return;
    var payload = e.data || {};
    if (payload.type === 'manyasha:embed-ready') {
      widgetReady = true;
      clearWidgetReadyTimer();
      widgetOrigin = incomingOrigin || widgetOrigin;
      setInstallHealth('ok', 'widget_ready', 'Embed-виджет успешно загружен.');
      return;
    }
    if (payload.type === 'manyasha:embed-drag-start') {
      var rect = host.getBoundingClientRect();
      customPosition = { left: rect.left, top: rect.top };
      embedDragSession = { left: rect.left, top: rect.top };
      return;
    }
    if (payload.type === 'manyasha:embed-drag') {
      if (!embedDragSession) return;
      customPosition = {
        left: embedDragSession.left + asNumber(payload.dx, 0),
        top: embedDragSession.top + asNumber(payload.dy, 0)
      };
      applyAnchor();
      return;
    }
    if (payload.type === 'manyasha:embed-drag-end') {
      if (embedDragSession) {
        embedDragSession = null;
        applyCustomPosition(true);
      }
      return;
    }
    if (payload.type === 'manyasha:resize' && panel.style.display !== 'none') {
      if (embedDragSession) return;
      var width = asInt(payload.width, selected.w, 280, 960);
      var height = asInt(payload.height, selected.h, 360, 1200);
      if (window.innerWidth > MOBILE_BREAKPOINT) {
        panel.style.width = Math.min(width, window.innerWidth - 20) + 'px';
        panel.style.height = Math.min(height, window.innerHeight - 20) + 'px';
      }
      applyAnchor();
      return;
    }
    if (payload.type === 'manyasha:open') {
      openWidget();
      return;
    }
    if (payload.type === 'manyasha:close') {
      closeWidget();
    }
  }

  function onResize() {
    applyResponsive();
    applyAnchor();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && opened) closeWidget();
  }

  function endLauncherDrag(e) {
    if (!launcherDrag) return;
    if (e && launcherDrag.pointerId !== e.pointerId) return;
    var wasMoved = !!launcherDrag.moved;
    launcherDrag = null;
    if (wasMoved) {
      suppressLauncherClickUntil = Date.now() + 280;
      applyCustomPosition(true);
    }
  }

  launcher.addEventListener('pointerdown', function(e) {
    if (opened) return;
    if (e.button !== undefined && e.button !== 0) return;
    var r = host.getBoundingClientRect();
    customPosition = { left: r.left, top: r.top };
    launcherDrag = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      left: r.left,
      top: r.top,
      moved: false
    };
    try { launcher.setPointerCapture(e.pointerId); } catch (_e7) {}
    e.preventDefault();
  });
  launcher.addEventListener('pointermove', function(e) {
    if (!launcherDrag || launcherDrag.pointerId !== e.pointerId) return;
    var dx = e.clientX - launcherDrag.startX;
    var dy = e.clientY - launcherDrag.startY;
    if (!launcherDrag.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      launcherDrag.moved = true;
    }
    customPosition = { left: launcherDrag.left + dx, top: launcherDrag.top + dy };
    applyAnchor();
  });
  launcher.addEventListener('pointerup', endLauncherDrag);
  launcher.addEventListener('pointercancel', endLauncherDrag);
  launcher.addEventListener('click', function(e) {
    if (Date.now() < suppressLauncherClickUntil) {
      e.preventDefault();
      return;
    }
    openWidget();
  });
  closeBtn.addEventListener('click', closeWidget);

  if (document.body) attachHost();
  else document.addEventListener('DOMContentLoaded', attachHost, { once: true });

  window.addEventListener('message', onMessage);
  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeyDown);

  if (startOpen) openWidget();
  else if (autoOpenDelayMs > 0) {
    setTimeout(function() {
      if (!opened) openWidget();
    }, autoOpenDelayMs);
  }

  var api = {
    id: instanceId,
    pid: function() { return pid; },
    open: openWidget,
    close: closeWidget,
    toggle: toggleWidget,
    isOpen: function() { return opened; },
    setPid: setPid,
    getPosition: function() {
      if (customPosition) return { mode: 'custom', left: customPosition.left, top: customPosition.top };
      return { mode: 'anchor', side: side, offsetX: hostOffsetX, offsetY: hostOffsetY };
    },
    setPosition: function(left, top) {
      customPosition = { left: asNumber(left, 0), top: asNumber(top, 0) };
      applyAnchor();
      applyCustomPosition(true);
    },
    resetPosition: function() {
      customPosition = null;
      clearCustomPosition();
      applyAnchor();
    },
    getInstallHealth: function() {
      return cloneInstallHealth();
    },
    config: {
      side: side,
      size: size,
      apiOrigin: apiOrigin,
      widgetOrigin: widgetOrigin
    },
    destroy: function() {
      clearWidgetReadyTimer();
      window.removeEventListener('message', onMessage);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKeyDown);
      if (host.parentNode) host.parentNode.removeChild(host);
      delete NS.instances[instanceId];
      if (NS.defaultInstanceId === instanceId) {
        NS.defaultInstanceId = Object.keys(NS.instances)[0] || '';
      }
    }
  };

  NS.instances[instanceId] = api;
  if (!NS.defaultInstanceId) NS.defaultInstanceId = instanceId;

  NS.get = NS.get || function(id) {
    var key = pickValue(id, NS.defaultInstanceId);
    return key ? (NS.instances[key] || null) : null;
  };
  NS.open = NS.open || function(id) {
    var ref = NS.get(id);
    if (ref) ref.open();
  };
  NS.close = NS.close || function(id) {
    var ref = NS.get(id);
    if (ref) ref.close();
  };
  NS.toggle = NS.toggle || function(id) {
    var ref = NS.get(id);
    if (ref) ref.toggle();
  };

  window.__manyashaEmbedded = true;
})();"""
    js = (
        js_template
        .replace("__DEFAULT_PID__", json.dumps(partner_id))
        .replace("__DEFAULT_WIDGET_ORIGINS__", json.dumps(widget_origin_candidates))
        .replace("__DEFAULT_WIDGET_ORIGIN__", json.dumps(widget_origin))
        .replace("__DEFAULT_API_ORIGIN__", json.dumps(api_origin))
        .replace("__DEFAULT_SITE_KEY__", json.dumps(default_site_key))
        .replace("__DEFAULT_INSTALL_TOKEN__", json.dumps(default_install_token))
        .replace("__DEFAULT_EMBED_CONTRACT_VERSION__", json.dumps(default_contract_version))
    )
    return PlainTextResponse(js, media_type="application/javascript")
