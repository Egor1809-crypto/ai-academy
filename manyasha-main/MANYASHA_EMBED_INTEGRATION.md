# Manyasha Embed Integration

## Quick Start

Добавьте один script перед `</body>` на сайте партнёра:

```html
<script
  src="https://YOUR-DOMAIN/embed.js?id=PARTNER_UUID"
  data-instance="manyasha-main"
  data-side="right"
  data-size="large"
  data-start-open="false"
  data-launcher="avatar"
  data-offset-x="18"
  data-offset-y="18"
  data-site-key="partner-site-main"
  data-install-token="eyJ...signed..."
  data-embed-contract-version="1"
  defer
></script>
```

## Programmatic Control

После загрузки script доступен глобальный API:

```js
window.ManyashaWidget.open('manyasha-main');
window.ManyashaWidget.close('manyasha-main');
window.ManyashaWidget.toggle('manyasha-main');

const widget = window.ManyashaWidget.get('manyasha-main');
widget.setPid('ANOTHER_PARTNER_UUID');
widget.getInstallHealth(); // { status, code, message, updatedAt }
```

## Supported Config (`data-*`)

- `data-pid` / `id` in URL: partner id (UUID or key)
- `data-instance`: instance key (`manyasha-main`, `manyasha-sales`, ...)
- `data-side`: `left` | `right`
- `data-size`: `compact` | `medium` | `large`
- `data-start-open`: `true` | `false`
- `data-launcher`: `avatar` | `text`
- `data-offset-x`: horizontal offset in px
- `data-offset-y`: vertical offset in px
- `data-z-index`: default `2147483000`
- `data-auto-open-ms`: auto-open delay in milliseconds
- `data-api-origin`: override API origin (optional)
- `data-widget-origin`: override widget origin (optional)
- `data-widget-path`: widget base path (optional)
- `data-site-key`: partner site key (for protected install)
- `data-install-token`: signed install token (for protected install)
- `data-embed-contract-version`: embed contract version (defaults to current server version)

## URL Query Options (`embed.js?....`)

Все основные параметры можно передать и query-параметрами:

```html
<script src="https://YOUR-DOMAIN/embed.js?id=PARTNER_UUID&size=large&side=right&startOpen=false"></script>
```

## Готовый переносимый дев-стенд для проверки (локально и на любом dev)

Используй:

```text
https://<любая-площадка>/frontend/public/embed-external-dev.html?api_origin=https://api.partner.local:8000&widget_origin=https://widget.partner.local:5173&pid=PARTNER_UUID&site_key=partner-site-main&embed_contract_version=1&instance=bankruptcy-ext
```

Есть еще короче через копию URL страницы:

`https://<любая-площадка>/frontend/public/embed-external-dev.html` → заполни поля, жми `Копировать URL перенос`, вставляй на любой другой host для быстрого smoke-проверки.

Что это даёт:

- автоматически подставляет origin’ы под текущий URL;
- показывает готовый snippet для копипасты;
- позволяет быстро проверить `open/close/drag/getInstallHealth` на новом домене без редактирования HTML;
- помогает отладить CSP (скрипт и iframe) на реальном сайте.

Дополнительные query-параметры:

- `install_token` — передаваемый токен (для защищенного режима);
- `size` — `compact|medium|large`;
- `side` — `left|right`.

Для интеграции в прод:

1. Открыть `embed-external-dev.html` на целевом дев-стенде и заполнить поля (или передать их через query).
2. Скопировать сгенерированный snippet в шаблон сайта партнёра.
3. После деплоя проверить:
   - `window.ManyashaWidget.get('<instance>').getInstallHealth().status === "ok"`;
   - отсутствует `error/widget_iframe_error` / `error/widget_iframe_timeout`;
   - `open/close/drag` проходят стабильно на мобильном Safari + Chrome.

## Notes

- Виджет работает в `iframe`, поэтому стили сайта-хоста не ломают интерфейс Маняши.
- Для сайтов с жёстким CSP нужно разрешить загрузку скрипта/iframe с вашего домена.
- Для нескольких виджетов на одной странице используйте разные `data-instance`.
- Диагностика установки доступна через `/api/manyasha/widget-install-health` и `widget.getInstallHealth()`.

## Widget Runtime Modules

Внутренний runtime виджета разделён на отдельные файлы (вместо одного giant inline-script):

- `frontend/public/widget/widget-core.js` — основной жизненный цикл, чат, voice, drag, handoff.
- `frontend/public/widget/widget-api.js` — API origin resolution + fetch retry/fallback.
- `frontend/public/widget/widget-state.js` — state machine (`idle/listening/thinking/speaking/error`) с anti-jitter.
- `frontend/public/widget/widget-a11y.js` — ARIA/keyboard baseline и focus-trap.
- `frontend/public/widget/widget-ui.js` — тизерный UI цикл и вспомогательные микро-взаимодействия.
- `frontend/public/widget/widget-consult.js` — форма консультации и submit flow.

## CSP Requirements

Минимально для стабильного embed:

```http
Content-Security-Policy:
  script-src 'self' https://YOUR-API-DOMAIN;
  frame-src https://YOUR-WIDGET-DOMAIN;
  connect-src 'self' https://YOUR-API-DOMAIN https://YOUR-WIDGET-DOMAIN;
  img-src 'self' data: https://YOUR-API-DOMAIN https://YOUR-WIDGET-DOMAIN;
```

Если `frame-src` блокирует домен виджета, `getInstallHealth()` вернёт `error/widget_iframe_timeout` или `error/widget_iframe_error`.

## Install Health

Проверка backend-конфига:

```bash
curl "https://YOUR-API-DOMAIN/api/manyasha/widget-install-health?pid=...&site_key=...&install_token=..."
```

Проверка из host-страницы после загрузки:

```js
const api = window.ManyashaWidget.get('manyasha-main');
console.log(api.getInstallHealth());
// { status, code, message, updatedAt }
```

## Partner Checklist

1. `site_key` зарегистрирован в `WIDGET_PARTNER_SITE_KEYS`.
2. Домен партнёра есть в `WIDGET_PARTNER_DOMAIN_ALLOWLIST` (или используется валидный `install_token`).
3. `install_token` выпущен `/api/manyasha/widget-install-token` и не просрочен.
4. `data-embed-contract-version` совпадает с серверным контрактом.
5. CSP разрешает script/frame/connect для доменов виджета и API.
6. `widget.getInstallHealth().status === "ok"` на рабочей странице.

## Monitoring & Alerts

Основные метрики install-health (Prometheus):

- `manaya_widget_install_health_total{status,code}`
- `manaya_widget_install_health_check_total{name,status,code}`

Рекомендуемые сигналы:

- error burst: `sum(increase(manaya_widget_install_health_total{status="error"}[10m]))`
- error ratio: `sum(rate(manaya_widget_install_health_total{status="error"}[10m])) / sum(rate(manaya_widget_install_health_total[10m]))`
- origin issues: `...check_total{name="origin",code="origin_not_allowlisted"}`
- install-token issues: `...check_total{name="install_token",code=~"..."}`

## Final Acceptance Checklist (Partner Go-Live)

1. Скрипт embed подключается внизу страницы (`defer`) и не блокируется CSP.
2. `frame-src`, `script-src`, `connect-src`, `img-src` включают нужные домены API/виджета.
3. В конфиге скрипта переданы `data-site-key`, `data-install-token`, `data-embed-contract-version`.
4. Вызов `/api/manyasha/widget-install-health` даёт `status=ok` на реальном домене.
5. В браузере `window.ManyashaWidget.get('<instance>').getInstallHealth().status === "ok"`.
6. Сценарий blocked CSP предсказуем: `widget_iframe_timeout`/`widget_iframe_error` виден в диагностике.
7. Ротация `install_token` проверена по runbook минимум 1 раз до запуска.
8. Графана-панели install-health и алерты активны до production rollout.

## Быстрый чеклист переноса виджета на другой сайт (DEV → PROD)

1. Подготовь параметры партнёра:
   - `pid` (UUID или ключ партнёра),
   - `site_key` (например, `partner-site-main`),
   - `WIDGET_PARTNER_SITE_KEYS` в API,
   - `WIDGET_PARTNER_DOMAIN_ALLOWLIST` (домен(а) сайта).
2. Выпусти `install_token` через `/api/manyasha/widget-install-token` (TTL и secret на проде обязательны).
3. Проверка контрактного совпадения:
   - `data-embed-contract-version` должен совпадать с серверным `MANYASHA_EMBED_CONTRACT_VERSION`
   - и/or `MANYASHA_EMBED_SUPPORTED_CONTRACT_VERSIONS`.
4. На сайт-клиент вставь `embed.js` одним инстансом:
   - `src="https://API-DOMAIN/embed.js?id=PID"`
   - `data-site-key="..."`
   - `data-install-token="..."`
   - `data-api-origin="https://API-DOMAIN"`
   - `data-widget-origin="https://WIDGET-FRONT-DOMAIN"` (если CDN/другой хост UI).
5. Для проверки после деплоя:
   - открыть `window.ManyashaWidget.get('<instance>').getInstallHealth()`
   - должен быть `status: "ok"` и понятный `code`.
   - если `error`: свериться с `code` (`site_key_required`, `install_token_required`, `origin_not_allowlisted`, `embed_contract_unsupported`).
6. Прогони e2e/smoke сценарии:
   - `open` / `close` / `toggle`,
   - `drag`,
   - адаптация на 320–390 ширину,
   - `widget_iframe_timeout/error` не должно сыпаться при живом CSP.
7. Проверь CSP сайта:
   - `script-src` разрешает `.../embed.js`
   - `frame-src` разрешает домен `widget-origin`
   - `connect-src` разрешает API для `/api/manyasha/*`
   - `img-src` и `media-src` для ассетов в `mascot/`.
8. Прогон на 3–5 real hosts (тёмный/светлый/контрастный фон) + mobile Safari/Chrome.
9. Оформи ротацию install-token (не реже ежемесячно или по SLA) и документируй процедуру.
10. После релиза включи алертинг на `manaya_widget_install_health_total{status="error"}` и `...check_total{name="origin"}`.

## Troubleshooting

- `embed_contract_unsupported`: версия контракта не совпадает, обновите `data-embed-contract-version`.
- `site_key_required`: передайте `data-site-key` (если origin не allowlisted).
- `site_key_not_registered`: добавьте ключ в `WIDGET_PARTNER_SITE_KEYS`.
- `install_token_required`: выпустите токен и передайте `data-install-token`.
- `install_token_invalid` / `install_token_expired`: перевыпустите токен.
- `install_token_origin_mismatch`: токен выпущен для другого origin.
- `origin_not_allowlisted`: добавьте домен в `WIDGET_PARTNER_DOMAIN_ALLOWLIST`.
- `widget_iframe_timeout` / `widget_iframe_error`: проверьте `frame-src`, `widget_origin`, сетевую доступность.

## Operations Pack

Сопутствующие документы для production readiness:

- `deploy/EMBED_RELEASE_ROLLBACK_PLAYBOOK.md`
- `deploy/WIDGET_INSTALL_TOKEN_RUNBOOK.md`
- `deploy/WIDGET_HOST_QA_MATRIX.md`
- `deploy/WIDGET_HOST_QA_RESULTS_TEMPLATE.md`
- `deploy/SECURITY_SIGNOFF_CHECKLIST.md`
- `deploy/POST_RELEASE_STABILITY_PLAN.md`
