# Widget Final QA Report

Date: 2026-04-19

## Automated validation (real run, not `--list`)

### 1) State-machine + anti-jitter

```bash
npx playwright test tests/e2e/widget-state-machine.spec.ts --project=chromium
npx playwright test tests/e2e/widget-state-machine.spec.ts --project=webkit --project=webkit-mobile
```

Result:

- `chromium`: `2 passed`
- `webkit`: `2 passed`
- `webkit-mobile`: `2 passed`

Covered:

- transition chain `idle -> listening -> thinking -> speaking -> idle`
- anti-jitter under rapid input toggles
- no fallback to `listening` while request is pending

### 2) Voice edge-cases

```bash
npx playwright test tests/e2e/widget-voice-edge.spec.ts --project=chromium
npx playwright test tests/e2e/widget-voice-edge.spec.ts --project=webkit --project=webkit-mobile
```

Result:

- `chromium`: `4 passed`
- `webkit`: `4 passed`
- `webkit-mobile`: `4 passed`

Covered:

- mic denied (no stuck in listening)
- autoplay blocked (no stuck, graceful continuation)
- TTS unavailable (text flow continues, no stuck)
- slow API response (degraded mode + recovery)

### 3) Embed smoke (real backend)

```bash
npx playwright test tests/e2e/widget-embed-smoke.spec.ts --project=chromium
npx playwright test tests/e2e/widget-embed-smoke.spec.ts --project=webkit --project=webkit-mobile
```

Result:

- `chromium`: `3 passed`
- `webkit`: `3 passed`
- `webkit-mobile`: `3 passed`

Covered:

- embed loads and opens iframe
- CSP allow scenario
- CSP blocked scenario with explicit install-health error

### 4) Security e2e (critical widget endpoints)

```bash
npx playwright test tests/e2e/widget-security.spec.ts --project=chromium
```

Result:

- `chromium`: `5 passed`

Covered:

- auth required on critical widget endpoints
- widget token/session binding
- payload limit (`413`) enforcement
- lead endpoint rate-limit (`429`)
- handoff status endpoints (`GET` + `POST`) protected (`401` without widget token)

## Widget maintainability pass (de-monolith)

`frontend/public/mascot-design-preview.html` больше не содержит giant inline runtime.

Runtime вынесен в модульный набор:

- `frontend/public/widget/widget-core.js`
- `frontend/public/widget/widget-api.js`
- `frontend/public/widget/widget-state.js`
- `frontend/public/widget/widget-a11y.js`
- `frontend/public/widget/widget-ui.js`
- `frontend/public/widget/widget-consult.js`

`frontend/dist/` синхронизирован с тем же набором файлов.

### 5) Final integration run (Chromium)

```bash
npx playwright test \
  tests/e2e/widget-state-machine.spec.ts \
  tests/e2e/widget-voice-edge.spec.ts \
  tests/e2e/widget-embed-smoke.spec.ts \
  tests/e2e/widget-security.spec.ts \
  --project=chromium
```

Result:

- `13 passed`

## Backend security checkpoints

Validated in code:

- `partner_dashboard.py`:
  - `DEV_AUTH_ENABLED` defaults off and is restricted to dev/test env only.
  - no static fallback secret for token signing.
  - `X-Partner-Id` header auth path is disabled by default and blocked in prod.
  - partner passwords moved to `scrypt` with legacy SHA-256 migration on login.
  - `/dev-auth/login` restricted for custom partner usage.
- `app.py`:
  - critical widget endpoints require widget token auth.
  - internal metrics endpoints are protected with service token/IP allowlist.
  - AES-GCM encrypt path fails closed (no plaintext fallback on encryption failure).
  - `ALLOW_LEGACY_PLAINTEXT_PII` defaults to `false`.

Automated backend test:

```bash
PYTHONPATH=. .venv311/bin/pytest -q tests/test_widget_install_health.py
```

Result:

- `7 passed`

CI hardening updates:

- backend security proof suite on real Postgres now includes:
  - `tests/backend/test_partner_auth_security.py`
  - `tests/backend/test_partner_mascot_runtime.py`
  - `tests/backend/test_rpg_security.py`
  - `tests/test_widget_install_health.py`
- dedicated Playwright negative security suite is run explicitly:
  - `tests/e2e/widget-security.spec.ts` (`401/403/429` checks)

Note:

- `tests/backend/test_partner_auth_security.py` requires a configured PostgreSQL test instance with valid credentials; in this environment the DB auth failed, so this suite could not be fully executed.

## Manual QA checklist (real host pages)

Recommended final manual pass before prod:

1. Light warm host background (marketing page): verify contrast + readability.
2. Neutral light dashboard background: verify no clipping and full chat width in expanded mode.
3. Dark host theme: verify text contrast and icon visibility.
4. CSP-restricted host: verify install-health diagnostics are explicit.
5. iOS Safari host page: verify drag, open/close, keyboard composer behavior.

Per-host checklist:

- open/close works
- drag works for opened and collapsed states
- state transitions are smooth and no jitter
- voice fallback is graceful (no frozen UI)
- degraded/offline indicators are understandable
- CTA remains visible but non-intrusive
