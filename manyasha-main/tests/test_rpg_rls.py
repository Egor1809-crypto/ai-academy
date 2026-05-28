from __future__ import annotations

from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from rpg_engine import apply_partner_rls


def test_apply_partner_rls_skips_sqlite_sessions() -> None:
    engine = create_engine("sqlite:///:memory:")
    session_factory = sessionmaker(bind=engine)

    with session_factory() as db:
        apply_partner_rls(db, uuid4())


def test_apply_partner_rls_keeps_postgres_set_config() -> None:
    class _Dialect:
        name = "postgresql"

    class _Bind:
        dialect = _Dialect()

    class _Session:
        bind = _Bind()

        def __init__(self) -> None:
            self.calls: list[tuple[object, dict[str, str]]] = []

        def execute(self, statement: object, params: dict[str, str]) -> None:
            self.calls.append((statement, params))

    db = _Session()
    partner_id = uuid4()

    apply_partner_rls(db, partner_id)  # type: ignore[arg-type]

    assert len(db.calls) == 1
    statement, params = db.calls[0]
    assert "set_config('app.current_partner_id'" in str(statement)
    assert params == {"partner_id": str(partner_id)}
