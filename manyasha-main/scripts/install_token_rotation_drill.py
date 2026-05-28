#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _request_json(method: str, url: str, *, headers: dict[str, str] | None = None, body: dict[str, Any] | None = None) -> tuple[int, dict[str, Any]]:
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url=url, method=method.upper(), data=data, headers=req_headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8")
            parsed = json.loads(raw) if raw else {}
            return resp.status, parsed if isinstance(parsed, dict) else {"raw": parsed}
    except Exception as exc:
        payload = {"detail": str(exc)}
        if hasattr(exc, "code") and hasattr(exc, "read"):
            try:
                body_raw = exc.read().decode("utf-8")
                body_json = json.loads(body_raw) if body_raw else {}
                if isinstance(body_json, dict):
                    payload = body_json
                else:
                    payload = {"detail": str(body_json)}
            except Exception:
                pass
            return int(getattr(exc, "code", 0)), payload
        return 0, payload


def _issue_install_token(args: argparse.Namespace) -> tuple[int, dict[str, Any]]:
    url = f"{args.api_base.rstrip('/')}/api/manyasha/widget-install-token"
    body = {
        "partner_id": args.partner_id,
        "site_key": args.site_key,
        "origin": args.origin,
        "ttl_seconds": int(args.ttl_seconds),
    }
    headers = {"X-Widget-Install-Secret": args.install_secret}
    return _request_json("POST", url, headers=headers, body=body)


def _install_health(args: argparse.Namespace, token: str) -> tuple[int, dict[str, Any]]:
    qp = {
        "pid": args.pid,
        "site_key": args.site_key,
        "install_token": token,
        "embed_contract_version": args.embed_contract_version,
    }
    url = f"{args.api_base.rstrip('/')}/api/manyasha/widget-install-health?{urllib.parse.urlencode(qp)}"
    headers = {"Origin": args.origin}
    return _request_json("GET", url, headers=headers, body=None)


def _append_jsonl(path: Path, item: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")


def run(args: argparse.Namespace) -> int:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    report_file = Path(args.out_dir).expanduser().resolve() / f"install-token-drill-{timestamp}.jsonl"

    _append_jsonl(report_file, {"stage": "start", "at": _now_iso(), "params": {
        "api_base": args.api_base,
        "partner_id": args.partner_id,
        "pid": args.pid,
        "site_key": args.site_key,
        "origin": args.origin,
        "ttl_seconds": int(args.ttl_seconds),
        "embed_contract_version": args.embed_contract_version,
        "observe_seconds": int(args.observe_seconds),
    }})

    issue_status, issue_body = _issue_install_token(args)
    _append_jsonl(report_file, {"stage": "issue_token", "at": _now_iso(), "http_status": issue_status, "response": issue_body})
    if not (200 <= issue_status < 300):
        print(f"DRILL_FAIL: token issue failed, see {report_file}")
        return 1

    token = str(issue_body.get("token") or "").strip()
    if not token:
        _append_jsonl(report_file, {"stage": "issue_token", "at": _now_iso(), "error": "empty_token"})
        print(f"DRILL_FAIL: empty token, see {report_file}")
        return 1

    health_status, health_body = _install_health(args, token)
    _append_jsonl(report_file, {"stage": "install_health_initial", "at": _now_iso(), "http_status": health_status, "response": health_body})
    if not (200 <= health_status < 300):
        print(f"DRILL_FAIL: health endpoint failed, see {report_file}")
        return 1

    state = str(health_body.get("status") or "")
    if state not in {"ok", "warn"}:
        print(f"DRILL_FAIL: health status={state}, see {report_file}")
        return 2

    observe_seconds = max(0, int(args.observe_seconds))
    while observe_seconds > 0:
        sleep_for = min(30, observe_seconds)
        time.sleep(sleep_for)
        observe_seconds -= sleep_for
        health_status, health_body = _install_health(args, token)
        _append_jsonl(report_file, {"stage": "install_health_observe", "at": _now_iso(), "http_status": health_status, "response": health_body})
        if not (200 <= health_status < 300):
            print(f"DRILL_FAIL: observed health endpoint failure, see {report_file}")
            return 1
        state = str(health_body.get("status") or "")
        if state not in {"ok", "warn"}:
            print(f"DRILL_FAIL: observed health status={state}, see {report_file}")
            return 2

    _append_jsonl(report_file, {"stage": "done", "at": _now_iso(), "result": "pass"})
    print(f"DRILL_OK: {report_file}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Install token rotation drill.")
    parser.add_argument("--api-base", required=True, help="API base URL, e.g. https://api.example.com")
    parser.add_argument("--partner-id", default="default")
    parser.add_argument("--pid", default="default")
    parser.add_argument("--site-key", required=True)
    parser.add_argument("--origin", required=True, help="Partner site origin, e.g. https://partner.example")
    parser.add_argument("--install-secret", required=True)
    parser.add_argument("--ttl-seconds", type=int, default=900)
    parser.add_argument("--embed-contract-version", default="1")
    parser.add_argument("--observe-seconds", type=int, default=0, help="Optional monitoring period after rotation.")
    parser.add_argument("--out-dir", default="deploy/drills")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())

