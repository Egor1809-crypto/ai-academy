# Embed Release & Rollback Playbook

## Scope

Документ определяет релизный процесс embed-виджета Маняши:

- версионирование контракта;
- совместимость (browser/CSP);
- rollback-процедуру;
- каналы коммуникации для партнёров.

## Versioning Policy

1. Используем semver для embed runtime (`major.minor.patch`).
2. `major`:
   - breaking changes embed contract;
   - изменение обязательных параметров установки.
3. `minor`:
   - новые фичи без ломки совместимости.
4. `patch`:
   - bugfix/perf/security без изменения контракта.

## Contract Rules

1. Параметр `embed_contract_version` обязателен для контролируемых интеграций.
2. Backend должен поддерживать как минимум:
   - текущую (`N`);
   - предыдущую (`N-1`) версию контракта.
3. Удаление поддержки `N-1` только после:
   - уведомления партнёров;
   - подтверждения миграции;
   - завершения grace period.

## Compatibility Matrix (minimum)

Перед релизом фиксируем smoke-результаты для:

1. Chromium (desktop)
2. WebKit (desktop Safari class)
3. WebKit mobile (iOS profile)
4. CSP allow scenario
5. CSP blocked scenario (ожидаем явный install-health error)

## Release Checklist

1. CI green:
   - backend security suite;
   - e2e state/voice/embed/security.
2. `widget-install-health` без новых error-кодов регрессий.
3. Ручной QA по `deploy/WIDGET_HOST_QA_MATRIX.md`.
4. Обновлён changelog релиза (что изменилось и что нужно партнёру).
5. Алерты install-health активны и доставляются в on-call канал.

## Rollback Triggers

Выполняем rollback при любом из условий:

1. рост `status=error` по install-health выше аварийного порога;
2. массовый `widget_iframe_timeout`/`widget_iframe_error`;
3. критичный security/regression bug на проде;
4. деградация UX (виджет не открывается/не отвечает) у >X% партнёров.

## Rollback Procedure

1. Freeze новых rollout.
2. Переключить runtime на предыдущий стабильный image/tag.
3. Откатить `embed_contract_version` в конфиге до предыдущего поддерживаемого.
4. Проверить:
   - `/api/manyasha/widget-install-health`;
   - e2e smoke (chromium + webkit-mobile).
5. Сообщить партнёрам о rollback и ETA исправления.

## Communication Template

1. Что сломалось (1-2 строки, без размытых формулировок).
2. Кого затронуло (сегмент/домены).
3. Временный статус (rollforward/rollback).
4. ETA следующего апдейта.
5. Технические действия для партнёра (если нужны).
