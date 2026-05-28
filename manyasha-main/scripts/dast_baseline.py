#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request


BASE_URL = (os.getenv("DAST_BASE_URL") or "http://127.0.0.1:8000").strip().rstrip("/")


def http_request(
    method: str,
    path: str,
    *,
    body: dict | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict | list | str]:
    request_headers = dict(headers or {})
    payload = None
    if body is not None:
        payload = json.dumps(body).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(f"{BASE_URL}{path}", data=payload, headers=request_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = resp.read().decode("utf-8")
            if not raw:
                return resp.status, {}
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        if not raw:
            return exc.code, {}
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, raw


def assert_status(actual: int, expected: int, label: str) -> None:
    if actual != expected:
        raise RuntimeError(f"{label}: expected HTTP {expected}, got HTTP {actual}")


def main() -> int:
    sid = f"dast-{int(time.time())}"
    ctx_status, ctx_payload = http_request(
        "GET",
        f"/api/manyasha/widget-context?pid=default&sid={urllib.parse.quote(sid)}",
    )
    assert_status(ctx_status, 200, "widget-context")
    if not isinstance(ctx_payload, dict):
        raise RuntimeError("widget-context payload is not JSON object")
    token = str(ctx_payload.get("widget_token") or "")
    if not token:
        raise RuntimeError("widget-context did not return widget_token")

    checks_unauthorized = [
        ("GET", f"/api/chat/session/{urllib.parse.quote(sid)}", None),
        ("PUT", f"/api/chat/session/{urllib.parse.quote(sid)}", {"messages": []}),
        ("POST", "/api/consultation-request", {
            "name": "DAST",
            "phone": "+70000000000",
            "email": "dast@example.com",
            "question": "test",
            "session_id": sid,
        }),
        ("POST", "/api/email-capture", {
            "email": "dast@example.com",
            "question": "test",
            "session_id": sid,
        }),
        ("POST", "/api/analytics/event", {
            "session_id": sid,
            "event_type": "dast_event",
            "data": {"ok": True},
        }),
        ("POST", "/api/handoff/request", {
            "session_id": sid,
            "reason": "dast handoff",
        }),
    ]
    for method, path, body in checks_unauthorized:
        status, _ = http_request(method, path, body=body)
        assert_status(status, 401, f"{method} {path} without auth")

    wrong_sid = f"{sid}-other"
    status, _ = http_request(
        "GET",
        f"/api/chat/session/{urllib.parse.quote(wrong_sid)}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert_status(status, 403, "chat/session mismatch session_id")

    huge_payload = {"huge": "x" * 20_000}
    status, _ = http_request(
        "POST",
        "/api/analytics/event",
        headers={"Authorization": f"Bearer {token}"},
        body={"session_id": sid, "event_type": "dast_oversized", "data": huge_payload},
    )
    assert_status(status, 413, "analytics oversized payload")

    metrics_status, _ = http_request("POST", "/internal/metrics/llm-timeout")
    if metrics_status not in {403, 503}:
        raise RuntimeError(f"/internal/metrics/llm-timeout expected 403/503, got {metrics_status}")

    print("[dast-baseline] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
