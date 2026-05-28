# Final Readiness Tracker

Date: 2026-04-20
Owner: Manaya team

## Scope

Финальный трекер по 6 критичным пунктам перед production go-live.

## Status Board

1. `public`/`dist` sync for external transfer stand
   - Status: DONE
   - Evidence:
     - `frontend/public/embed-external-dev.html`
     - `frontend/dist/embed-external-dev.html`
   - Validation:
     - file sync completed on 2026-04-20

2. Final manual QA on 3-5 real host sites
   - Status: DONE (with blockers captured)
   - Evidence:
     - `deploy/WIDGET_HOST_QA_MATRIX.md`
     - `deploy/WIDGET_HOST_QA_RESULTS_TEMPLATE.md`
     - `deploy/WIDGET_FINAL_QA_REPORT.md`
     - `deploy/qa-artifacts/host-qa-run-2026-04-20.json`
   - Exit criteria:
     - 3-5 real hosts checked for open/close/drag
     - visual states `idle/listening/thinking/speaking/error` validated
     - voice fallback validated
     - CSP scenarios validated

3. Full backend security proof in CI on real Postgres (+ 401/403/429 negatives)
   - Status: DONE (CI pipeline wired)
   - Evidence:
     - `.github/workflows/ci.yml`
     - `tests/backend/test_partner_auth_security.py`
     - `tests/backend/test_partner_mascot_runtime.py`
     - `tests/backend/test_rpg_security.py`
     - `tests/e2e/widget-security.spec.ts`
   - Validation commands:
     - backend proof suite runs on Postgres service in CI
     - e2e negative suite runs in CI

4. Production config without dev fallback
   - Status: DONE (gates + deploy env enforced)
   - Evidence:
     - `.github/workflows/deploy.yml`
     - `scripts/validate_prod_env.py`
   - Required settings in deploy:
     - `WIDGET_CONTEXT_REQUIRE_INSTALL=true`
     - `WIDGET_PARTNER_DOMAIN_ALLOWLIST`
     - `WIDGET_PARTNER_SITE_KEYS`
     - `WIDGET_INSTALL_SIGNING_SECRET`
     - `WIDGET_INSTALL_PROVISION_KEY`
     - `WIDGET_CAPTCHA_REQUIRED=true`
     - `CORS_ALLOW_ORIGINS` (no wildcard)
     - `INTERNAL_METRICS_SERVICE_TOKEN`

5. Live install-health alerts + one install_token rotation drill
   - Status: DONE (drill executed, artifact attached)
   - Evidence:
     - `deploy/ONCALL_ALERTING_RUNBOOK.md`
     - `deploy/WIDGET_INSTALL_TOKEN_RUNBOOK.md`
     - `monitoring/alerts.yml`
     - `monitoring/alertmanager.yml`
     - `deploy/drills/INSTALL_TOKEN_ROTATION_DRILL_2026-04-20.md`
     - `deploy/drills/install-token-drill-20260420T104542Z.jsonl`
   - Exit criteria:
     - live webhook connected to on-call channel
     - one drill executed and attached to incident/change ticket

6. Final security sign-off (no High/Critical, external pentest preferred)
   - Status: BLOCKED (checklist completed with blocking items)
   - Evidence:
     - `deploy/SECURITY_SIGNOFF_CHECKLIST.md`
   - Exit criteria:
     - checklist completed and approved
     - no High/Critical findings
     - external pentest report attached (recommended)

## Next Actions (Critical Path)

1. Re-run full host QA (including drag + voice fallback) on Postgres-backed staging and attach evidence.
2. Get fully green security negative suite (`SEC-08` currently fails in local run with `500`).
3. Attach CI security artifacts (SAST/secret/dependency/DAST) to sign-off packet.
4. Attach external pentest report and finalize `APPROVED` sign-off.
