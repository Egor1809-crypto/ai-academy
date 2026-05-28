# Маняша v0.1.0-rc1 Local RC

Дата: 2026-04-29
Статус: `v0.1.0-rc1 local RC`
Коммит regression-прогона: `bb42793`
Production-статус: не production-ready до внешнего evidence.

## Что вошло в local RC

- Widget normal mode: starter-вопросы, contextual quick replies, diagnostic route card, client report, report email и consult gating.
- Widget demo mode: prepared demo flow без вызова normal chat API.
- Voice UX: голос включён по умолчанию после действия пользователя, mute/unmute работает без перезагрузки, нет spontaneous TTS, browser `speechSynthesis.speak` не используется.
- Backend answer quality: diagnostics-aware ответы, anti-repeat follow-up, relevance guard, weak-legal fallback guard, чистый `speech_reply`.
- Consult/handoff: diagnostics-aware handoff, lead quality packet, privacy whitelist.
- Operator LeadInbox: список, фильтры, сортировка, поиск, contact quick actions, status workflow, internal notes.
- Case Workspace: diagnostics, quality score, next best action, documents checklist, follow-up message builder, decision checklist, readiness gate, internal case summary/export.
- Client report: локальный diagnostic report, copy action, explicit-send report email endpoint.
- Hardening: focused `/partner/leads`, mobile/no-overflow coverage, legacy email capture panel удалён.

## Финальный regression

Выполнено 2026-04-29 после `bb42793`.

- Frontend build: passed.
- Backend pytest: passed, 78/78.
- Widget mode regression: passed, 8/8.
- Widget voice edge: passed, 12/12.
- Widget state machine: passed, 3/3.
- Widget embed smoke: passed, 6/6.
- Partner dashboard e2e: passed, 8/8.
- Frontend npm audit high: passed, 0 vulnerabilities.

Известные неблокирующие предупреждения:

- Vite предупреждает, что основной JS chunk больше 500 kB.
- В pytest output остаются FastAPI `on_event` deprecation warnings.
- Playwright логирует существующие `NO_COLOR`/`FORCE_COLOR` warnings.

## Privacy/Security заметки

- LeadInbox и Case Workspace показывают только whitelisted diagnostics.
- Partner-scoped доступ и обновления handoff tickets покрыты backend tests.
- Report email требует explicit consent/session validation в backend tests.
- LeadInbox report email summary использует masked email и не раскрывает raw report text.
- Internal case summary исключает raw chat history, install tokens, API keys, checksums и raw handoff context.
- Widget client report email отправляет только explicit `report_text` и whitelisted diagnostics.
- `/readyz`, install-health, prod env validator, RLS и widget install health tests проходят локально.
- Реальные секреты здесь не документируются.

## Что можно показывать локально

- Normal widget без `demo_mode=1`.
- Demo widget со стабильными prepared questions.
- Voice default-on flow с mute/unmute.
- Client diagnostics route card и preliminary report.
- Explicit report email form внутри report card.
- Manual consult modal и diagnostics-aware consult offer.
- Partner `/partner/leads` focused LeadInbox и Case Workspace.
- Status, notes, filters, search, documents checklist, follow-up message, readiness gate и internal summary export.

## Portable embed status

Baseline commit: `2912df1`.

- Clean shell: yes, `embed.js` грузит `widget.html` как отдельную оболочку виджета.
- Preview/landing inside iframe: no, `mascot-design-preview.html` остаётся dev/demo page.
- Accidental `demo_mode` leakage: no, portable embed не включает demo без явного параметра.
- Drag stable: yes, desktop drag проверен без дрожания и resize feedback loop.
- Close behavior: internal close inside Manyasha closes parent iframe and returns launcher.
- Install-health: `ok/widget_ready`.
- Mobile 390px: no horizontal overflow.
- Visual QA verdict: ready for demo.

Known low:

- На mobile 390px горизонтальный drag открытого виджета ограничен viewport. Это expected behavior: виджет почти занимает доступную ширину, при этом close/input/send/mic доступны и overflow отсутствует.

## Production-блокеры

Production заблокирован внешним evidence, а не локальными regression failures:

1. External staging evidence pending.
2. Postgres-backed Alembic migration evidence pending.

Не переводить RC в production-ready, пока оба блокера не закрыты evidence.

## Нужные staging inputs

Перед external staging evidence pack подтвердить inputs без коммита секретов:

- `STAGING_API_ORIGIN`
- `STAGING_HOST_ORIGIN`
- `PARTNER_ID`
- `SITE_KEY`
- `WIDGET_INSTALL_PROVISION_KEY`
- `DATABASE_URL` для staging Postgres
- `REDIS_URL` для staging Redis
- `NAVY_API_KEY`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `WIDGET_AUTH_SECRET`
- `WIDGET_INSTALL_SIGNING_SECRET`
- `CORS_ALLOW_ORIGINS`
- `WIDGET_PARTNER_DOMAIN_ALLOWLIST`
- `WIDGET_PARTNER_SITE_KEYS`
- deployed commit/image tag на `bb42793` или новее
- DNS/domain readiness

## Рекомендуемый следующий шаг

Если staging inputs доступны, запустить external staging evidence и Postgres Alembic validation.
Если staging inputs недоступны, считать `v0.1.0-rc1` только локальным demo/QA baseline.
