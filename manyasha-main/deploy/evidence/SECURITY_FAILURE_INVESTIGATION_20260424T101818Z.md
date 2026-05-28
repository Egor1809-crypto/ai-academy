# Security Failure Investigation

Timestamp: `2026-04-24T10:18:18Z`
Base commit: `c3dbe92`
Environment: local test/prod-like evidence checks
External staging: pending

## Findings

Status: `PARTIAL`

Production remains blocked because external staging evidence and npm audit highs are still pending, but the two investigated failures are now understood.

## Root Causes

1. `SEC-08` failed because local SQLite returned incompatible UUID values during `db.refresh(ticket)` after creating `/api/handoff/request`.
   The auth/security check itself was not the failing part. Removing the refresh avoids the SQLite decode failure and keeps the protected status endpoints unchanged.

2. DAST `widget-context` returned `503` because the ad-hoc local uvicorn run was missing the same test/prod-like env used by Playwright/CI.
   With `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, dev/test flags, captcha disabled for test, and `INTERNAL_METRICS_SERVICE_TOKEN`, `widget-context` succeeds and DAST baseline passes.

## Changes Made

- `app.py`: removed the unnecessary `db.refresh(ticket)` after handoff commit.
- `.github/workflows/ci.yml`: added `INTERNAL_METRICS_SERVICE_TOKEN` to the CI security-gates env so DAST sees internal metrics as protected.

## Verification

| Check | Result |
| --- | --- |
| `npx playwright test tests/e2e/widget-security.spec.ts --project=chromium` | PASS, `5 passed` |
| `PYTHONPATH=$PWD ./.venv311/bin/pytest -q -c /dev/null tests/test_widget_install_health.py tests/test_readyz.py tests/test_validate_prod_env.py` | PASS, `20 passed` |
| `scripts/dast_baseline.py` with local test/prod-like env and internal metrics token | PASS, `[dast-baseline] OK` |

## Remaining Blockers

- `npm audit --audit-level=high` still needs a separate dependency remediation pass.
- External staging domain/site_key/install_token evidence is still pending.
- Full production signoff should remain blocked until fresh staging evidence and dependency scan evidence are attached.
