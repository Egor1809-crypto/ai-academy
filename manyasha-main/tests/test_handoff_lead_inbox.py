from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app as api_app
from rpg_engine import Base


TEST_PARTNER_ID = UUID("11111111-1111-4111-8111-aaaaaaaaaaaa")


def _make_client_with_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    public_tables = [table for table in Base.metadata.sorted_tables if table.schema is None]
    Base.metadata.create_all(bind=engine, tables=public_tables)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def _override_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    def _override_partner_context():
        return api_app.PartnerDashboardContext(partner_id=TEST_PARTNER_ID)

    api_app._chat_limiter._events.clear()  # noqa: SLF001
    api_app.app.dependency_overrides[api_app.get_db] = _override_db
    api_app.app.dependency_overrides[api_app.get_partner_dashboard_context] = _override_partner_context
    return TestClient(api_app.app), session_factory


def _cleanup_overrides() -> None:
    api_app.app.dependency_overrides.pop(api_app.get_db, None)
    api_app.app.dependency_overrides.pop(api_app.get_partner_dashboard_context, None)


def _add_handoff_ticket(
    db,
    *,
    ticket_id,
    created_at,
    partner_id=TEST_PARTNER_ID,
    session_id="lead-inbox-ticket",
    status="queued",
    risk_level="medium",
    priority="normal",
    reason=None,
    handoff_context=None,
):
    db.add(
        api_app.WidgetHandoffTicket(
            ticket_id=ticket_id,
            session_id=session_id,
            partner_id=partner_id,
            status=status,
            priority=priority,
            risk_level=risk_level,
            category="general",
            requested_channel="web_chat",
            target_channel="phone",
            reason=reason if reason is not None else f"Заявка {session_id}",
            handoff_context=handoff_context if handoff_context is not None else {"diagnostics": {"risk_level": risk_level}},
            transcript_tail=[],
            created_at=created_at,
            updated_at=created_at,
        )
    )


def test_handoff_tickets_endpoint_is_partner_scoped_and_sanitizes_diagnostics() -> None:
    client, session_factory = _make_client_with_db()
    other_partner_id = uuid4()
    now = datetime.now(timezone.utc)

    with session_factory() as db:
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=uuid4(),
                session_id="lead-inbox-visible",
                partner_id=TEST_PARTNER_ID,
                status="queued",
                priority="high",
                risk_level="high",
                category="enforcement",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Клиент просит консультацию после диагностики",
                handoff_context={
                    "source": "manual_handoff",
                    "install_token": "must-not-leak",
                    "operator_note": "Перезвонить после 15:00.",
                    "contact": {
                        "name": "Иван Петров",
                        "phone": "+7 999 000-11-22",
                        "email": "ivan@example.test",
                    },
                    "diagnostics": {
                        "debt_amount": "2 000 000 рублей",
                        "debt_amount_value": 2_000_000,
                        "debt_types": ["кредиты/карты"],
                        "bailiffs": "есть списания",
                        "income": "официальный доход",
                        "property": ["квартира", "ипотека/залог"],
                        "collectors": "звонят коллекторы",
                        "route_hint": "court_or_check",
                        "risk_level": "high",
                        "risk_reasons": ["крупная сумма долга", "приставы списывают деньги"],
                        "missing_fields": ["тип долгов", "имущество или жильё"],
                        "known_count": 5,
                        "updated_at": 1777293069739,
                        "localStorage": {"secret": "must-not-leak"},
                    },
                },
                transcript_tail=[{"role": "user", "content": "raw chat must not be listed"}],
                created_at=now,
                updated_at=now,
            )
        )
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=uuid4(),
                session_id="lead-inbox-hidden",
                partner_id=other_partner_id,
                status="queued",
                priority="urgent",
                risk_level="critical",
                category="other_partner",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Чужая заявка",
                handoff_context={"diagnostics": {"debt_amount": "9 000 000 рублей"}},
                transcript_tail=[],
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    try:
        response = client.get("/api/handoff/tickets")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    item = payload[0]
    assert item["partner_id"] == str(TEST_PARTNER_ID)
    assert item["status"] == "new"
    assert item["risk_level"] == "high"
    assert item["channel"] == "phone"
    assert item["operator_note"] == "Перезвонить после 15:00."
    assert item["contact"] == {
        "name": "Иван Петров",
        "phone": "+7 999 000-11-22",
        "email": "ivan@example.test",
    }
    assert "handoff_context" not in item
    assert "transcript_tail" not in item

    diagnostics = item["diagnostic_summary"]
    assert diagnostics["debt_amount"] == "2 000 000 рублей"
    assert diagnostics["bailiffs"] == "есть списания"
    assert diagnostics["property"] == ["квартира", "ипотека/залог"]
    assert diagnostics["risk_level"] == "high"
    assert diagnostics["known_count"] == 5
    assert "debt_amount_value" not in diagnostics
    assert "updated_at" not in diagnostics
    assert "localStorage" not in diagnostics
    serialized = response.text
    assert "must-not-leak" not in serialized
    assert "raw chat must not be listed" not in serialized


def test_handoff_tickets_endpoint_handles_old_tickets_without_diagnostics() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)

    with session_factory() as db:
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=uuid4(),
                session_id="lead-inbox-old",
                partner_id=TEST_PARTNER_ID,
                status="queued",
                priority="normal",
                risk_level="medium",
                category="general",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Старая заявка без диагностики",
                handoff_context={},
                transcript_tail=[],
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    try:
        response = client.get("/api/handoff/tickets")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["status"] == "new"
    assert payload[0]["diagnostic_summary"] == {}
    assert payload[0]["operator_note"] == ""
    assert payload[0]["contact"] == {}
    assert payload[0]["lead_reason"] == "Старая заявка без диагностики"
    assert payload[0]["report_email_sent"] is False
    assert payload[0]["report_email_sent_at"] is None
    assert payload[0]["report_email_status"] == ""
    assert payload[0]["report_email_masked"] == ""
    assert payload[0]["quality_label"] == "low"
    assert payload[0]["next_best_action"] == "request_documents"


def test_handoff_tickets_endpoint_exposes_masked_report_email_summary_only() -> None:
    client, session_factory = _make_client_with_db()
    other_partner_id = uuid4()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=ticket_id,
            session_id="lead-report-email-own",
            status="queued",
            risk_level="high",
            priority="high",
            reason="Клиент получил предварительный итог и ждёт звонка",
            handoff_context={
                "contact": {"name": "Анна", "email": "anna@example.test"},
                "diagnostics": {
                    "risk_level": "high",
                    "risk_reasons": ["крупная сумма долга"],
                    "known_count": 4,
                },
            },
            created_at=now,
        )
        db.add(
            api_app.ClientReportEmailSend(
                id=uuid4(),
                partner_id=str(TEST_PARTNER_ID),
                session_id="lead-report-email-own",
                email_hash=api_app._hash_pii("client@example.test"),  # noqa: SLF001
                email_masked="c***t@example.test",
                status="sent",
                report_checksum="secret-checksum-must-not-leak",
                report_length=420,
                diagnostic_summary={"risk_level": "high", "raw_report_text": "must-not-leak"},
                created_at=now + timedelta(minutes=2),
            )
        )
        db.add(
            api_app.ClientReportEmailSend(
                id=uuid4(),
                partner_id=str(other_partner_id),
                session_id="lead-report-email-own",
                email_hash=api_app._hash_pii("other@example.test"),  # noqa: SLF001
                email_masked="o***r@example.test",
                status="sent",
                report_checksum="other-secret",
                report_length=900,
                diagnostic_summary={"risk_level": "critical"},
                created_at=now + timedelta(minutes=3),
            )
        )
        db.commit()

    try:
        response = client.get("/api/handoff/tickets")
        search_response = client.get("/api/handoff/tickets?q=c***t@example.test")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    item = payload[0]
    assert item["ticket_id"] == str(ticket_id)
    assert item["report_email_sent"] is True
    assert item["report_email_sent_at"]
    assert item["report_email_status"] == "sent"
    assert item["report_email_masked"] == "c***t@example.test"
    assert "report_text" not in item
    serialized = response.text
    assert "client@example.test" not in serialized
    assert "secret-checksum-must-not-leak" not in serialized
    assert "must-not-leak" not in serialized
    assert "o***r@example.test" not in serialized
    assert "other-secret" not in serialized

    assert search_response.status_code == 200
    assert [row["ticket_id"] for row in search_response.json()] == [str(ticket_id)]


def test_handoff_ticket_detail_endpoint_is_partner_scoped_and_sanitized() -> None:
    client, session_factory = _make_client_with_db()
    other_partner_id = uuid4()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()
    other_ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=ticket_id,
            session_id="lead-detail-own",
            status="contacted",
            risk_level="high",
            priority="high",
            reason="Клиент ждёт звонка после отчёта",
            handoff_context={
                "operator_note": "Проверить ФССП.",
                "install_token": "must-not-leak",
                "contact": {
                    "name": "Анна",
                    "phone": "+7 900 111-22-33",
                    "email": "anna@example.test",
                },
                "diagnostics": {
                    "debt_amount": "2 000 000 рублей",
                    "bailiffs": "есть списания",
                    "risk_level": "high",
                    "risk_reasons": ["крупная сумма долга", "приставы"],
                    "missing_fields": ["имущество"],
                    "known_count": 4,
                    "localStorage": {"secret": "must-not-leak"},
                },
            },
            created_at=now,
        )
        db.add(
            api_app.ClientReportEmailSend(
                id=uuid4(),
                partner_id=str(TEST_PARTNER_ID),
                session_id="lead-detail-own",
                email_hash=api_app._hash_pii("client@example.test"),  # noqa: SLF001
                email_masked="c***t@example.test",
                status="sent",
                report_checksum="report-checksum-must-not-leak",
                report_length=300,
                diagnostic_summary={"raw_report_text": "must-not-leak"},
                created_at=now + timedelta(minutes=3),
            )
        )
        _add_handoff_ticket(
            db,
            ticket_id=other_ticket_id,
            partner_id=other_partner_id,
            session_id="lead-detail-other",
            status="queued",
            risk_level="critical",
            reason="Чужая заявка",
            handoff_context={"diagnostics": {"debt_amount": "9 000 000 рублей"}},
            created_at=now,
        )
        db.flush()
        stored = db.get(api_app.WidgetHandoffTicket, ticket_id)
        assert stored is not None
        stored.assigned_at = now + timedelta(minutes=1)
        stored.updated_at = now + timedelta(minutes=2)
        db.commit()

    try:
        response = client.get(f"/api/handoff/tickets/{ticket_id}")
        other_response = client.get(f"/api/handoff/tickets/{other_ticket_id}")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    item = response.json()
    assert item["ticket_id"] == str(ticket_id)
    assert item["status"] == "contacted"
    assert item["operator_note"] == "Проверить ФССП."
    assert item["contact"]["phone"] == "+7 900 111-22-33"
    assert item["diagnostic_summary"]["debt_amount"] == "2 000 000 рублей"
    assert item["diagnostic_summary"]["missing_fields"] == ["имущество"]
    assert item["report_email_sent"] is True
    assert item["report_email_masked"] == "c***t@example.test"
    assert any(event["kind"] == "created" for event in item["timeline"])
    assert any(event["kind"] == "report_email" for event in item["timeline"])
    assert any(event["kind"] == "contacted" for event in item["timeline"])
    summary = item["internal_case_summary"]
    assert summary["generated_at"]
    assert "Предварительная внутренняя сводка" in summary["text"]
    assert "Контакт" in summary["text"]
    assert "Анна" in summary["text"]
    assert "Готовность" in summary["text"] or "готовность" in summary["text"]
    assert "2 000 000 рублей" in summary["text"]
    assert "Проверить ФССП." in summary["text"]
    assert "не юридическое заключение" in summary["text"]
    assert any("Документы" in section for section in summary["sections"])
    serialized = response.text
    assert "handoff_context" not in item
    assert "transcript_tail" not in item
    assert "client@example.test" not in serialized
    assert "report-checksum-must-not-leak" not in serialized
    assert "must-not-leak" not in serialized
    assert "raw_report_text" not in serialized
    assert other_response.status_code == 404


def test_handoff_ticket_detail_endpoint_handles_old_ticket_without_diagnostics() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=ticket_id,
            session_id="lead-detail-old",
            status="queued",
            risk_level="medium",
            reason="Старая заявка без диагностики",
            handoff_context={},
            created_at=now,
        )
        db.commit()

    try:
        response = client.get(f"/api/handoff/tickets/{ticket_id}")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    item = response.json()
    assert item["status"] == "new"
    assert item["diagnostic_summary"] == {}
    assert item["operator_note"] == ""
    assert item["report_email_sent"] is False
    assert item["timeline"][0]["kind"] == "created"
    assert item["quality_score"] >= 0
    assert item["quality_label"] == "low"
    assert item["quality_reasons"]
    assert item["next_best_action"] == "request_documents"
    assert item["internal_case_summary"]["text"]
    assert "Пока вводных немного" not in item["internal_case_summary"]["text"]
    assert "не юридическое заключение" in item["internal_case_summary"]["text"]
    doc_keys = {doc["key"] for doc in item["document_checklist"]}
    assert {"passport", "snils_inn"}.issubset(doc_keys)


def test_handoff_ticket_quality_score_prioritizes_high_risk_contacted_lead() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=ticket_id,
            session_id="lead-quality-high",
            status="queued",
            risk_level="high",
            priority="high",
            reason="Крупный долг и приставы",
            handoff_context={
                "contact": {"name": "Анна", "phone": "+7 900 111-22-33"},
                "diagnostics": {
                    "debt_amount": "2 000 000 рублей",
                    "bailiffs": "приставы списывают",
                    "income": "официальный доход",
                    "risk_level": "high",
                    "risk_reasons": ["крупная сумма долга", "приставы"],
                    "known_count": 5,
                },
            },
            created_at=now,
        )
        db.add(
            api_app.ClientReportEmailSend(
                id=uuid4(),
                partner_id=str(TEST_PARTNER_ID),
                session_id="lead-quality-high",
                email_hash=api_app._hash_pii("client@example.test"),  # noqa: SLF001
                email_masked="c***t@example.test",
                status="sent",
                report_checksum="quality-checksum",
                report_length=300,
                diagnostic_summary={"risk_level": "high"},
                created_at=now + timedelta(minutes=1),
            )
        )
        db.commit()

    try:
        response = client.get(f"/api/handoff/tickets/{ticket_id}")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["quality_score"] >= 78
    assert payload["quality_label"] == "urgent"
    assert payload["next_best_action"] == "call_client"
    assert "позвонить" in payload["next_best_action_reason"].lower() or "звон" in payload["next_best_action_reason"].lower()
    assert any("долг" in reason.lower() for reason in payload["quality_reasons"])
    assert any("пристав" in reason.lower() for reason in payload["quality_reasons"])


def test_handoff_ticket_quality_score_uses_missing_fields_for_next_action() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=ticket_id,
            session_id="lead-quality-missing",
            status="queued",
            risk_level="medium",
            priority="normal",
            reason="Нужно уточнить вводные",
            handoff_context={
                "contact": {"email": "client@example.test"},
                "diagnostics": {
                    "debt_amount": "650 000 рублей",
                    "risk_level": "medium",
                    "known_count": 2,
                    "missing_fields": ["доход", "имущество"],
                },
            },
            created_at=now,
        )
        db.commit()

    try:
        response = client.get(f"/api/handoff/tickets/{ticket_id}")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["quality_label"] in {"medium", "high"}
    assert payload["next_best_action"] == "clarify_income"
    assert "доход" in payload["next_best_action_reason"].lower()
    assert any("недоста" in reason.lower() for reason in payload["quality_reasons"])


def test_handoff_ticket_detail_builds_documents_from_diagnostics() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=ticket_id,
            session_id="lead-documents-rich",
            status="queued",
            risk_level="high",
            priority="high",
            reason="Нужно запросить документы",
            handoff_context={
                "diagnostics": {
                    "debt_amount": "2 000 000 рублей",
                    "debt_types": ["кредит", "МФО"],
                    "bailiffs": "приставы списывают",
                    "income": "официальный доход",
                    "property": ["квартира", "ипотека/залог", "авто"],
                    "collectors": "звонят коллекторы",
                    "route_hint": "mfc_check",
                    "risk_level": "high",
                    "missing_fields": ["доход"],
                    "known_count": 6,
                    "raw_chatHistory": "must-not-leak",
                },
            },
            created_at=now,
        )
        db.commit()

    try:
        response = client.get(f"/api/handoff/tickets/{ticket_id}")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    payload = response.json()
    documents = payload["document_checklist"]
    doc_keys = {doc["key"] for doc in documents}
    assert {
        "passport",
        "snils_inn",
        "credit_agreements",
        "debt_statements",
        "fssp_proceedings",
        "bailiff_orders",
        "income_certificate",
        "bank_statements",
        "egrn_extract",
        "mortgage_documents",
        "vehicle_documents",
        "collector_messages",
    }.issubset(doc_keys)
    assert all(doc["priority"] in {"required", "recommended", "optional"} for doc in documents)
    assert all(doc["title"] and doc["reason"] and doc["source"] for doc in documents)
    serialized = response.text
    assert "raw_chatHistory" not in serialized
    assert "must-not-leak" not in serialized
    follow_up = payload["follow_up_message"]
    assert follow_up["tone"] == "calm/professional"
    assert "Сведения ФССП" in follow_up["text"]
    assert "Справка о доходах" in follow_up["text"]
    assert "предварительная проверка" in follow_up["text"]
    assert "не гарантия списания долгов" in follow_up["text"]
    assert "must-not-leak" not in follow_up["text"]
    assert "raw_chatHistory" not in follow_up["text"]


def test_handoff_ticket_detail_documents_minimal_without_diagnostics() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=ticket_id,
            session_id="lead-documents-minimal",
            status="queued",
            risk_level="low",
            priority="low",
            handoff_context={},
            created_at=now,
        )
        db.commit()

    try:
        response = client.get(f"/api/handoff/tickets/{ticket_id}")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    documents = response.json()["document_checklist"]
    doc_keys = {doc["key"] for doc in documents}
    assert doc_keys == {"passport", "snils_inn"}
    follow_up = response.json()["follow_up_message"]
    assert "Пока вводных немного" in follow_up["text"]
    assert "Паспорт клиента" in follow_up["text"]
    assert "не юридическое заключение" in follow_up["text"]


def test_handoff_ticket_follow_up_message_uses_missing_fields_and_no_internal_note() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=ticket_id,
            session_id="lead-follow-up-missing",
            status="queued",
            risk_level="medium",
            priority="normal",
            reason="Нужно уточнить вводные",
            handoff_context={
                "operator_note": "Внутренняя заметка не должна попасть клиенту",
                "diagnostics": {
                    "debt_amount": "650 000 рублей",
                    "risk_level": "medium",
                    "missing_fields": ["доход", "имущество"],
                    "known_count": 2,
                },
            },
            created_at=now,
        )
        db.commit()

    try:
        response = client.get(f"/api/handoff/tickets/{ticket_id}")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    follow_up = response.json()["follow_up_message"]
    text = follow_up["text"]
    assert "650 000 рублей" in text
    assert "доход" in text
    assert "имущество" in text
    assert "Внутренняя заметка" not in text
    assert "не гарантия" in text
    assert "не отправлять автоматически" in follow_up["warnings"]


def test_handoff_tickets_endpoint_filters_and_sorts_by_priority() -> None:
    client, session_factory = _make_client_with_db()
    other_partner_id = uuid4()
    now = datetime.now(timezone.utc)
    new_low_id = uuid4()
    new_high_id = uuid4()
    contacted_critical_id = uuid4()
    closed_high_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=new_low_id,
            session_id="new-low-newer",
            status="queued",
            risk_level="low",
            created_at=now + timedelta(minutes=4),
        )
        _add_handoff_ticket(
            db,
            ticket_id=new_high_id,
            session_id="new-high-older",
            status="queued",
            risk_level="high",
            created_at=now + timedelta(minutes=1),
        )
        _add_handoff_ticket(
            db,
            ticket_id=contacted_critical_id,
            session_id="contacted-critical",
            status="contacted",
            risk_level="critical",
            created_at=now + timedelta(minutes=3),
        )
        _add_handoff_ticket(
            db,
            ticket_id=closed_high_id,
            session_id="closed-high",
            status="closed",
            risk_level="high",
            created_at=now + timedelta(minutes=2),
        )
        _add_handoff_ticket(
            db,
            ticket_id=uuid4(),
            partner_id=other_partner_id,
            session_id="other-partner-high",
            status="queued",
            risk_level="high",
            created_at=now + timedelta(minutes=5),
        )
        db.commit()

    try:
        all_response = client.get("/api/handoff/tickets")
        new_response = client.get("/api/handoff/tickets?status=new")
        high_response = client.get("/api/handoff/tickets?risk_level=high")
    finally:
        client.close()
        _cleanup_overrides()

    assert all_response.status_code == 200
    assert [item["ticket_id"] for item in all_response.json()] == [
        str(new_high_id),
        str(new_low_id),
        str(contacted_critical_id),
        str(closed_high_id),
    ]

    assert new_response.status_code == 200
    assert [item["ticket_id"] for item in new_response.json()] == [str(new_high_id), str(new_low_id)]

    assert high_response.status_code == 200
    assert [item["ticket_id"] for item in high_response.json()] == [
        str(new_high_id),
        str(contacted_critical_id),
        str(closed_high_id),
    ]


def test_handoff_tickets_endpoint_rejects_invalid_filters() -> None:
    client, _session_factory = _make_client_with_db()

    try:
        status_response = client.get("/api/handoff/tickets?status=lost")
        risk_response = client.get("/api/handoff/tickets?risk_level=extreme")
    finally:
        client.close()
        _cleanup_overrides()

    assert status_response.status_code == 400
    assert risk_response.status_code == 400


def test_handoff_tickets_endpoint_searches_allowed_fields_and_keeps_partner_scope() -> None:
    client, session_factory = _make_client_with_db()
    other_partner_id = uuid4()
    now = datetime.now(timezone.utc)
    own_ticket_id = uuid4()
    other_ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=own_ticket_id,
            session_id="search-own",
            status="queued",
            risk_level="high",
            priority="high",
            reason="Клиент просит перезвонить по приставам",
            handoff_context={
                "contact": {
                    "name": "Мария Иванова",
                    "phone": "+7 900 111-22-33",
                    "email": "maria@example.test",
                },
                "diagnostics": {
                    "risk_level": "high",
                    "risk_reasons": ["приставы списывают деньги"],
                    "missing_fields": ["имущество"],
                },
                "install_token": "must-not-leak",
            },
            created_at=now,
        )
        _add_handoff_ticket(
            db,
            ticket_id=other_ticket_id,
            partner_id=other_partner_id,
            session_id="search-other",
            status="queued",
            risk_level="high",
            reason="Чужая заявка Мария",
            handoff_context={
                "contact": {
                    "name": "Мария Чужая",
                    "phone": "+7 900 111-22-33",
                    "email": "other@example.test",
                },
                "diagnostics": {"risk_level": "high"},
            },
            created_at=now + timedelta(minutes=1),
        )
        _add_handoff_ticket(
            db,
            ticket_id=uuid4(),
            session_id="search-no-match",
            status="queued",
            risk_level="low",
            handoff_context={
                "contact": {
                    "name": "Пётр",
                    "phone": "+7 901 000-00-00",
                    "email": "petr@example.test",
                },
                "diagnostics": {"risk_level": "low"},
            },
            created_at=now + timedelta(minutes=2),
        )
        db.commit()

    try:
        name_response = client.get("/api/handoff/tickets?q=Мария")
        phone_response = client.get("/api/handoff/tickets?q=79001112233")
        reason_response = client.get("/api/handoff/tickets?q=приставы")
        id_response = client.get(f"/api/handoff/tickets?q={str(own_ticket_id)[:8]}")
    finally:
        client.close()
        _cleanup_overrides()

    for response in [name_response, phone_response, reason_response, id_response]:
        assert response.status_code == 200
        payload = response.json()
        assert [item["ticket_id"] for item in payload] == [str(own_ticket_id)]
        assert payload[0]["contact"]["phone"] == "+7 900 111-22-33"
        assert "must-not-leak" not in response.text


def test_handoff_tickets_endpoint_search_empty_state_returns_empty_list() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=uuid4(),
            session_id="search-empty",
            status="queued",
            risk_level="low",
            created_at=now,
        )
        db.commit()

    try:
        response = client.get("/api/handoff/tickets?q=nonexistent-email@example.test")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    assert response.json() == []


def test_handoff_ticket_status_update_changes_own_ticket() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=ticket_id,
                session_id="lead-status-own",
                partner_id=TEST_PARTNER_ID,
                status="queued",
                priority="normal",
                risk_level="medium",
                category="general",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Нужно обновить статус",
                handoff_context={"diagnostics": {"risk_level": "medium", "known_count": 2}},
                transcript_tail=[],
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    try:
        response = client.patch(f"/api/handoff/tickets/{ticket_id}/status", json={"status": "contacted"})
        with session_factory() as db:
            stored = db.get(api_app.WidgetHandoffTicket, ticket_id)
            stored_status = stored.status if stored else ""
            assigned_at = stored.assigned_at if stored else None
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["ticket_id"] == str(ticket_id)
    assert payload["status"] == "contacted"
    assert payload["diagnostic_summary"]["known_count"] == 2
    assert stored_status == "contacted"
    assert assigned_at is not None


def test_handoff_ticket_status_update_is_partner_scoped() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    other_ticket_id = uuid4()

    with session_factory() as db:
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=other_ticket_id,
                session_id="lead-status-other",
                partner_id=uuid4(),
                status="queued",
                priority="urgent",
                risk_level="high",
                category="other_partner",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Чужая заявка",
                handoff_context={"diagnostics": {"risk_level": "high"}},
                transcript_tail=[],
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    try:
        response = client.patch(f"/api/handoff/tickets/{other_ticket_id}/status", json={"status": "closed"})
        with session_factory() as db:
            stored = db.get(api_app.WidgetHandoffTicket, other_ticket_id)
            stored_status = stored.status if stored else ""
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 404
    assert stored_status == "queued"


def test_handoff_ticket_status_update_rejects_invalid_status() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=ticket_id,
                session_id="lead-status-invalid",
                partner_id=TEST_PARTNER_ID,
                status="queued",
                priority="normal",
                risk_level="medium",
                category="general",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Проверка недопустимого статуса",
                handoff_context={},
                transcript_tail=[],
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    try:
        response = client.patch(f"/api/handoff/tickets/{ticket_id}/status", json={"status": "waiting_for_magic"})
        with session_factory() as db:
            stored = db.get(api_app.WidgetHandoffTicket, ticket_id)
            stored_status = stored.status if stored else ""
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 422
    assert stored_status == "queued"


def test_handoff_ticket_note_update_changes_own_ticket() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=ticket_id,
                session_id="lead-note-own",
                partner_id=TEST_PARTNER_ID,
                status="queued",
                priority="normal",
                risk_level="medium",
                category="general",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Нужно обновить заметку",
                handoff_context={"diagnostics": {"risk_level": "medium"}},
                transcript_tail=[],
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    try:
        response = client.patch(
            f"/api/handoff/tickets/{ticket_id}/note",
            json={"note": "Попросить справку ФССП и перезвонить завтра."},
        )
        with session_factory() as db:
            stored = db.get(api_app.WidgetHandoffTicket, ticket_id)
            stored_context = stored.handoff_context if stored else {}
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["ticket_id"] == str(ticket_id)
    assert payload["operator_note"] == "Попросить справку ФССП и перезвонить завтра."
    assert "handoff_context" not in payload
    assert stored_context["operator_note"] == "Попросить справку ФССП и перезвонить завтра."


def test_handoff_ticket_note_update_is_partner_scoped() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    other_ticket_id = uuid4()

    with session_factory() as db:
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=other_ticket_id,
                session_id="lead-note-other",
                partner_id=uuid4(),
                status="queued",
                priority="urgent",
                risk_level="high",
                category="other_partner",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Чужая заявка",
                handoff_context={"operator_note": "Не менять", "diagnostics": {"risk_level": "high"}},
                transcript_tail=[],
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    try:
        response = client.patch(f"/api/handoff/tickets/{other_ticket_id}/note", json={"note": "Чужая заметка"})
        with session_factory() as db:
            stored = db.get(api_app.WidgetHandoffTicket, other_ticket_id)
            stored_context = stored.handoff_context if stored else {}
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 404
    assert stored_context["operator_note"] == "Не менять"


def test_handoff_ticket_note_update_rejects_too_long_note() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=ticket_id,
                session_id="lead-note-long",
                partner_id=TEST_PARTNER_ID,
                status="queued",
                priority="normal",
                risk_level="medium",
                category="general",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Проверка лимита заметки",
                handoff_context={},
                transcript_tail=[],
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    try:
        response = client.patch(f"/api/handoff/tickets/{ticket_id}/note", json={"note": "а" * 1001})
        with session_factory() as db:
            stored = db.get(api_app.WidgetHandoffTicket, ticket_id)
            stored_context = stored.handoff_context if stored else {}
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 422
    assert "operator_note" not in stored_context


def test_handoff_ticket_note_update_allows_clear() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=ticket_id,
                session_id="lead-note-clear",
                partner_id=TEST_PARTNER_ID,
                status="queued",
                priority="normal",
                risk_level="medium",
                category="general",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Очистить заметку",
                handoff_context={"operator_note": "Старая заметка", "diagnostics": {"known_count": 1}},
                transcript_tail=[],
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    try:
        response = client.patch(f"/api/handoff/tickets/{ticket_id}/note", json={"note": ""})
        with session_factory() as db:
            stored = db.get(api_app.WidgetHandoffTicket, ticket_id)
            stored_context = stored.handoff_context if stored else {}
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    assert response.json()["operator_note"] == ""
    assert "operator_note" not in stored_context
    assert stored_context["diagnostics"]["known_count"] == 1


def test_handoff_ticket_detail_generates_adaptive_decision_checklist() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=ticket_id,
                session_id="lead-checklist-detail",
                partner_id=TEST_PARTNER_ID,
                status="queued",
                priority="high",
                risk_level="high",
                category="general",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Проверка checklist",
                handoff_context={
                    "diagnostics": {
                        "debt_amount": "2 000 000 рублей",
                        "bailiffs": "есть списания",
                        "income": "официальный доход",
                        "property": ["квартира", "ипотека/залог"],
                        "missing_fields": ["размер дохода"],
                        "risk_level": "high",
                    }
                },
                transcript_tail=[],
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    try:
        response = client.get(f"/api/handoff/tickets/{ticket_id}")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    checklist = response.json()["decision_checklist"]
    by_key = {item["key"]: item for item in checklist}
    assert {"verify_debt_amount", "check_bailiffs", "clarify_income", "review_property", "request_documents", "set_next_status"}.issubset(by_key)
    assert by_key["check_bailiffs"]["required"] is True
    assert by_key["review_property"]["required"] is True
    assert by_key["request_documents"]["done"] is False
    assert "handoff_context" not in response.text


def test_handoff_ticket_checklist_update_changes_own_ticket() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=ticket_id,
                session_id="lead-checklist-own",
                partner_id=TEST_PARTNER_ID,
                status="queued",
                priority="normal",
                risk_level="medium",
                category="general",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Проверка toggle checklist",
                handoff_context={"diagnostics": {"debt_amount": "500 000 рублей"}},
                transcript_tail=[],
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    try:
        response = client.patch(
            f"/api/handoff/tickets/{ticket_id}/checklist",
            json={"item_key": "verify_debt_amount", "done": True},
        )
        with session_factory() as db:
            stored = db.get(api_app.WidgetHandoffTicket, ticket_id)
            stored_context = stored.handoff_context if stored else {}
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    by_key = {item["key"]: item for item in response.json()["decision_checklist"]}
    assert by_key["verify_debt_amount"]["done"] is True
    assert stored_context["operator_decision_checklist"]["done"]["verify_debt_amount"] is True


def test_handoff_ticket_checklist_update_is_partner_scoped() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    other_ticket_id = uuid4()

    with session_factory() as db:
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=other_ticket_id,
                session_id="lead-checklist-other",
                partner_id=uuid4(),
                status="queued",
                priority="high",
                risk_level="high",
                category="other_partner",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Чужая заявка",
                handoff_context={"diagnostics": {"debt_amount": "900 000 рублей"}},
                transcript_tail=[],
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    try:
        response = client.patch(
            f"/api/handoff/tickets/{other_ticket_id}/checklist",
            json={"item_key": "verify_debt_amount", "done": True},
        )
        with session_factory() as db:
            stored = db.get(api_app.WidgetHandoffTicket, other_ticket_id)
            stored_context = stored.handoff_context if stored else {}
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 404
    assert "operator_decision_checklist" not in stored_context


def test_handoff_ticket_checklist_update_rejects_invalid_item() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        db.add(
            api_app.WidgetHandoffTicket(
                ticket_id=ticket_id,
                session_id="lead-checklist-invalid",
                partner_id=TEST_PARTNER_ID,
                status="queued",
                priority="normal",
                risk_level="medium",
                category="general",
                requested_channel="web_chat",
                target_channel="phone",
                reason="Проверка invalid checklist",
                handoff_context={},
                transcript_tail=[],
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    try:
        response = client.patch(
            f"/api/handoff/tickets/{ticket_id}/checklist",
            json={"item_key": "unknown_magic_item", "done": True},
        )
        with session_factory() as db:
            stored = db.get(api_app.WidgetHandoffTicket, ticket_id)
            stored_context = stored.handoff_context if stored else {}
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 422
    assert "operator_decision_checklist" not in stored_context


def test_handoff_ticket_readiness_ready_to_call_when_case_has_contact_and_progress() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=ticket_id,
            session_id="lead-readiness-ready",
            status="contacted",
            risk_level="medium",
            priority="normal",
            handoff_context={
                "contact": {"phone": "+7 900 333-44-55"},
                "diagnostics": {
                    "debt_amount": "650 000 рублей",
                    "income": "официальный доход",
                    "risk_level": "medium",
                    "known_count": 4,
                },
                "operator_decision_checklist": {
                    "done": {
                        "verify_debt_amount": True,
                        "clarify_income": True,
                        "request_documents": True,
                        "set_next_status": True,
                    }
                },
            },
            created_at=now,
        )
        db.commit()

    try:
        response = client.get(f"/api/handoff/tickets/{ticket_id}")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["readiness_state"] == "ready_to_call"
    assert payload["readiness_label"] == "Готово к звонку"
    assert payload["blocking_items"] == []
    assert "звон" in payload["recommended_operator_action"].lower()


def test_handoff_ticket_readiness_needs_more_info_for_missing_critical_fields() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=ticket_id,
            session_id="lead-readiness-missing",
            status="queued",
            risk_level="medium",
            priority="normal",
            handoff_context={
                "contact": {"email": "client@example.test"},
                "diagnostics": {
                    "debt_amount": "650 000 рублей",
                    "risk_level": "medium",
                    "known_count": 2,
                    "missing_fields": ["доход", "имущество"],
                },
            },
            created_at=now,
        )
        db.commit()

    try:
        response = client.get(f"/api/handoff/tickets/{ticket_id}")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["readiness_state"] == "needs_more_info"
    assert any("доход" in item.lower() for item in payload["blocking_items"])
    assert any("имущество" in item.lower() for item in payload["blocking_items"])
    assert "уточн" in payload["recommended_operator_action"].lower()


def test_handoff_ticket_readiness_needs_document_review_for_risky_unchecked_case() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=ticket_id,
            session_id="lead-readiness-docs",
            status="queued",
            risk_level="high",
            priority="high",
            handoff_context={
                "contact": {"phone": "+7 900 444-55-66"},
                "diagnostics": {
                    "debt_amount": "1 200 000 рублей",
                    "bailiffs": "приставы списывают",
                    "property": ["квартира"],
                    "risk_level": "high",
                    "known_count": 5,
                },
            },
            created_at=now,
        )
        db.commit()

    try:
        response = client.get(f"/api/handoff/tickets/{ticket_id}")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["readiness_state"] == "needs_document_review"
    assert any("документ" in reason.lower() for reason in payload["readiness_reasons"])
    assert any("пристав" in item.lower() or "имущество" in item.lower() for item in payload["blocking_items"])


def test_handoff_ticket_readiness_requires_lawyer_review_for_high_risk_checked_case() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=ticket_id,
            session_id="lead-readiness-lawyer",
            status="qualified",
            risk_level="high",
            priority="high",
            handoff_context={
                "contact": {"phone": "+7 900 555-66-77"},
                "diagnostics": {
                    "debt_amount": "2 000 000 рублей",
                    "bailiffs": "есть списания",
                    "income": "официальный доход",
                    "property": ["квартира", "ипотека/залог"],
                    "risk_level": "high",
                    "known_count": 6,
                },
                "operator_decision_checklist": {
                    "done": {
                        "verify_debt_amount": True,
                        "check_bailiffs": True,
                        "clarify_income": True,
                        "review_property": True,
                        "request_documents": True,
                        "set_next_status": True,
                    }
                },
            },
            created_at=now,
        )
        db.commit()

    try:
        response = client.get(f"/api/handoff/tickets/{ticket_id}")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["readiness_state"] == "requires_lawyer_review"
    assert payload["readiness_label"] == "Проверка юриста"
    assert any("юрист" in item.lower() for item in payload["blocking_items"])
    assert "юрист" in payload["recommended_operator_action"].lower()


def test_handoff_ticket_readiness_low_fit_for_weak_old_ticket() -> None:
    client, session_factory = _make_client_with_db()
    now = datetime.now(timezone.utc)
    ticket_id = uuid4()

    with session_factory() as db:
        _add_handoff_ticket(
            db,
            ticket_id=ticket_id,
            session_id="lead-readiness-low",
            status="queued",
            risk_level="low",
            priority="low",
            handoff_context={},
            created_at=now,
        )
        db.commit()

    try:
        response = client.get(f"/api/handoff/tickets/{ticket_id}")
    finally:
        client.close()
        _cleanup_overrides()

    assert response.status_code == 200
    payload = response.json()
    assert payload["readiness_state"] == "low_fit"
    assert payload["readiness_label"] == "Низкая полнота"
    assert payload["document_checklist"]
    assert "handoff_context" not in response.text
