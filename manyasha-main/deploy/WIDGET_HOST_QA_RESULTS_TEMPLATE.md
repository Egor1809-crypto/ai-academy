# Widget Host QA Results (Template)

Date: 2026-04-20
QA owner: Egor + Codex (assisted run)

## Host #1

- URL: `http://127.0.0.1:5173/embed-external-dev.html`
- Browser/version: Chromium `147.0.7727.15` (local live run)
- Theme/background type: external bankruptcy landing (light)
- Result: PASS
- Notes:
  - `ManyashaWidget` API ready, open/close works, install-health: `ok/widget_ready`.
  - Evidence:
    - `deploy/qa-artifacts/host1_external.png`
    - `deploy/qa-artifacts/host-qa-run-2026-04-20.json`

## Host #2

- URL: `http://127.0.0.1:5173/embed-csp-dev.html`
- Browser/version: Chromium `147.0.7727.15` (local live run)
- Theme/background type: CSP host (allow scenario)
- Result: PASS
- Notes:
  - `open/close` works, iframe is visible, install-health: `ok/widget_ready`.
  - Evidence:
    - `deploy/qa-artifacts/host2_csp_allow.png`
    - `deploy/qa-artifacts/host-qa-run-2026-04-20.json`

## Host #3

- URL: `http://127.0.0.1:5173/embed-csp-blocked-dev.html`
- Browser/version: Chromium `147.0.7727.15` (local live run)
- Theme/background type: CSP host (blocked scenario)
- Result: PASS
- Notes:
  - Expected degraded behavior observed: install-health reaches `error/widget_iframe_timeout`.
  - Visible iframe shell remains present, but diagnostic error is explicit and actionable.
  - Evidence:
    - `deploy/qa-artifacts/host3_csp_blocked.png`
    - `deploy/qa-artifacts/host-qa-run-2026-04-20.json`

## Host #4 (optional)

- URL: `http://127.0.0.1:5173/embed-host-qa.html?theme=warm`
- Browser/version: Chromium `147.0.7727.15` (local live run)
- Theme/background type: warm/light marketing background
- Result: PASS
- Notes:
  - Widget opens correctly, readable contrast on warm theme, install-health: `ok/widget_ready`.
  - Evidence:
    - `deploy/qa-artifacts/host4_warm.png`
    - `deploy/qa-artifacts/host-qa-run-2026-04-20.json`

## Host #5 (optional)

- URL: `http://127.0.0.1:5173/embed-host-qa.html?theme=dark`
- Browser/version: Chromium `147.0.7727.15` (local live run)
- Theme/background type: dark portal background
- Result: PASS
- Notes:
  - Widget opens correctly, readable contrast on dark theme, install-health: `ok/widget_ready`.
  - Evidence:
    - `deploy/qa-artifacts/host5_dark.png`
    - `deploy/qa-artifacts/host-qa-run-2026-04-20.json`

## Per-host mandatory checks

1. open/close
2. drag (collapsed + expanded)
3. state machine: idle/listening/thinking/speaking/error
4. voice fallback (mic deny/autoplay blocked/TTS unavailable)
5. contrast/readability
6. CSP behavior + install-health diagnostics

Status summary:

- `open/close`: PASS on hosts #1/#2/#3/#4/#5.
- `drag (collapsed + expanded)`: requires final human hand-check in visible browser UI (not fully covered by this assisted run).
- `state machine idle/listening/thinking/speaking/error`: partially blocked in local SQLite runtime because of `set_config(...)` calls (requires Postgres-backed run for full sign-off).
- `voice fallback`: pending final manual pass on Postgres-backed env (same blocker as state machine).
- `contrast/readability`: PASS on warm + dark host pages (#4/#5).
- `CSP + install-health diagnostics`: PASS (`ok` on allow, explicit `error/widget_iframe_timeout` on blocked).

## Final decision

- Ready for production: NO
- Blockers:
  - Full state/voice checklist still needs Postgres-backed validation pass.
- Follow-up tickets:
  - Re-run host QA matrix in Postgres-backed staging (include drag + voice fallback hand-check).
