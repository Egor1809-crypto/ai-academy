#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


def _resolve_base() -> str:
    env = os.getenv("WIDGET_SMOKE_API_BASE", "").strip()
    if env:
        return env.rstrip("/")
    if len(sys.argv) > 1 and sys.argv[1].strip():
        return sys.argv[1].strip().rstrip("/")
    return "http://localhost:8000"


def _resolve_pid() -> str:
    env = os.getenv("WIDGET_SMOKE_PID", "").strip()
    if env:
        return env
    if len(sys.argv) > 2 and sys.argv[2].strip():
        return sys.argv[2].strip()
    return "default"


API_BASE = _resolve_base()
PID = _resolve_pid()
# Должен совпадать с metadata.widget_local_session при создании dialog session (проверка unified /api/chat/session).
WIDGET_LOCAL_SID = os.getenv("WIDGET_SMOKE_LOCAL_SESSION_ID", "smoke-widget-local-sid").strip() or "smoke-widget-local-sid"


def req(method: str, path: str, body: dict | None = None, headers: dict[str, str] | None = None):
    data = None
    req_headers = dict(headers or {})
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        req_headers["Content-Type"] = "application/json"
    r = urllib.request.Request(API_BASE + path, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            payload = resp.read().decode("utf-8")
            return resp.status, json.loads(payload) if payload else {}
    except urllib.error.HTTPError as e:
        payload = e.read().decode("utf-8")
        raise RuntimeError(f"HTTP {e.code} {path}: {payload}") from e


def main() -> int:
    print(f"[smoke] API={API_BASE} pid={PID}")

    code, ctx = req(
        "GET",
        f"/api/manyasha/widget-context?pid={urllib.parse.quote(PID)}&sid={urllib.parse.quote(WIDGET_LOCAL_SID)}",
    )
    assert code == 200 and ctx.get("partner_id"), "widget-context failed"
    partner_id = ctx["partner_id"]
    widget_token = str(ctx.get("widget_token") or "")
    assert widget_token, "widget-context did not return widget_token"
    issued_sid = str(ctx.get("session_id") or "")
    assert issued_sid == WIDGET_LOCAL_SID, "widget-context session_id mismatch"
    auth_headers = {"Authorization": f"Bearer {widget_token}"}
    print(f"[ok] context partner_id={partner_id}")

    code, user = req(
        "POST",
        "/api/users",
        {
            "partner_id": partner_id,
            "external_subject": "smoke-widget",
            "nickname": "smoke",
        },
    )
    assert code == 201 and user.get("user_id"), "create user failed"
    user_id = user["user_id"]
    print(f"[ok] user_id={user_id}")

    code, session = req(
        "POST",
        "/api/dialog/sessions",
        {
            "partner_id": partner_id,
            "user_id": user_id,
            "channel": "chat",
            "metadata": {"source": "smoke_widget_flow", "widget_local_session": WIDGET_LOCAL_SID},
        },
    )
    assert code == 201 and session.get("session_id"), "create dialog session failed"
    session_id = session["session_id"]
    print(f"[ok] session_id={session_id}")

    code, chat = req(
        "POST",
        "/api/manyasha/chat",
        {
            "message": "Привет, это smoke-тест",
            "history": [],
            "partner_id": partner_id,
            "user_id": user_id,
            "dialog_session_id": session_id,
        },
    )
    assert code == 200 and chat.get("reply"), "manyasha chat failed"
    print(f"[ok] manyasha reply len={len(chat['reply'])}")

    code, msgs = req(
        "GET",
        f"/api/dialog/sessions/{session_id}/messages?partner_id={urllib.parse.quote(partner_id)}&limit=10",
    )
    assert code == 200 and isinstance(msgs, list), "messages list failed"
    assert len(msgs) >= 2, "expected at least two messages (user + assistant)"
    print(f"[ok] stored messages={len(msgs)}")

    q_chat = (
        f"/api/chat/session/{urllib.parse.quote(WIDGET_LOCAL_SID)}"
        f"?partner_id={urllib.parse.quote(partner_id)}"
        f"&user_id={urllib.parse.quote(user_id)}"
        f"&dialog_session_id={urllib.parse.quote(session_id)}"
    )
    code, chat_hist = req("GET", q_chat, headers=auth_headers)
    assert code == 200 and isinstance(chat_hist.get("messages"), list), "unified chat session GET failed"
    assert len(chat_hist["messages"]) >= 2, "chat session transcript expected >= 2"
    print(f"[ok] unified /api/chat/session messages={len(chat_hist['messages'])}")

    print("[done] widget flow smoke passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
