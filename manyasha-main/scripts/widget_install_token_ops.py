#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


def _json_request(
    method: str,
    url: str,
    body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, Any]]:
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url=url, method=method.upper(), headers=req_headers, data=data)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = response.read().decode("utf-8")
            parsed = json.loads(payload) if payload else {}
            if not isinstance(parsed, dict):
                raise RuntimeError("Expected JSON object response.")
            return response.status, parsed
    except urllib.error.HTTPError as exc:  # type: ignore[name-defined]
        raw = exc.read().decode("utf-8")
        try:
            parsed = json.loads(raw) if raw else {}
        except Exception:
            parsed = {"detail": raw or f"HTTP {exc.code}"}
        if not isinstance(parsed, dict):
            parsed = {"detail": str(parsed)}
        return exc.code, parsed


def _issue_token_raw(args: argparse.Namespace) -> tuple[int, dict[str, Any]]:
    url = f"{args.api_base.rstrip('/')}/api/manyasha/widget-install-token"
    payload: dict[str, Any] = {
        "partner_id": args.partner_id,
        "site_key": args.site_key,
    }
    if args.origin:
        payload["origin"] = args.origin.strip()
    if args.ttl_seconds:
        payload["ttl_seconds"] = int(args.ttl_seconds)

    status, body = _json_request(
        "POST",
        url,
        body=payload,
        headers={"X-Widget-Install-Secret": args.install_secret},
    )
    return status, body


def _issue_token(args: argparse.Namespace) -> int:
    status, body = _issue_token_raw(args)
    print(json.dumps({"http_status": status, "response": body}, ensure_ascii=False, indent=2))
    return 0 if 200 <= status < 300 else 1


def _health_check(args: argparse.Namespace) -> tuple[int, dict[str, Any]]:
    qp = {
        "pid": args.pid,
        "site_key": args.site_key or "",
        "install_token": args.install_token or "",
    }
    if args.embed_contract_version:
        qp["embed_contract_version"] = args.embed_contract_version
    url = (
        f"{args.api_base.rstrip('/')}/api/manyasha/widget-install-health?"
        + urllib.parse.urlencode(qp)
    )
    headers: dict[str, str] = {}
    if args.origin:
        headers["Origin"] = args.origin.strip()
    status, body = _json_request("GET", url, body=None, headers=headers)
    return status, body


def _run_health(args: argparse.Namespace) -> int:
    status, body = _health_check(args)
    print(json.dumps({"http_status": status, "response": body}, ensure_ascii=False, indent=2))
    if status < 200 or status >= 300:
        return 1
    state = str(body.get("status") or "")
    return 0 if state == "ok" else 2


def _run_rotate(args: argparse.Namespace) -> int:
    issue_status, issue_body = _issue_token_raw(args)
    print(json.dumps({"http_status": issue_status, "response": issue_body}, ensure_ascii=False, indent=2))
    if issue_status < 200 or issue_status >= 300:
        return 1
    token = str(issue_body.get("token") or "").strip()
    if not token:
        print("Token was not returned by API.", file=sys.stderr)
        return 1

    args.install_token = token
    health_status, health_body = _health_check(args)
    print(json.dumps({"health_http_status": health_status, "health_response": health_body}, ensure_ascii=False, indent=2))
    if health_status < 200 or health_status >= 300:
        return 1
    return 0 if str(health_body.get("status") or "") in {"ok", "warn"} else 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Widget install token operations.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--api-base", required=True, help="API base URL, e.g. https://api.example.com")
    common.add_argument("--origin", default="", help="Origin host URL for health checks, e.g. https://site.example.com")
    common.add_argument("--embed-contract-version", default="", help="Embed contract version.")

    issue = subparsers.add_parser("issue", parents=[common], help="Issue new install token.")
    issue.add_argument("--partner-id", default="default")
    issue.add_argument("--site-key", required=True)
    issue.add_argument("--install-secret", required=True)
    issue.add_argument("--ttl-seconds", type=int, default=900)
    issue.set_defaults(func=_issue_token)

    health = subparsers.add_parser("health", parents=[common], help="Run install-health check.")
    health.add_argument("--pid", default="default")
    health.add_argument("--site-key", default="")
    health.add_argument("--install-token", default="")
    health.set_defaults(func=_run_health)

    rotate = subparsers.add_parser("rotate", parents=[common], help="Issue token and immediately validate install health.")
    rotate.add_argument("--partner-id", default="default")
    rotate.add_argument("--pid", default="default")
    rotate.add_argument("--site-key", required=True)
    rotate.add_argument("--install-secret", required=True)
    rotate.add_argument("--ttl-seconds", type=int, default=900)
    rotate.add_argument("--install-token", default="")
    rotate.set_defaults(func=_run_rotate)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
