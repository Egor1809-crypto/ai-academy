from __future__ import annotations
import os

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Generator, Protocol
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, Integer, String, UniqueConstraint, create_engine, select, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


class Base(DeclarativeBase):
    pass


class RPGEventType(str, Enum):
    XP_GAIN = "XP_GAIN"
    RP_PENALTY = "RP_PENALTY"
    QI_ADJUST = "QI_ADJUST"
    SP_ADJUST = "SP_ADJUST"


class ReputationReason(str, Enum):
    COMPLAINT = "COMPLAINT"
    DEADLINE_MISSED = "DEADLINE_MISSED"
    REGULATOR = "REGULATOR"


class PartnerRPGProgress(Base):
    __tablename__ = "partner_rpg_progress"
    __table_args__ = (
        UniqueConstraint("partner_id", name="uq_partner_rpg_progress_partner_id"),
    )

    progress_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    partner_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    xp: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    qi: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_level: Mapped[str] = mapped_column(String(32), nullable=False, default="Стажёр")
    weighted_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class RPGEvent(Base):
    __tablename__ = "rpg_events"
    __table_args__ = (
        UniqueConstraint("event_id", name="uq_rpg_events_event_id"),
    )

    event_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    partner_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    points_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    qi_delta: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sp_delta: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rp_delta: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class RPGConfigWeights(Base):
    __tablename__ = "rpg_config_weights"
    __table_args__ = (
        UniqueConstraint("partner_id", "version", name="uq_rpg_config_partner_version"),
    )

    config_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    partner_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    weight_xp: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_qi: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_sp: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_rp: Mapped[int] = mapped_column(Integer, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class ReputationLog(Base):
    __tablename__ = "reputation_log"

    reputation_log_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    partner_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    event_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("rpg_events.event_id"), nullable=False)
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason_code: Mapped[str] = mapped_column(String(32), nullable=False)
    source_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class RPGAuditLog(Base):
    __tablename__ = "rpg_audit_log"

    audit_log_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    partner_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    event_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), nullable=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class EventBusPublisher(Protocol):
    def publish(self, topic: str, payload: dict[str, Any]) -> None:
        ...


class NoopEventBusPublisher:
    def publish(self, topic: str, payload: dict[str, Any]) -> None:
        return None


RPG_LEVELS: list[tuple[str, int]] = [
    ("Стажёр", 0),
    ("Практик", 100),
    ("Эксперт", 250),
    ("Мастер", 450),
    ("Навигатор", 700),
    ("Легенда", 1000),
    ("Чемпион", 1400),
]

REPUTATION_PENALTIES: dict[ReputationReason, int] = {
    ReputationReason.COMPLAINT: -5,
    ReputationReason.DEADLINE_MISSED: -3,
    ReputationReason.REGULATOR: -10,
}


class WeightSet(BaseModel):
    xp: int = Field(alias="weight_xp")
    qi: int = Field(alias="weight_qi")
    sp: int = Field(alias="weight_sp")
    rp: int = Field(alias="weight_rp")

    @model_validator(mode="after")
    def validate_sum(self) -> "WeightSet":
        total = self.xp + self.qi + self.sp + self.rp
        if total != 100:
            raise ValueError("Сумма весов должна быть равна 100%.")
        return self


class RPGEventPayload(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    event_id: UUID
    partner_id: UUID
    event_type: RPGEventType
    points_delta: int = 0
    qi_delta: int = 0
    sp_delta: int = 0
    rp_delta: int = 0
    reason_code: ReputationReason | None = None
    source_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class RPGProgressResponse(BaseModel):
    partner_id: UUID
    xp: int
    qi: int
    sp: int
    rp: int
    current_level: str
    weighted_score: int
    version: int


class RPGEventResponse(BaseModel):
    applied: bool
    duplicate: bool
    progress: RPGProgressResponse


@dataclass(slots=True)
class RPGContext:
    partner_id: UUID


def calculate_partner_level(xp: int, qi: int, sp: int, rp: int, weights: WeightSet) -> tuple[str, int]:
    weighted_score = round(
        (xp * weights.xp / 100)
        + (qi * weights.qi / 100)
        + (sp * weights.sp / 100)
        + (rp * weights.rp / 100)
    )

    current_level = RPG_LEVELS[0][0]
    for level_name, threshold in RPG_LEVELS:
        if weighted_score >= threshold:
            current_level = level_name
        else:
            break

    return current_level, weighted_score


DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://manaya_dev:dev_password_123@db:5432/manaya")


def _engine_options(database_url: str) -> dict:
    opts: dict = {"pool_pre_ping": True}
    if str(database_url or "").strip().lower().startswith("sqlite"):
        opts["execution_options"] = {
            "schema_translate_map": {
                "app": None,
                "public": None,
            }
        }
    return opts


engine = create_engine(DATABASE_URL, **_engine_options(DATABASE_URL))
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
router = APIRouter(prefix="/api/v1/rpg", tags=["rpg"])
event_bus: EventBusPublisher = NoopEventBusPublisher()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_rpg_context(x_partner_id: UUID = Header(alias="X-Partner-Id")) -> RPGContext:
    return RPGContext(partner_id=x_partner_id)


def _session_dialect_name(db: Session) -> str:
    try:
        bind = getattr(db, "bind", None)
        if bind is None:
            bind = db.get_bind()
        return str(getattr(getattr(bind, "dialect", None), "name", "") or "").lower()
    except Exception:
        return ""


def apply_partner_rls(db: Session, partner_id: UUID) -> None:
    dialect = _session_dialect_name(db)
    if dialect and "postgres" not in dialect:
        # SQLite/local e2e cannot execute PostgreSQL set_config; real RLS remains enforced on Postgres.
        return
    db.execute(
        text("select set_config('app.current_partner_id', :partner_id, true)"),
        {"partner_id": str(partner_id)},
    )


def fetch_partner_weights(db: Session, partner_id: UUID) -> WeightSet:
    stmt = (
        select(RPGConfigWeights)
        .where(RPGConfigWeights.partner_id == partner_id)
        .order_by(RPGConfigWeights.version.desc())
        .limit(1)
    )
    config = db.scalar(stmt)
    if config is None:
        return WeightSet(weight_xp=25, weight_qi=25, weight_sp=25, weight_rp=25)
    return WeightSet.model_validate(config, from_attributes=True)


def serialize_progress(progress: PartnerRPGProgress) -> RPGProgressResponse:
    return RPGProgressResponse(
        partner_id=progress.partner_id,
        xp=progress.xp,
        qi=progress.qi,
        sp=progress.sp,
        rp=progress.rp,
        current_level=progress.current_level,
        weighted_score=progress.weighted_score,
        version=progress.version,
    )


def write_audit_log(db: Session, partner_id: UUID, action: str, payload: dict[str, Any], event_id: UUID | None = None) -> None:
    db.add(
        RPGAuditLog(
            partner_id=partner_id,
            event_id=event_id,
            action=action,
            payload=payload,
        )
    )


@router.post("/event", response_model=RPGEventResponse, status_code=status.HTTP_200_OK)
def post_rpg_event(
    body: RPGEventPayload,
    db: Session = Depends(get_db),
    ctx: RPGContext = Depends(get_rpg_context),
) -> RPGEventResponse:
    if body.partner_id != ctx.partner_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="partner_id в payload не совпадает с контекстом RLS.")

    apply_partner_rls(db, ctx.partner_id)
    weights = fetch_partner_weights(db, ctx.partner_id)

    try:
        existing = db.get(RPGEvent, body.event_id)
        if existing is not None:
            progress_stmt = (
                select(PartnerRPGProgress)
                .where(PartnerRPGProgress.partner_id == ctx.partner_id)
                .with_for_update()
            )
            progress = db.scalar(progress_stmt)
            if progress is None:
                progress = PartnerRPGProgress(partner_id=ctx.partner_id)
                current_level, weighted_score = calculate_partner_level(0, 0, 0, 0, weights)
                progress.current_level = current_level
                progress.weighted_score = weighted_score
                db.add(progress)

            write_audit_log(
                db,
                partner_id=ctx.partner_id,
                event_id=body.event_id,
                action="rpg_event_duplicate",
                payload=body.model_dump(mode="json"),
            )
            db.commit()
            return RPGEventResponse(applied=False, duplicate=True, progress=serialize_progress(progress))

        event = RPGEvent(
            event_id=body.event_id,
            partner_id=body.partner_id,
            event_type=body.event_type,
            points_delta=body.points_delta,
            qi_delta=body.qi_delta,
            sp_delta=body.sp_delta,
            rp_delta=body.rp_delta,
            payload=body.payload,
        )
        db.add(event)

        progress_stmt = (
            select(PartnerRPGProgress)
            .where(PartnerRPGProgress.partner_id == ctx.partner_id)
            .with_for_update()
        )
        progress = db.scalar(progress_stmt)
        if progress is None:
            progress = PartnerRPGProgress(partner_id=ctx.partner_id)
            db.add(progress)
            db.flush()

        progress.xp += body.points_delta
        progress.qi += body.qi_delta
        progress.sp += body.sp_delta

        if body.reason_code is not None:
            penalty = REPUTATION_PENALTIES[body.reason_code]
            progress.rp += penalty
            db.add(
                ReputationLog(
                    partner_id=ctx.partner_id,
                    event_id=body.event_id,
                    delta=penalty,
                    reason_code=body.reason_code,
                    source_id=body.source_id,
                )
            )
        else:
            progress.rp += body.rp_delta

        progress.version += 1
        progress.current_level, progress.weighted_score = calculate_partner_level(
            progress.xp,
            progress.qi,
            progress.sp,
            progress.rp,
            weights,
        )

        audit_payload = {
            "event": body.model_dump(mode="json"),
            "progress_version": progress.version,
            "weighted_score": progress.weighted_score,
        }
        write_audit_log(db, partner_id=ctx.partner_id, event_id=body.event_id, action="rpg_event_applied", payload=audit_payload)
        db.commit()

        event_bus.publish(
            topic="partner.rpg.events",
            payload={
                "partner_id": str(ctx.partner_id),
                "event_id": str(body.event_id),
                "event_type": body.event_type,
            },
        )
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Событие уже обработано или нарушает ограничение уникальности.") from exc

    progress = db.scalar(select(PartnerRPGProgress).where(PartnerRPGProgress.partner_id == ctx.partner_id))
    if progress is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Прогресс партнёра не найден после обработки события.")

    return RPGEventResponse(applied=True, duplicate=False, progress=serialize_progress(progress))


@router.get("/progress", response_model=RPGProgressResponse)
def get_rpg_progress(
    partner_id: UUID = Query(...),
    db: Session = Depends(get_db),
    ctx: RPGContext = Depends(get_rpg_context),
) -> RPGProgressResponse:
    if partner_id != ctx.partner_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Можно запрашивать только прогресс текущего партнёра.")

    apply_partner_rls(db, ctx.partner_id)
    progress = db.scalar(select(PartnerRPGProgress).where(PartnerRPGProgress.partner_id == partner_id))
    if progress is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Прогресс партнёра ещё не инициализирован.")
    return serialize_progress(progress)


@router.post("/add-xp")
def forbid_direct_add_xp(_: dict[str, Any] | None = None) -> None:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Прямое начисление XP запрещено. Используйте только серверные RPG-события через /api/v1/rpg/event.",
    )


def create_schema() -> None:
    """Только public-таблицы; схема app и RLS — через Alembic (см. partner_dashboard.create_schema)."""
    with engine.begin() as conn:
        if str(getattr(conn.dialect, "name", "")).lower() == "sqlite":
            Base.metadata.create_all(bind=engine, tables=Base.metadata.sorted_tables)
            return
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS app"))
    public_tables = [t for t in Base.metadata.sorted_tables if t.schema is None]
    Base.metadata.create_all(bind=engine, tables=public_tables)
