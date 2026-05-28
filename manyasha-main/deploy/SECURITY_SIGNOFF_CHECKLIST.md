# Security Sign-off Checklist

Date: 2026-04-20
Owner: Manaya team (Egor + Codex)

## Gate A: P0/P1 closure

1. `PARTIAL` — P0 findings closed in code path, but full re-verification on real Postgres runtime still pending final pass.
2. `PARTIAL` — P1 findings closed in code path, but requires final regression confirmation in production-like DB/runtime.
3. `PARTIAL` — regressions added for critical widget/security paths, but final green run is blocked by local SQLite vs Postgres mismatch (`set_config` path).

## Gate B: CI security controls

1. `PENDING EVIDENCE` — SAST results not attached in this artifact set.
2. `PENDING EVIDENCE` — secret scan results not attached in this artifact set.
3. `PENDING EVIDENCE` — dependency scan results not attached in this artifact set.
4. `PENDING EVIDENCE` — DAST baseline report not attached in this artifact set.
5. `PARTIAL` — backend suite is wired for Postgres in CI, but final proof artifact for this sign-off run is not attached here.
6. `PARTIAL` — security negative suite run now: `4 passed / 1 failed` (`SEC-08` failed with `500` during handoff create in current local runtime).

## Gate C: Runtime hardening

1. `READY BY CONFIG POLICY` — `DEV_AUTH_ENABLED=false` expected in prod config.
2. `READY BY CONFIG POLICY` — `ALLOW_LEGACY_PLAINTEXT_PII=false`.
3. `READY BY CONFIG POLICY` — `WIDGET_CONTEXT_REQUIRE_INSTALL=true`.
4. `READY BY CONFIG POLICY` — `CORS_ALLOW_ORIGINS` without wildcard.
5. `READY BY CONFIG POLICY` — `INTERNAL_METRICS_SERVICE_TOKEN` required.
6. `PARTIAL` — anti-bot present in config gates, needs final production env verification evidence.
7. `PARTIAL` — rate-limit active in tests, needs final production env verification evidence.

## Gate D: External validation (recommended)

1. `NOT DONE` — external pentest report not attached.
2. `N/A` — no external result attached.
3. `N/A` — no external medium findings register attached.

## Sign-off result

- Status: `BLOCKED`
- Blocking issues:
  - Manual host QA on 5 live host pages completed (`PASS`), but full state/voice checklist still requires Postgres-backed final pass.
  - Final backend proof run on real Postgres not attached for this sign-off cut.
  - Security negative suite not fully green in current local run (`SEC-08`).
  - External pentest report missing.
- Approved by:
  - Egor (Product Owner) — conditional internal approval for staging continuation.
  - Codex (Engineering QA) — conditional internal approval for remediation cycle.
  - External security approver — pending.
