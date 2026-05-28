# Staging Security Evidence

Timestamp: `2026-04-24T09:50:42Z`
Commit: `c3dbe92`
Environment used: local prod-like checks where possible
External staging: pending

## Summary

Status: `PARTIAL`

Production BLOCKED cannot be removed from this evidence pack yet.

## Commands And Results

| Area | Command | Result |
| --- | --- | --- |
| Git state | `git rev-parse --short HEAD` | `c3dbe92` |
| Backend security/readiness tests | `PYTHONPATH=$PWD ./.venv311/bin/pytest -q -c /dev/null tests/test_readyz.py tests/test_widget_install_health.py tests/test_validate_prod_env.py` | PASS, `20 passed` |
| Widget security e2e | `npx playwright test tests/e2e/widget-security.spec.ts --project=chromium` | FAIL, `4 passed / 1 failed` |
| Widget embed smoke | `npx playwright test tests/e2e/widget-embed-smoke.spec.ts --project=chromium` | PASS, `5 passed` |
| Node dependency scan | `npm --prefix frontend audit --audit-level=high` | FAIL, `5 vulnerabilities`, including `2 high` |
| Python dependency scan | `pip-audit` / `python -m pip_audit` | UNAVAILABLE in current local environment |
| SAST | `bandit` / `python -m bandit` | UNAVAILABLE in current local environment |
| Secret scan fallback | `git grep` high-signal secret patterns | PASS, no real secret values found |
| DAST baseline | `python scripts/dast_baseline.py` against local API | FAIL, `widget-context` returned HTTP `503` |

## Detailed Notes

- Prod env validator coverage is included through `tests/test_validate_prod_env.py`: positive config, missing Navy key, and unsafe prod flag cases.
- `/healthz` and `/readyz` coverage is included through `tests/test_readyz.py`; `/readyz` checks DB, Redis requirement, provider config, and no secret leakage.
- Widget install-health coverage is included through `tests/test_widget_install_health.py`; it covers contract, origin, site_key, install_token required/invalid/origin mismatch, and production CORS default behavior.
- `SEC-08` failed during authenticated `/api/handoff/request` setup: expected `201`, got `500` in current local runtime.
- Local DAST failed before negative checks because `/api/manyasha/widget-context` returned `503`.
- `npm audit` reported high vulnerabilities in frontend dependency tree. Package names observed: `picomatch`, `vite`; moderate findings included `axios`, `brace-expansion`, `follow-redirects`.
- No external staging domain, staging install token, or staging screenshots/video were available in this run.

## Missing External Evidence

- Real staging domain and API URL.
- Real staging `site_key` and short-lived `install_token` proof without exposing token value.
- `/healthz` and `/readyz` output from staging.
- `widget-install-health` output from staging.
- Postgres-backed security e2e summary from staging/CI.
- SAST, secret scan, Python dependency scan, Node dependency scan, and DAST artifacts from CI or staging.
- Screenshots/video showing external embed smoke without technical errors.

## Signoff Impact

Production signoff remains `BLOCKED`.

Minimum blockers from this run:

- Widget security e2e is not fully green locally because `SEC-08` failed.
- Node dependency scan failed at high severity.
- DAST baseline failed in local environment.
- Python dependency scan and Bandit were unavailable locally.
- External staging evidence is pending.
