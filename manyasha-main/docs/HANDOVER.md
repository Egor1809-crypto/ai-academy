# Handover Маняши

Статус: `v0.1.0-rc1 local RC`
Дата: 2026-04-29
Коммит regression-прогона: `bb42793`
Production-статус: не production-ready.

## Быстрый запуск локально

Backend:

```bash
env APP_ENV=development \
  DATABASE_URL=sqlite:///./backend-local.db \
  REDIS_URL= \
  JWT_SECRET=dev_jwt_secret_change_me \
  WIDGET_AUTH_SECRET=dev_widget_auth_secret \
  WIDGET_CONTEXT_REQUIRE_INSTALL=false \
  CORS_ALLOW_ORIGINS=http://127.0.0.1:5174,http://localhost:5174 \
  CORS_ALLOW_NULL_ORIGIN=true \
  MANYASHA_LLM_PROVIDER=ollama \
  MANYASHA_CHAT_LLM_TIMEOUT_SECONDS=4.2 \
  ./.venv311/bin/uvicorn app:app --host 127.0.0.1 --port 8000
```

Frontend:

```bash
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5174
```

Normal URL:

```text
http://127.0.0.1:5174/mascot-design-preview.html?api_origin=http://127.0.0.1:8000&embed_contract_version=1
```

Demo URL:

```text
http://127.0.0.1:5174/mascot-design-preview.html?api_origin=http://127.0.0.1:8000&embed_contract_version=1&demo_mode=1
```

Partner dashboard:

```text
http://127.0.0.1:5174/partner/leads
http://127.0.0.1:5174/partner/mascot
http://127.0.0.1:5174/partner/rpg
http://127.0.0.1:5174/partner/analytics
```

## Финальные проверки RC

```bash
npm --prefix frontend run build
```

```bash
PYTHONPATH=$PWD ./.venv311/bin/pytest -q -c /dev/null \
  tests/test_manyasha_chat_timeout.py \
  tests/test_handoff_lead_inbox.py \
  tests/test_client_report_email.py \
  tests/test_readyz.py \
  tests/test_widget_install_health.py \
  tests/test_validate_prod_env.py \
  tests/test_rpg_rls.py
```

```bash
npx playwright test tests/e2e/widget-mode-regression.spec.ts --project=chromium
npx playwright test tests/e2e/widget-voice-edge.spec.ts --project=chromium
npx playwright test tests/e2e/widget-state-machine.spec.ts --project=chromium
npx playwright test tests/e2e/widget-embed-smoke.spec.ts --project=chromium
npx playwright test tests/e2e/partner-dashboard.spec.ts --project=chromium
npm --prefix frontend audit --audit-level=high
```

Ожидаемые результаты local RC:

- Frontend build: passed.
- Backend pytest: 78/78.
- Widget mode: 8/8.
- Voice edge: 12/12.
- State machine: 3/3.
- Embed smoke: 5/5.
- Partner dashboard: 8/8.
- npm audit high: 0 vulnerabilities.

## Что важно не перепутать

- `demo_mode=1` использует prepared demo answers и не должен вызывать normal chat API для prepared demo answers.
- Normal mode должен использовать `/api/manyasha/chat` и не должен использовать demo prepared answers.
- Browser `speechSynthesis.speak` должен оставаться неиспользуемым для голоса Маняши.
- Голос не должен запускаться on open/idle; TTS стартует только после user action.
- Legacy email capture panel удалён; client report email остаётся только внутри explicit report card flow.
- Client report email работает только через explicit-send и требует consent/session validation.
- LeadInbox/Case Workspace partner-scoped; нельзя раскрывать raw chat history, raw report text, install tokens или API secrets.

## Известные блокеры local RC

Они блокируют production signoff:

1. External staging evidence pending.
2. Postgres-backed Alembic migration evidence pending.

Local RC можно использовать для demo, QA и product review. Нельзя называть его production-ready.

## Следующие действия владельца

1. Собрать staging inputs из `docs/STAGING_INPUTS_CHECKLIST.md`.
2. Запустить external staging evidence pack.
3. Запустить Postgres-backed Alembic upgrade/downgrade validation.
4. Только после успешного evidence обновить security signoff и готовить production release candidate.
