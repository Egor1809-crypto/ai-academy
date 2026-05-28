# Demo Walkthrough Маняши

Статус: `v0.1.0-rc1 local RC`
Дата: 2026-04-29

## Цель демо

Показать полный локальный продуктовый путь без заявления production readiness:

1. Виджет Маняши в normal mode.
2. Диагностика ситуации клиента.
3. Client report и explicit report email flow.
4. Consult/handoff с diagnostics metadata.
5. Operator LeadInbox и Case Workspace.

## Подготовка

1. Запустить backend на `http://127.0.0.1:8000`.
2. Запустить frontend на `http://127.0.0.1:5174`.
3. Открыть normal URL:

```text
http://127.0.0.1:5174/mascot-design-preview.html?api_origin=http://127.0.0.1:8000&embed_contract_version=1
```

4. Для стабильного scripted demo можно открыть demo URL:

```text
http://127.0.0.1:5174/mascot-design-preview.html?api_origin=http://127.0.0.1:8000&embed_contract_version=1&demo_mode=1
```

## Widget normal flow

Рекомендуемые вопросы:

1. `У меня 2 млн долгов`
2. `Приставы списывают`
3. `Работаю официально`
4. `Есть квартира в ипотеке`

Что показать:

- starter questions видны в normal mode.
- Normal starter/click идёт через `/api/manyasha/chat`.
- Contextual quick replies обновляются после ответов.
- Diagnostic route card появляется после достаточного количества данных.
- Progress, known facts, missing fields и next step видны.
- “Показать итог” создаёт предварительный client report локально.
- Копирование отчёта работает.
- “Отправить на email” открывает inline form только после explicit click.
- Голос включён по умолчанию после действия пользователя; mute/unmute работает без перезагрузки.
- Нет spontaneous TTS on open/idle.

## Widget demo flow

Открыть URL с `demo_mode=1`.

Что показать:

- demo prepared questions видны.
- prepared demo answer появляется без normal chat API.
- demo flow остаётся стабильным для презентации.
- Voice/animation flow не изменён.

## Consult/Handoff Flow

В normal mode после high-risk вводных вроде крупного долга, приставов и ипотеки:

- consult offer может появиться один раз и с причиной.
- manual button “Консультация юриста” всё ещё открывает modal.
- submitted lead включает whitelisted diagnostics metadata.
- raw localStorage/chat history/secrets не отправляются как lead packet.

## Partner dashboard flow

Open:

```text
http://127.0.0.1:5174/partner/leads
```

Что показать:

- `/partner/leads` открывает сразу focused LeadInbox/Case Workspace.
- Поиск, фильтры и priority sorting.
- Status workflow: `new`, `contacted`, `qualified`, `closed`.
- Internal operator note.
- Contact quick actions.
- Diagnostics summary и risk/quality badges.
- Блоки Case Workspace:
  - contact/status;
  - diagnostics;
  - quality score;
  - next best action;
  - documents checklist;
  - follow-up message builder;
  - decision checklist;
  - readiness gate;
  - internal case summary/export.

Privacy-пункты для проговаривания:

- report email masked в operator view.
- raw report text не раскрывается в LeadInbox.
- raw chat history не показывается.
- все выводы Case Workspace являются operational/preliminary, не legal guarantees.

## Что нельзя заявлять

- Не заявлять production-ready.
- Не заявлять, что staging пройден.
- Не заявлять, что Postgres Alembic evidence пройден.
- Не обещать списание долгов или юридический результат.

Production-блокеры остаются:

1. External staging evidence pending.
2. Postgres-backed Alembic migration evidence pending.
