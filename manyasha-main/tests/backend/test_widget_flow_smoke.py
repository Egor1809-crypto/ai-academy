from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request

import pytest

API_BASE = os.getenv("WIDGET_SMOKE_API_BASE", "").strip().rstrip("/")
PID = os.getenv("WIDGET_SMOKE_PID", "default").strip() or "default"
WIDGET_LOCAL_SID = os.getenv("WIDGET_SMOKE_LOCAL_SESSION_ID", "pytest-widget-local-sid").strip() or "pytest-widget-local-sid"


@pytest.mark.skipif(not API_BASE, reason="Set WIDGET_SMOKE_API_BASE to run live widget smoke")
def test_widget_flow_smoke_live_api() -> None:
    def req(
        method: str,
        path: str,
        body: dict | None = None,
        headers: dict[str, str] | None = None,
    ) -> tuple[int, dict | list]:
        data = None
        req_headers: dict[str, str] = dict(headers or {})
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            req_headers["Content-Type"] = "application/json"
        request = urllib.request.Request(API_BASE + path, data=data, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=25) as resp:
                payload = resp.read().decode("utf-8")
                parsed = json.loads(payload) if payload else {}
                return resp.status, parsed
        except urllib.error.HTTPError as exc:
            payload = exc.read().decode("utf-8")
            raise AssertionError(f"HTTP {exc.code} for {path}: {payload}") from exc

    code, ctx = req(
        "GET",
        f"/api/manyasha/widget-context?pid={urllib.parse.quote(PID)}&sid={urllib.parse.quote(WIDGET_LOCAL_SID)}",
    )
    assert code == 200
    assert isinstance(ctx, dict)
    partner_id = ctx.get("partner_id")
    widget_token = ctx.get("widget_token")
    issued_sid = ctx.get("session_id")
    assert partner_id
    assert widget_token
    assert issued_sid == WIDGET_LOCAL_SID
    auth_headers = {"Authorization": f"Bearer {widget_token}"}

    code, user = req(
        "POST",
        "/api/users",
        {
            "partner_id": partner_id,
            "external_subject": "pytest-widget-smoke",
            "nickname": "pytest-smoke",
        },
    )
    assert code == 201
    assert isinstance(user, dict)
    user_id = user.get("user_id")
    assert user_id

    code, session = req(
        "POST",
        "/api/dialog/sessions",
        {
            "partner_id": partner_id,
            "user_id": user_id,
            "channel": "chat",
            "metadata": {"source": "pytest_widget_smoke", "widget_local_session": WIDGET_LOCAL_SID},
        },
    )
    assert code == 201
    assert isinstance(session, dict)
    session_id = session.get("session_id")
    assert session_id

    code, chat = req(
        "POST",
        "/api/manyasha/chat",
        {
            "message": "Привет, это pytest smoke",
            "history": [],
            "partner_id": partner_id,
            "user_id": user_id,
            "dialog_session_id": session_id,
        },
    )
    assert code == 200
    assert isinstance(chat, dict)
    assert chat.get("reply")
    assert isinstance(chat.get("speech_reply"), str)
    assert str(chat.get("speech_reply") or "").strip()

    code, messages = req(
        "GET",
        f"/api/dialog/sessions/{session_id}/messages?partner_id={urllib.parse.quote(partner_id)}&limit=10",
    )
    assert code == 200
    assert isinstance(messages, list)
    assert len(messages) >= 2

    q_chat = (
        f"/api/chat/session/{urllib.parse.quote(WIDGET_LOCAL_SID)}"
        f"?partner_id={urllib.parse.quote(partner_id)}"
        f"&user_id={urllib.parse.quote(user_id)}"
        f"&dialog_session_id={urllib.parse.quote(session_id)}"
    )
    code, chat_hist = req("GET", q_chat, headers=auth_headers)
    assert code == 200
    assert isinstance(chat_hist, dict)
    assert isinstance(chat_hist.get("messages"), list)
    assert len(chat_hist["messages"]) >= 2
