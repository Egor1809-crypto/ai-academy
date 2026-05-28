from __future__ import annotations

import base64
import hashlib
import hmac
import inspect
import json
import os
import re
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
from asyncio import sleep
from typing import Any, Callable, ParamSpec, Protocol, TypeVar
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import JSON, Boolean, DateTime, Integer, LargeBinary, String, UniqueConstraint, and_, func, select, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, Session, mapped_column

from mascot_talk_service import MascotTalkContext, MascotTalkHistoryItem, MascotTalkService
from rpg_engine import (
    Base,
    PartnerRPGProgress,
    RPGConfigWeights,
    RPGEvent,
    RPGAuditLog,
    ReputationLog,
    WeightSet,
    apply_partner_rls,
    calculate_partner_level,
    engine,
    fetch_partner_weights,
    get_db,
)


router = APIRouter(prefix="/api/v1/partner", tags=["partner-dashboard"])

ALLOWED_UPLOAD_MIME_TYPES = {
    "model/gltf-binary",
    "model/gltf+json",
    "application/octet-stream",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/ktx2",
}
FORBIDDEN_PROMPT_PATTERNS = [
    "ignore previous",
    "you are now",
    "pretend you",
    "disregard",
]
MAX_PROMPT_TOKENS = 1800
PRESIGNED_TTL_SECONDS = 600
MAX_UPLOADS_PER_HOUR = 5
MAX_API_REQUESTS_PER_MINUTE = 50
MAX_PARTNER_MODEL_BYTES = 15 * 1024 * 1024
DEV_AUTH_SESSION_TTL_SECONDS = 12 * 60 * 60
PARTNER_TOKEN_TTL_DAYS = 30
DEFAULT_DEV_PARTNER_ID = UUID("00000000-0000-0000-0000-000000000001")
DEFAULT_DEV_STORAGE_DIR = ".dev-storage"
PASSWORD_SCRYPT_N = int(os.getenv("PASSWORD_SCRYPT_N", "16384"))
PASSWORD_SCRYPT_R = int(os.getenv("PASSWORD_SCRYPT_R", "8"))
PASSWORD_SCRYPT_P = int(os.getenv("PASSWORD_SCRYPT_P", "1"))
PASSWORD_SCRYPT_DKLEN = int(os.getenv("PASSWORD_SCRYPT_DKLEN", "32"))

P = ParamSpec("P")
T = TypeVar("T")


class PartnerMascotAsset(Base):
    __tablename__ = "partner_mascot_assets"
    __table_args__ = (
        UniqueConstraint("partner_id", "object_key", name="uq_partner_mascot_object_key"),
    )

    asset_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    partner_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    object_key: Mapped[str] = mapped_column(String(512), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    upload_url_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class PartnerPromptSecret(Base):
    __tablename__ = "partner_prompt_secrets"
    __table_args__ = (
        UniqueConstraint("partner_id", "version", name="uq_partner_prompt_secret_version"),
    )

    prompt_secret_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    partner_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    ciphertext: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    nonce: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    encrypted_data_key: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    kms_key_id: Mapped[str] = mapped_column(String(255), nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class PartnerDashboardAuditLog(Base):
    __tablename__ = "partner_dashboard_audit_log"

    audit_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    partner_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class Partner(Base):
    """Зарегистрированный партнёр с логином и паролем."""
    __tablename__ = "partners"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


@dataclass(slots=True)
class PartnerDashboardContext:
    partner_id: UUID


@dataclass(slots=True)
class DevSession:
    partner_id: UUID
    partner_name: str
    token: str


class PresignedUrlResponse(BaseModel):
    url: str
    method: str = "PUT"
    expires_at: datetime
    object_key: str
    required_headers: dict[str, str] = Field(default_factory=dict)


class PartnerMascotUploadRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    file_name: str = Field(min_length=3, max_length=255)
    content_type: str
    size_bytes: int = Field(gt=0, le=MAX_PARTNER_MODEL_BYTES)
    prompt_text: str | None = None
    kms_key_id: str | None = None

    @model_validator(mode="after")
    def validate_file_name(self) -> "PartnerMascotUploadRequest":
        allowed_suffixes = (".glb", ".gltf", ".png", ".jpg", ".jpeg", ".webp", ".ktx2")
        if not self.file_name.lower().endswith(allowed_suffixes):
            raise ValueError("Разрешены только файлы GLB/GLTF и текстуры PNG/JPEG/WebP/KTX2.")
        return self


class PartnerMascotPreviewResponse(BaseModel):
    asset_id: UUID | None = None
    object_key: str | None = None
    preview_url: str | None = None
    content_type: str | None = None
    prompt_version: int | None = None
    prompt_token_count: int | None = None
    prompt_kms_key_id: str | None = None


class PartnerMascotRuntimeResponse(BaseModel):
    asset_id: UUID | None = None
    mode: str
    status: str
    content_type: str | None = None
    source_url: str | None = None
    preview_url: str | None = None
    sprite_url: str | None = None
    skeleton_url: str | None = None
    lods: dict[str, str] = Field(default_factory=dict)
    available_animations: list[str] = Field(default_factory=list)
    active_costume: str | None = None


class PartnerRegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class PartnerLoginRequest(BaseModel):
    email: str
    password: str


class PartnerTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    partner_id: UUID
    name: str
    expires_at: datetime


class PartnerMeResponse(BaseModel):
    partner_id: UUID
    name: str
    email: str
    created_at: datetime


class DevAuthLoginRequest(BaseModel):
    partner_id: UUID = DEFAULT_DEV_PARTNER_ID
    partner_name: str = "Demo Partner"


class DevAuthSessionResponse(BaseModel):
    token: str
    partner_id: UUID
    partner_name: str
    expires_at: datetime


class MascotConversationMessage(BaseModel):
    role: str = Field(pattern="^(system|user|assistant)$")
    content: str = Field(min_length=1, max_length=4000)


class MascotTalkAction(BaseModel):
    kind: str
    label: str
    target: str
    description: str | None = None


class PartnerMascotTalkRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    message: str = Field(min_length=1, max_length=4000)
    current_route: str = Field(min_length=1, max_length=128)
    history: list[MascotConversationMessage] = Field(default_factory=list, max_length=12)
    case_context: dict[str, Any] = Field(default_factory=dict)


class PartnerPromptPatchRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    prompt_text: str = Field(min_length=1, max_length=12000)
    kms_key_id: str | None = None


class RPGWeightsPatchRequest(BaseModel):
    weight_xp: int = Field(ge=0, le=100)
    weight_qi: int = Field(ge=0, le=100)
    weight_sp: int = Field(ge=0, le=100)
    weight_rp: int = Field(ge=0, le=100)

    @model_validator(mode="after")
    def validate_sum(self) -> "RPGWeightsPatchRequest":
        total = self.weight_xp + self.weight_qi + self.weight_sp + self.weight_rp
        if total != 100:
            raise ValueError("Сумма весов должна быть ровно 100. Исправьте распределение XP/QI/SP/RP и повторите запрос.")
        return self


class RPGWeightsResponse(BaseModel):
    partner_id: UUID
    version: int
    weight_xp: int
    weight_qi: int
    weight_sp: int
    weight_rp: int


class RPGAnalyticsResponse(BaseModel):
    partner_id: UUID
    progress: dict[str, Any]
    weights: RPGWeightsResponse
    event_counts: dict[str, int]
    reputation_penalties_total: int
    complaints_count: int


class YandexKMSKeyEnvelope(BaseModel):
    plaintext_key: bytes
    encrypted_key: bytes
    key_id: str


class YandexKMSKeyProvider(Protocol):
    def generate_data_key(self, partner_id: UUID, kms_key_id: str | None) -> YandexKMSKeyEnvelope:
        ...


class LocalYandexKMSKeyProvider:
    def generate_data_key(self, partner_id: UUID, kms_key_id: str | None) -> YandexKMSKeyEnvelope:
        key = hashlib.sha256(f"{partner_id}:{kms_key_id or 'local-dev-kms'}".encode("utf-8")).digest()
        return YandexKMSKeyEnvelope(
            plaintext_key=key,
            encrypted_key=base64.b64encode(key),
            key_id=kms_key_id or "local-dev-kms",
        )


class PromptCryptoService:
    def __init__(self, key_provider: YandexKMSKeyProvider) -> None:
        self.key_provider = key_provider

    # S-01: encrypts partner prompts with AES-256-GCM while keeping the DEK wrapped by Yandex KMS provider.
    def encrypt_prompt(self, partner_id: UUID, prompt_text: str, kms_key_id: str | None) -> tuple[bytes, bytes, bytes, str]:
        try:
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Не установлен пакет cryptography. Установите его и повторите шифрование промпта через AES-256-GCM.",
            ) from exc

        envelope = self.key_provider.generate_data_key(partner_id, kms_key_id)
        nonce = os.urandom(12)
        cipher = AESGCM(envelope.plaintext_key)
        ciphertext = cipher.encrypt(nonce, prompt_text.encode("utf-8"), str(partner_id).encode("utf-8"))
        return ciphertext, nonce, envelope.encrypted_key, envelope.key_id

    def decrypt_prompt(self, partner_id: UUID, ciphertext: bytes, nonce: bytes, encrypted_key: bytes) -> str:
        try:
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Не установлен пакет cryptography. Установите его и повторите дешифровку промпта.",
            ) from exc

        plaintext_key = base64.b64decode(encrypted_key)
        cipher = AESGCM(plaintext_key)
        plaintext = cipher.decrypt(nonce, ciphertext, str(partner_id).encode("utf-8"))
        return plaintext.decode("utf-8")


class StorageSigner(Protocol):
    def presign_put(self, object_key: str, content_type: str, expires_in: int) -> PresignedUrlResponse:
        ...

    def presign_get(self, object_key: str, expires_in: int) -> str:
        ...


class S3PresignedUrlService:
    def __init__(self, bucket_name: str, region_name: str | None = None) -> None:
        self.bucket_name = bucket_name
        self.region_name = region_name

    # S-13: generates presigned S3 URLs with 10-minute TTL for secure direct uploads.
    def presign_put(self, object_key: str, content_type: str, expires_in: int) -> PresignedUrlResponse:
        try:
            import boto3
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Не установлен boto3. Установите boto3 и настройте AWS/S3 совместимое хранилище для presigned URL.",
            ) from exc

        client = boto3.client("s3", region_name=self.region_name)
        url = client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": object_key,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in,
        )
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        return PresignedUrlResponse(
            url=url,
            expires_at=expires_at,
            object_key=object_key,
            required_headers={"Content-Type": content_type},
        )

    def presign_get(self, object_key: str, expires_in: int) -> str:
        try:
            import boto3
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Не установлен boto3. Установите boto3 и настройте клиент S3 для preview URL.",
            ) from exc

        client = boto3.client("s3", region_name=self.region_name)
        return client.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": self.bucket_name, "Key": object_key},
            ExpiresIn=expires_in,
        )


class LocalDevStorageSigner:
    def __init__(self, base_url: str = "/api/v1/partner/dev-storage", storage_root: str | Path | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.storage_root = Path(storage_root or os.getenv("DEV_STORAGE_DIR", DEFAULT_DEV_STORAGE_DIR)).resolve()
        self.storage_root.mkdir(parents=True, exist_ok=True)

    def presign_put(self, object_key: str, content_type: str, expires_in: int) -> PresignedUrlResponse:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        return PresignedUrlResponse(
            url=f"{self.base_url}/upload/{object_key}",
            expires_at=expires_at,
            object_key=object_key,
            required_headers={"Content-Type": content_type},
        )

    def presign_get(self, object_key: str, expires_in: int) -> str:
        return f"{self.base_url}/file/{object_key}"


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._events: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window_seconds: int) -> None:
        now = datetime.now(timezone.utc).timestamp()
        with self._lock:
            history = self._events.setdefault(key, [])
            threshold = now - window_seconds
            history[:] = [item for item in history if item >= threshold]
            if len(history) >= limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Лимит запросов исчерпан. Подождите {window_seconds // 60} мин. и повторите операцию позже.",
                )
            history.append(now)


rate_limiter = InMemoryRateLimiter()
crypto_service = PromptCryptoService(LocalYandexKMSKeyProvider())
storage_signer: StorageSigner | None = None
mascot_talk_service = MascotTalkService()


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def is_production_env() -> bool:
    return os.getenv("APP_ENV", "").strip().lower() in {"prod", "production"}


def is_dev_or_test_env() -> bool:
    return os.getenv("APP_ENV", "").strip().lower() in {"dev", "development", "test", "local"}


def is_dev_auth_enabled() -> bool:
    if is_production_env() or not is_dev_or_test_env():
        return False
    return _env_bool("DEV_AUTH_ENABLED", default=False)


def is_dev_storage_enabled() -> bool:
    if is_production_env() or not is_dev_or_test_env():
        return False
    return _env_bool("DEV_STORAGE_ENABLED", default=False)


def get_dev_auth_secret() -> str:
    secret = (os.getenv("DEV_AUTH_SECRET") or "").strip() or (os.getenv("JWT_SECRET") or "").strip()
    if secret:
        return secret
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Dev-auth secret не настроен. Установите DEV_AUTH_SECRET или JWT_SECRET.",
    )


def _base64url_decode(raw_value: str, *, detail: str) -> bytes:
    try:
        return base64.urlsafe_b64decode(raw_value + "=" * (-len(raw_value) % 4))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail) from exc


def _base64url_encode(raw_value: bytes) -> str:
    return base64.urlsafe_b64encode(raw_value).decode("ascii").rstrip("=")


def _decode_token_payload(payload_token: str) -> dict[str, Any]:
    payload_bytes = _base64url_decode(payload_token, detail="Некорректный payload токена.")
    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный JSON payload токена.") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный формат payload токена.")
    return payload


def encode_dev_auth_token(partner_id: UUID, partner_name: str, issued_at: datetime | None = None) -> tuple[str, datetime]:
    issued = issued_at or datetime.now(timezone.utc)
    expires_at = issued + timedelta(seconds=DEV_AUTH_SESSION_TTL_SECONDS)
    payload = {
        "partner_id": str(partner_id),
        "partner_name": partner_name,
        "iat": int(issued.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_token = _base64url_encode(payload_bytes)
    signature = hmac.new(get_dev_auth_secret().encode("utf-8"), payload_token.encode("utf-8"), hashlib.sha256).digest()
    signature_token = _base64url_encode(signature)
    return f"{payload_token}.{signature_token}", expires_at


def decode_dev_auth_token(token: str) -> DevSession:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Отсутствует dev-auth token.")

    try:
        payload_token, signature_token = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный формат dev-auth token.") from exc

    payload = _decode_token_payload(payload_token)
    token_type = str(payload.get("type") or "")
    if token_type == "partner":
        expected_signature = hmac.new(_get_jwt_secret().encode("utf-8"), payload_token.encode("utf-8"), hashlib.sha256).digest()
    else:
        expected_signature = hmac.new(get_dev_auth_secret().encode("utf-8"), payload_token.encode("utf-8"), hashlib.sha256).digest()
    actual_signature = _base64url_decode(signature_token, detail="Некорректная подпись токена.")
    if not hmac.compare_digest(expected_signature, actual_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Подпись dev-auth token не прошла проверку.")

    try:
        expires_at = int(payload.get("exp", 0))
    except Exception:
        expires_at = 0
    if expires_at <= int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Dev-auth token истёк. Выполните логин повторно.")

    try:
        partner_id = UUID(str(payload["partner_id"]))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный partner_id в токене.") from exc

    return DevSession(
        partner_id=partner_id,
        partner_name=str(payload.get("partner_name") or "Demo Partner"),
        token=token,
    )


# ──────────────────────────────────────────────
# Продакшн JWT для партнёров
# ──────────────────────────────────────────────

def _get_jwt_secret() -> str:
    secret = (os.getenv("JWT_SECRET") or "").strip()
    if secret:
        return secret
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="JWT_SECRET не настроен. Невозможно выпустить partner token.",
    )


def hash_partner_password(password: str) -> str:
    salt = os.urandom(16)
    derived_key = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=PASSWORD_SCRYPT_N,
        r=PASSWORD_SCRYPT_R,
        p=PASSWORD_SCRYPT_P,
        dklen=PASSWORD_SCRYPT_DKLEN,
    )
    return (
        f"scrypt${PASSWORD_SCRYPT_N}${PASSWORD_SCRYPT_R}${PASSWORD_SCRYPT_P}$"
        f"{_base64url_encode(salt)}${_base64url_encode(derived_key)}"
    )


def _is_legacy_sha256_hash(stored_hash: str) -> bool:
    return bool(re.fullmatch(r"[0-9a-f]{64}", stored_hash))


def needs_password_rehash(stored_hash: str) -> bool:
    return _is_legacy_sha256_hash(stored_hash)


def _verify_scrypt_password(password: str, stored_hash: str) -> bool:
    try:
        algo, n_raw, r_raw, p_raw, salt_raw, expected_raw = stored_hash.split("$", 5)
        if algo != "scrypt":
            return False

        salt = _base64url_decode(salt_raw, detail="Некорректная соль password hash.")
        expected = _base64url_decode(expected_raw, detail="Некорректный digest password hash.")
        derived = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=int(n_raw),
            r=int(r_raw),
            p=int(p_raw),
            dklen=len(expected),
        )
    except HTTPException:
        return False
    except Exception:
        return False

    return hmac.compare_digest(derived, expected)


def verify_partner_password(password: str, hashed: str) -> bool:
    if hashed.startswith("scrypt$"):
        return _verify_scrypt_password(password, hashed)
    if _is_legacy_sha256_hash(hashed):
        return hmac.compare_digest(hashlib.sha256(password.encode("utf-8")).hexdigest(), hashed)
    return False


def create_partner_token(partner_id: UUID) -> tuple[str, datetime]:
    """Создаёт производственный JWT-токен для зарегистрированного партнёра."""
    issued = datetime.now(timezone.utc)
    expires_at = issued + timedelta(days=PARTNER_TOKEN_TTL_DAYS)
    payload = {
        "partner_id": str(partner_id),
        "partner_name": "",
        "type": "partner",
        "iat": int(issued.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_token = _base64url_encode(payload_bytes)
    signature = hmac.new(_get_jwt_secret().encode("utf-8"), payload_token.encode("utf-8"), hashlib.sha256).digest()
    sig_token = _base64url_encode(signature)
    return f"{payload_token}.{sig_token}", expires_at


def configure_storage_signer(signer: StorageSigner) -> None:
    global storage_signer
    storage_signer = signer


def get_dev_storage_root() -> Path:
    root = Path(os.getenv("DEV_STORAGE_DIR", DEFAULT_DEV_STORAGE_DIR)).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def resolve_dev_storage_path(object_key: str) -> Path:
    if not object_key or object_key.startswith("/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный object key для dev-storage.")

    root = get_dev_storage_root()
    candidate = (root / object_key).resolve()
    if not str(candidate).startswith(str(root)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Путь dev-storage выходит за пределы разрешённого каталога.")
    candidate.parent.mkdir(parents=True, exist_ok=True)
    return candidate


def require_dev_storage_access(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> DevSession:
    if not is_dev_storage_enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dev-storage отключён для текущего окружения.")
    require_auth = _env_bool("DEV_STORAGE_REQUIRE_AUTH", default=False)
    if not require_auth:
        return DevSession(partner_id=DEFAULT_DEV_PARTNER_ID, partner_name="dev-storage", token="")
    if not is_dev_auth_enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dev-auth отключён для текущего окружения.")
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Отсутствует Authorization header.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header должен использовать Bearer token.")
    return decode_dev_auth_token(token.strip())


def get_partner_dashboard_context(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_partner_id: UUID | None = Header(default=None, alias="X-Partner-Id"),
    db: Session = Depends(get_db),
) -> PartnerDashboardContext:
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header должен использовать Bearer token.")
        session = decode_dev_auth_token(token)

        token_type = None
        try:
            payload_token = token.split(".", 1)[0]
            token_type = str(_decode_token_payload(payload_token).get("type") or "")
        except Exception:
            token_type = None

        if token_type == "partner":
            partner = db.query(Partner).filter_by(id=session.partner_id, is_active=True).first()
            if not partner:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Партнёр не найден или деактивирован.",
                )
        elif not is_dev_auth_enabled():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Dev-auth отключён. Используйте продакшн токен.",
            )

        return PartnerDashboardContext(partner_id=session.partner_id)

    if x_partner_id is not None:
        if _env_bool("PARTNER_HEADER_AUTH_ENABLED", default=False) and not is_production_env():
            return PartnerDashboardContext(partner_id=x_partner_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Авторизация через X-Partner-Id отключена. Используйте Bearer token.",
        )

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется Bearer token.")


def estimate_tokens(value: str) -> int:
    return max(0, (len(value.strip()) + 3) // 4)


def validate_prompt_text(prompt_text: str) -> int:
    token_count = estimate_tokens(prompt_text)
    if token_count > MAX_PROMPT_TOKENS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Промпт слишком длинный: {token_count} токенов при лимите {MAX_PROMPT_TOKENS}. "
                "Сократите инструкцию партнёра и удалите второстепенные блоки."
            ),
        )

    lowered = prompt_text.lower()
    for pattern in FORBIDDEN_PROMPT_PATTERNS:
        if pattern in lowered:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"В промпте найден запрещённый паттерн '{pattern}'. "
                    "Удалите инструкции override/system takeover и повторите сохранение."
                ),
            )
    return token_count


def require_storage_signer() -> StorageSigner:
    if storage_signer is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="S3 signer не настроен. Вызовите configure_storage_signer(...) при старте приложения и повторите запрос.",
        )
    return storage_signer


def rate_limited(bucket: str, limit: int, window_seconds: int) -> Callable[[Callable[P, T]], Callable[P, T]]:
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            ctx = extract_context(func, args, kwargs)
            limiter_key = f"{bucket}:{ctx.partner_id}"
            rate_limiter.hit(limiter_key, limit, window_seconds)
            return func(*args, **kwargs)

        return wrapper

    return decorator


def extract_context(func: Callable[..., Any], args: tuple[Any, ...], kwargs: dict[str, Any]) -> PartnerDashboardContext:
    for value in kwargs.values():
        if isinstance(value, PartnerDashboardContext):
            return value

    bound = inspect.signature(func).bind_partial(*args, **kwargs)
    for value in bound.arguments.values():
        if isinstance(value, PartnerDashboardContext):
            return value

    raise RuntimeError("PartnerDashboardContext не найден в аргументах rate-limited endpoint.")


def write_dashboard_audit_log(db: Session, partner_id: UUID, action: str, payload: dict[str, Any]) -> None:
    db.add(PartnerDashboardAuditLog(partner_id=partner_id, action=action, payload=payload))
    db.add(RPGAuditLog(partner_id=partner_id, action=f"partner_dashboard:{action}", payload=payload))


def sanitize_file_name(file_name: str) -> str:
    safe = file_name.replace("..", "").replace("/", "_").replace("\\", "_")
    if safe != file_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Имя файла содержит недопустимые символы. Уберите ../ и пути каталогов, затем повторите загрузку.",
        )
    return safe


def fetch_partner_prompt_secret(db: Session, partner_id: UUID) -> PartnerPromptSecret | None:
    return db.scalar(
        select(PartnerPromptSecret)
        .where(and_(PartnerPromptSecret.partner_id == partner_id, PartnerPromptSecret.active.is_(True)))
        .order_by(PartnerPromptSecret.version.desc())
        .limit(1)
    )


def read_partner_prompt_text(db: Session, partner_id: UUID) -> tuple[str | None, int | None]:
    prompt_secret = fetch_partner_prompt_secret(db, partner_id)
    if prompt_secret is None:
        return None, None

    try:
        prompt_text = crypto_service.decrypt_prompt(
            partner_id=partner_id,
            ciphertext=prompt_secret.ciphertext,
            nonce=prompt_secret.nonce,
            encrypted_key=prompt_secret.encrypted_data_key,
        )
        return prompt_text, prompt_secret.version
    except Exception:
        return None, prompt_secret.version


def build_partner_mascot_preview(db: Session, partner_id: UUID, signer: StorageSigner | None) -> PartnerMascotPreviewResponse:
    asset = db.scalar(
        select(PartnerMascotAsset)
        .where(and_(PartnerMascotAsset.partner_id == partner_id, PartnerMascotAsset.active.is_(True)))
        .order_by(PartnerMascotAsset.created_at.desc())
        .limit(1)
    )
    prompt = fetch_partner_prompt_secret(db, partner_id)
    preview_url = signer.presign_get(asset.object_key, PRESIGNED_TTL_SECONDS) if asset and signer else None

    return PartnerMascotPreviewResponse(
        asset_id=asset.asset_id if asset else None,
        object_key=asset.object_key if asset else None,
        preview_url=preview_url,
        content_type=asset.content_type if asset else None,
        prompt_version=prompt.version if prompt else None,
        prompt_token_count=prompt.token_count if prompt else None,
        prompt_kms_key_id=prompt.kms_key_id if prompt else None,
    )


def build_partner_mascot_runtime(db: Session, partner_id: UUID, signer: StorageSigner | None) -> PartnerMascotRuntimeResponse:
    asset = db.scalar(
        select(PartnerMascotAsset)
        .where(and_(PartnerMascotAsset.partner_id == partner_id, PartnerMascotAsset.active.is_(True)))
        .order_by(PartnerMascotAsset.created_at.desc())
        .limit(1)
    )

    if asset and signer is not None:
        source_url = signer.presign_get(asset.object_key, PRESIGNED_TTL_SECONDS)
        if asset.content_type.startswith("model/") or asset.content_type == "application/octet-stream":
            return PartnerMascotRuntimeResponse(
                asset_id=asset.asset_id,
                mode="uploaded-model",
                status="ready",
                content_type=asset.content_type,
                source_url=source_url,
                preview_url=source_url,
                available_animations=["idle", "talking", "greeting", "celebration", "warning", "costume"],
                active_costume="default",
            )

        return PartnerMascotRuntimeResponse(
            asset_id=asset.asset_id,
            mode="sprite2d",
            status="ready",
            content_type=asset.content_type,
            preview_url=source_url,
            sprite_url=source_url,
            available_animations=["idle", "talking", "greeting", "celebration", "warning", "costume"],
            active_costume="default",
        )

    return PartnerMascotRuntimeResponse(
        mode="placeholder3d",
        status="demo",
        sprite_url="/mascot-demo.svg",
        available_animations=["idle", "talking", "greeting", "celebration", "warning", "costume"],
        active_costume="default",
    )


def encode_sse_event(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def save_partner_prompt_secret(
    db: Session,
    partner_id: UUID,
    prompt_text: str,
    kms_key_id: str | None,
    audit_action: str,
) -> PartnerPromptSecret:
    normalized_prompt = prompt_text.strip()
    token_count = validate_prompt_text(normalized_prompt)
    current_version = db.scalar(
        select(func.max(PartnerPromptSecret.version)).where(PartnerPromptSecret.partner_id == partner_id)
    ) or 0
    ciphertext, nonce, encrypted_key, key_id = crypto_service.encrypt_prompt(
        partner_id=partner_id,
        prompt_text=normalized_prompt,
        kms_key_id=kms_key_id,
    )

    db.execute(
        PartnerPromptSecret.__table__.update()
        .where(and_(PartnerPromptSecret.partner_id == partner_id, PartnerPromptSecret.active.is_(True)))
        .values(active=False)
    )
    prompt_secret = PartnerPromptSecret(
        partner_id=partner_id,
        ciphertext=ciphertext,
        nonce=nonce,
        encrypted_data_key=encrypted_key,
        kms_key_id=key_id,
        token_count=token_count,
        version=current_version + 1,
        active=True,
    )
    db.add(prompt_secret)
    write_dashboard_audit_log(
        db,
        partner_id=partner_id,
        action=audit_action,
        payload={
            "prompt_version": current_version + 1,
            "token_count": token_count,
            "kms_key_id": key_id,
        },
    )
    return prompt_secret


@router.post("/mascot/upload", response_model=PresignedUrlResponse)
@rate_limited("partner_api", MAX_API_REQUESTS_PER_MINUTE, 60)
@rate_limited("partner_upload", MAX_UPLOADS_PER_HOUR, 3600)
def post_partner_mascot_upload(
    body: PartnerMascotUploadRequest,
    db: Session = Depends(get_db),
    ctx: PartnerDashboardContext = Depends(get_partner_dashboard_context),
) -> PresignedUrlResponse:
    apply_partner_rls(db, ctx.partner_id)
    signer = require_storage_signer()

    content_type = body.content_type.strip().lower()
    if content_type not in ALLOWED_UPLOAD_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"MIME-тип {body.content_type} не разрешён. Загрузите GLB/GLTF или безопасную texture PNG/JPEG/WebP/KTX2."
            ),
        )

    safe_name = sanitize_file_name(body.file_name)
    object_key = f"partners/{ctx.partner_id}/mascot/{uuid4()}-{safe_name}"
    upload_url = signer.presign_put(object_key=object_key, content_type=content_type, expires_in=PRESIGNED_TTL_SECONDS)

    try:
        db.execute(
            PartnerMascotAsset.__table__.update()
            .where(and_(PartnerMascotAsset.partner_id == ctx.partner_id, PartnerMascotAsset.active.is_(True)))
            .values(active=False)
        )
        db.add(
            PartnerMascotAsset(
                partner_id=ctx.partner_id,
                object_key=object_key,
                file_name=safe_name,
                content_type=content_type,
                size_bytes=body.size_bytes,
                upload_url_expires_at=upload_url.expires_at,
                active=True,
            )
        )

        if body.prompt_text:
            save_partner_prompt_secret(
                db=db,
                partner_id=ctx.partner_id,
                prompt_text=body.prompt_text,
                kms_key_id=body.kms_key_id,
                audit_action="prompt_saved_from_upload",
            )

        write_dashboard_audit_log(
            db,
            partner_id=ctx.partner_id,
            action="mascot_upload_requested",
            payload={
                "object_key": object_key,
                "content_type": content_type,
                "size_bytes": body.size_bytes,
                "has_prompt": bool(body.prompt_text),
            },
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return upload_url


@router.post("/auth/register", response_model=PartnerTokenResponse, status_code=201)
def register_partner(body: PartnerRegisterRequest, db: Session = Depends(get_db)) -> PartnerTokenResponse:
    """Регистрация нового партнёра. Возвращает access token."""
    email = body.email.strip().lower()
    existing = db.query(Partner).filter_by(email=email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Партнёр с таким email уже зарегистрирован.",
        )
    partner = Partner(
        name=body.name.strip(),
        email=email,
        hashed_password=hash_partner_password(body.password),
    )
    try:
        db.add(partner)
        db.flush()
        token, expires_at = create_partner_token(partner.id)
        write_dashboard_audit_log(db, partner_id=partner.id, action="partner_registered", payload={"email": email})
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(partner)
    return PartnerTokenResponse(
        access_token=token,
        partner_id=partner.id,
        name=partner.name,
        expires_at=expires_at,
    )


@router.post("/auth/login", response_model=PartnerTokenResponse)
def login_partner(body: PartnerLoginRequest, db: Session = Depends(get_db)) -> PartnerTokenResponse:
    """Вход по email + паролю. Возвращает access token."""
    email = body.email.strip().lower()
    partner = db.query(Partner).filter_by(email=email).first()
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль.",
        )
    if not verify_partner_password(body.password, partner.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль.",
        )
    if not partner.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт партнёра деактивирован.",
        )

    try:
        if needs_password_rehash(partner.hashed_password):
            partner.hashed_password = hash_partner_password(body.password)
            write_dashboard_audit_log(
                db,
                partner_id=partner.id,
                action="partner_password_hash_upgraded",
                payload={"email": email, "from": "sha256", "to": "scrypt"},
            )

        token, expires_at = create_partner_token(partner.id)
        write_dashboard_audit_log(db, partner_id=partner.id, action="partner_login", payload={"email": email})
        db.commit()
    except Exception:
        db.rollback()
        raise

    return PartnerTokenResponse(
        access_token=token,
        partner_id=partner.id,
        name=partner.name,
        expires_at=expires_at,
    )


@router.get("/auth/me", response_model=PartnerMeResponse)
def get_partner_me(
    ctx: PartnerDashboardContext = Depends(get_partner_dashboard_context),
    db: Session = Depends(get_db),
) -> PartnerMeResponse:
    """Информация о текущем авторизованном партнёре."""
    partner = db.query(Partner).filter_by(id=ctx.partner_id).first()
    if not partner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Партнёр не найден.")
    return PartnerMeResponse(
        partner_id=partner.id,
        name=partner.name,
        email=partner.email,
        created_at=partner.created_at,
    )


@router.post("/dev-auth/login", response_model=DevAuthSessionResponse)
def post_dev_auth_login(body: DevAuthLoginRequest | None = None, db: Session = Depends(get_db)) -> DevAuthSessionResponse:
    if not is_dev_auth_enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dev-auth отключён для текущего окружения.")

    payload = body or DevAuthLoginRequest()
    allow_custom_partner = _env_bool("DEV_AUTH_ALLOW_CUSTOM_PARTNER", default=False)
    if payload.partner_id != DEFAULT_DEV_PARTNER_ID and not allow_custom_partner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev-auth разрешён только для default partner. Для custom partner включите DEV_AUTH_ALLOW_CUSTOM_PARTNER=true.",
        )

    partner = db.query(Partner).filter_by(id=payload.partner_id, is_active=True).first()
    if partner is not None:
        partner_name = partner.name
    elif payload.partner_id == DEFAULT_DEV_PARTNER_ID:
        partner_name = payload.partner_name.strip() or "Demo Partner"
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Партнёр для dev-auth не найден или деактивирован.",
        )

    token, expires_at = encode_dev_auth_token(payload.partner_id, partner_name)
    return DevAuthSessionResponse(
        token=token,
        partner_id=payload.partner_id,
        partner_name=partner_name,
        expires_at=expires_at,
    )


@router.put("/dev-storage/upload/{object_key:path}")
async def put_dev_storage_object(
    object_key: str,
    request: Request,
    _: DevSession = Depends(require_dev_storage_access),
) -> Response:
    target_path = resolve_dev_storage_path(object_key)
    payload = await request.body()
    target_path.write_bytes(payload)
    return Response(status_code=status.HTTP_201_CREATED)


@router.get("/dev-storage/file/{object_key:path}")
def get_dev_storage_object(
    object_key: str,
    _: DevSession = Depends(require_dev_storage_access),
) -> FileResponse:
    target_path = resolve_dev_storage_path(object_key)
    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден в dev-storage.")
    return FileResponse(target_path)


@router.get("/dev-auth/session", response_model=DevAuthSessionResponse)
def get_dev_auth_session(authorization: str | None = Header(default=None, alias="Authorization")) -> DevAuthSessionResponse:
    if not is_dev_auth_enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dev-auth отключён для текущего окружения.")
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Отсутствует Authorization header.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header должен использовать Bearer token.")

    session = decode_dev_auth_token(token)
    expires_at = datetime.fromtimestamp(
        datetime.now(timezone.utc).timestamp() + DEV_AUTH_SESSION_TTL_SECONDS,
        tz=timezone.utc,
    )
    return DevAuthSessionResponse(
        token=session.token,
        partner_id=session.partner_id,
        partner_name=session.partner_name,
        expires_at=expires_at,
    )


@router.get("/mascot/preview", response_model=PartnerMascotPreviewResponse)
@rate_limited("partner_api", MAX_API_REQUESTS_PER_MINUTE, 60)
def get_partner_mascot_preview(
    db: Session = Depends(get_db),
    ctx: PartnerDashboardContext = Depends(get_partner_dashboard_context),
) -> PartnerMascotPreviewResponse:
    apply_partner_rls(db, ctx.partner_id)
    signer = require_storage_signer()
    return build_partner_mascot_preview(db, ctx.partner_id, signer)


@router.get("/mascot/runtime", response_model=PartnerMascotRuntimeResponse)
@rate_limited("partner_api", MAX_API_REQUESTS_PER_MINUTE, 60)
def get_partner_mascot_runtime(
    db: Session = Depends(get_db),
    ctx: PartnerDashboardContext = Depends(get_partner_dashboard_context),
) -> PartnerMascotRuntimeResponse:
    apply_partner_rls(db, ctx.partner_id)
    return build_partner_mascot_runtime(db, ctx.partner_id, storage_signer)


@router.post("/mascot/talk")
@rate_limited("partner_api", MAX_API_REQUESTS_PER_MINUTE, 60)
async def post_partner_mascot_talk(
    body: PartnerMascotTalkRequest,
    db: Session = Depends(get_db),
    ctx: PartnerDashboardContext = Depends(get_partner_dashboard_context),
) -> StreamingResponse:
    apply_partner_rls(db, ctx.partner_id)
    runtime = build_partner_mascot_runtime(db, ctx.partner_id, storage_signer)
    progress = db.scalar(select(PartnerRPGProgress).where(PartnerRPGProgress.partner_id == ctx.partner_id))
    partner_prompt_text, partner_prompt_version = read_partner_prompt_text(db, ctx.partner_id)
    stream_plan = mascot_talk_service.build_stream_plan(
        MascotTalkContext(
            partner_id=ctx.partner_id,
            message=body.message,
            current_route=body.current_route,
            history=[MascotTalkHistoryItem(role=item.role, content=item.content) for item in body.history],
            case_context=body.case_context,
            runtime_mode=runtime.mode,
            runtime_status=runtime.status,
            level=progress.current_level if progress is not None else "не определён",
            weighted_score=progress.weighted_score if progress is not None else 0,
            partner_prompt_text=partner_prompt_text,
            partner_prompt_version=partner_prompt_version,
        )
    )

    write_dashboard_audit_log(
        db,
        partner_id=ctx.partner_id,
        action="mascot_talk_requested",
        payload={
            "current_route": body.current_route,
            "message_length": len(body.message),
            "history_items": len(body.history),
            "provider": stream_plan.provider_name,
            "prompt_version": partner_prompt_version,
        },
    )
    db.commit()

    async def event_stream():
        reply_parts: list[str] = []
        yield encode_sse_event({"role": "assistant", "started": True})
        for token in stream_plan.token_stream:
            reply_parts.append(token)
            yield encode_sse_event({"token": token})
            await sleep(0)
        reply_text = "".join(reply_parts).strip()
        yield encode_sse_event(
            {
                "done": True,
                "reply": reply_text,
                "actions": [
                    {
                        "kind": action.kind,
                        "label": action.label,
                        "target": action.target,
                        "description": action.description,
                    }
                    for action in stream_plan.actions
                ],
                "runtime_mode": runtime.mode,
                "provider": stream_plan.provider_name,
                "prompt_version": partner_prompt_version,
            }
        )

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.patch("/prompt", response_model=PartnerMascotPreviewResponse)
@rate_limited("partner_api", MAX_API_REQUESTS_PER_MINUTE, 60)
def patch_partner_prompt(
    body: PartnerPromptPatchRequest,
    db: Session = Depends(get_db),
    ctx: PartnerDashboardContext = Depends(get_partner_dashboard_context),
) -> PartnerMascotPreviewResponse:
    apply_partner_rls(db, ctx.partner_id)
    signer = storage_signer

    try:
        save_partner_prompt_secret(
            db=db,
            partner_id=ctx.partner_id,
            prompt_text=body.prompt_text,
            kms_key_id=body.kms_key_id,
            audit_action="prompt_saved",
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return build_partner_mascot_preview(db, ctx.partner_id, signer)


@router.patch("/rpg/weights", response_model=RPGWeightsResponse)
@rate_limited("partner_api", MAX_API_REQUESTS_PER_MINUTE, 60)
def patch_partner_rpg_weights(
    body: RPGWeightsPatchRequest,
    db: Session = Depends(get_db),
    ctx: PartnerDashboardContext = Depends(get_partner_dashboard_context),
) -> RPGWeightsResponse:
    apply_partner_rls(db, ctx.partner_id)

    try:
        latest_version = db.scalar(select(func.max(RPGConfigWeights.version)).where(RPGConfigWeights.partner_id == ctx.partner_id)) or 0
        next_version = latest_version + 1
        config = RPGConfigWeights(
            partner_id=ctx.partner_id,
            weight_xp=body.weight_xp,
            weight_qi=body.weight_qi,
            weight_sp=body.weight_sp,
            weight_rp=body.weight_rp,
            version=next_version,
        )
        db.add(config)

        progress = db.scalar(
            select(PartnerRPGProgress)
            .where(PartnerRPGProgress.partner_id == ctx.partner_id)
            .with_for_update()
        )
        if progress is not None:
            weights = WeightSet.model_validate(body.model_dump())
            progress.current_level, progress.weighted_score = calculate_partner_level(
                progress.xp,
                progress.qi,
                progress.sp,
                progress.rp,
                weights,
            )
            progress.version += 1

        write_dashboard_audit_log(
            db,
            partner_id=ctx.partner_id,
            action="rpg_weights_updated",
            payload=body.model_dump(),
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return RPGWeightsResponse(partner_id=ctx.partner_id, version=next_version, **body.model_dump())


@router.get("/rpg/analytics", response_model=RPGAnalyticsResponse)
@rate_limited("partner_api", MAX_API_REQUESTS_PER_MINUTE, 60)
def get_partner_rpg_analytics(
    db: Session = Depends(get_db),
    ctx: PartnerDashboardContext = Depends(get_partner_dashboard_context),
) -> RPGAnalyticsResponse:
    apply_partner_rls(db, ctx.partner_id)

    progress = db.scalar(select(PartnerRPGProgress).where(PartnerRPGProgress.partner_id == ctx.partner_id))
    weights = fetch_partner_weights(db, ctx.partner_id)

    event_rows = db.execute(
        select(RPGEvent.event_type, func.count())
        .where(RPGEvent.partner_id == ctx.partner_id)
        .group_by(RPGEvent.event_type)
    ).all()
    event_counts = {row[0]: int(row[1]) for row in event_rows}

    penalties_total = db.scalar(
        select(func.coalesce(func.sum(ReputationLog.delta), 0)).where(ReputationLog.partner_id == ctx.partner_id)
    ) or 0
    complaints_count = db.scalar(
        select(func.count())
        .select_from(ReputationLog)
        .where(and_(ReputationLog.partner_id == ctx.partner_id, ReputationLog.reason_code == "COMPLAINT"))
    ) or 0

    progress_payload = {
        "xp": progress.xp if progress else 0,
        "qi": progress.qi if progress else 0,
        "sp": progress.sp if progress else 0,
        "rp": progress.rp if progress else 0,
        "current_level": progress.current_level if progress else "Стажёр",
        "weighted_score": progress.weighted_score if progress else 0,
        "version": progress.version if progress else 0,
    }

    return RPGAnalyticsResponse(
        partner_id=ctx.partner_id,
        progress=progress_payload,
        weights=RPGWeightsResponse(
            partner_id=ctx.partner_id,
            version=db.scalar(select(func.max(RPGConfigWeights.version)).where(RPGConfigWeights.partner_id == ctx.partner_id)) or 1,
            weight_xp=weights.xp,
            weight_qi=weights.qi,
            weight_sp=weights.sp,
            weight_rp=weights.rp,
        ),
        event_counts=event_counts,
        reputation_penalties_total=int(penalties_total),
        complaints_count=int(complaints_count),
    )


def create_schema() -> None:
    """Создаёт только таблицы в public. Схема app (RLS, политики) — через Alembic."""
    with engine.begin() as conn:
        if str(getattr(conn.dialect, "name", "")).lower() == "sqlite":
            Base.metadata.create_all(bind=engine, tables=Base.metadata.sorted_tables)
            return
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS app"))
    public_tables = [t for t in Base.metadata.sorted_tables if t.schema is None]
    Base.metadata.create_all(bind=engine, tables=public_tables)
