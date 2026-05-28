# Manyasha Staging Runbook

Цель: поднять staging-стенд Маняши так, чтобы проверить реальный embed-flow до production signoff. Staging не является production: секреты, домены и токены должны быть отдельными.

## 1. Preconditions

Подготовьте до запуска:

- staging domain для host-site, например `https://staging.example.ru`;
- backend/API URL, например `https://api-staging.example.ru`;
- widget origin, если отличается от backend, например `https://widget-staging.example.ru`;
- PostgreSQL и Redis;
- `NAVY_API_KEY` в secret store/CI, не в git и не в скриншотах;
- prod-like secrets для JWT, encryption, widget auth и install token;
- CORS allowlist для staging-доменов;
- partner id или `default` только если это осознанный staging-сценарий;
- `site_key` для staging host-site;
- доступ к логам API и install-health метрикам.

## 2. Required Env

Минимальный staging profile:

```env
APP_ENV=staging
DATABASE_URL=<postgres-url>
REDIS_URL=<redis-url>
JWT_SECRET=<staging-jwt-secret>
ENCRYPTION_KEY=<staging-encryption-key>
WIDGET_AUTH_SECRET=<staging-widget-auth-secret>
WIDGET_INSTALL_SIGNING_SECRET=<staging-install-signing-secret>
WIDGET_INSTALL_PROVISION_KEY=<staging-install-provision-secret>
WIDGET_CONTEXT_REQUIRE_INSTALL=true
WIDGET_CAPTCHA_REQUIRED=true
WIDGET_CAPTCHA_SECRET=<staging-captcha-secret>
CORS_ALLOW_ORIGINS=https://staging.example.ru,https://widget-staging.example.ru
CORS_ALLOW_NULL_ORIGIN=false
WIDGET_PARTNER_DOMAIN_ALLOWLIST=default:staging.example.ru
WIDGET_PARTNER_SITE_KEYS=default:staging-main
MANYASHA_LLM_PROVIDER=navy
NAVY_API_KEY=<staging-navy-api-key>
MANYASHA_CHAT_LLM_TIMEOUT_SECONDS=12.0
MANYASHA_DEMO_FAST_MODE=false
MANYASHA_EMBED_CONTRACT_VERSION=1
MANYASHA_EMBED_SUPPORTED_CONTRACT_VERSIONS=1
INTERNAL_METRICS_SERVICE_TOKEN=<staging-metrics-token>
ALERT_WEBHOOK_URL=<staging-alert-webhook>
```

Правила:

- не включать `demo_mode` через env;
- не использовать dev secrets;
- не ставить `WIDGET_CONTEXT_REQUIRE_INSTALL=false`;
- не добавлять `*` в `CORS_ALLOW_ORIGINS`;
- не хранить реальные значения в репозитории.

## 3. Validate Staging Env

Staging runtime должен работать с `APP_ENV=staging`. Если нужно переиспользовать strict production validator как dry-run для prod-like staging values, запускайте его с `APP_ENV=production` только в этой локальной проверке. Не переносите это значение в staging runtime env.

```bash
APP_ENV=production \
DATABASE_URL='<postgres-url>' \
REDIS_URL='<redis-url>' \
JWT_SECRET='<staging-jwt-secret>' \
ENCRYPTION_KEY='<staging-encryption-key>' \
WIDGET_AUTH_SECRET='<staging-widget-auth-secret>' \
WIDGET_INSTALL_SIGNING_SECRET='<staging-install-signing-secret>' \
WIDGET_INSTALL_PROVISION_KEY='<staging-install-provision-secret>' \
WIDGET_CONTEXT_REQUIRE_INSTALL=true \
WIDGET_CAPTCHA_REQUIRED=true \
WIDGET_CAPTCHA_SECRET='<staging-captcha-secret>' \
CORS_ALLOW_ORIGINS='https://staging.example.ru,https://widget-staging.example.ru' \
CORS_ALLOW_NULL_ORIGIN=false \
WIDGET_PARTNER_DOMAIN_ALLOWLIST='default:staging.example.ru' \
WIDGET_PARTNER_SITE_KEYS='default:staging-main' \
MANYASHA_LLM_PROVIDER=navy \
NAVY_API_KEY='<staging-navy-api-key>' \
MANYASHA_CHAT_LLM_TIMEOUT_SECONDS=12.0 \
MANYASHA_DEMO_FAST_MODE=false \
MANYASHA_EMBED_SUPPORTED_CONTRACT_VERSIONS=1 \
INTERNAL_METRICS_SERVICE_TOKEN='<staging-metrics-token>' \
ALERT_WEBHOOK_URL='<staging-alert-webhook>' \
python scripts/validate_prod_env.py
```

Ожидание: `PROD_ENV_OK`. Значения секретов не копируйте в отчёт, сохраняйте только факт прохождения. После dry-run убедитесь, что в реальном staging env снова задано `APP_ENV=staging`.

## 4. Issue Install Token

Выпуск через helper script:

```bash
python scripts/widget_install_token_ops.py issue \
  --api-base https://api-staging.example.ru \
  --partner-id PARTNER_UUID_OR_DEFAULT \
  --site-key staging-main \
  --origin https://staging.example.ru \
  --install-secret "$WIDGET_INSTALL_PROVISION_KEY" \
  --ttl-seconds 900
```

Альтернативно через HTTP-запрос, если helper недоступен:

```bash
curl -sS -X POST 'https://api-staging.example.ru/api/manyasha/widget-install-token' \
  -H 'Content-Type: application/json' \
  -H "X-Widget-Install-Secret: $WIDGET_INSTALL_PROVISION_KEY" \
  -d '{
    "partner_id": "PARTNER_UUID_OR_DEFAULT",
    "site_key": "staging-main",
    "origin": "https://staging.example.ru",
    "ttl_seconds": 900
  }'
```

Сохраните `install_token` в staging secret store или временно в защищённом deploy ticket. Не вставляйте токен в публичные логи и скриншоты.

## 5. Build Staging Embed URL

Для preview/debug URL:

```text
https://widget-staging.example.ru/mascot-design-preview.html?api_origin=https%3A%2F%2Fapi-staging.example.ru&embed_contract_version=1&site_key=staging-main&install_token=<INSTALL_TOKEN>&instance=staging-smoke-YYYYMMDD-HHMM
```

Для внешнего host-site script используйте тот же контракт:

```html
<script
  src="https://widget-staging.example.ru/embed.js?api_origin=https%3A%2F%2Fapi-staging.example.ru&embed_contract_version=1"
  data-pid="PARTNER_UUID_OR_DEFAULT"
  data-site-key="staging-main"
  data-install-token="<INSTALL_TOKEN>"
  data-instance="staging-smoke-YYYYMMDD-HHMM"
  async>
</script>
```

Параметры:

- `api_origin` должен указывать на staging API;
- `site_key` должен совпадать с `WIDGET_PARTNER_SITE_KEYS`;
- `install_token` должен быть выпущен для того же `partner_id`, `site_key` и origin;
- `embed_contract_version=1` обязателен;
- `instance` делайте уникальным на каждый smoke.

## 6. Install-Health Check

Через helper:

```bash
python scripts/widget_install_token_ops.py health \
  --api-base https://api-staging.example.ru \
  --pid PARTNER_UUID_OR_DEFAULT \
  --site-key staging-main \
  --install-token '<INSTALL_TOKEN>' \
  --origin https://staging.example.ru \
  --embed-contract-version 1
```

Через curl:

```bash
curl -sS 'https://api-staging.example.ru/api/manyasha/widget-install-health?pid=PARTNER_UUID_OR_DEFAULT&site_key=staging-main&install_token=<INSTALL_TOKEN>&embed_contract_version=1' \
  -H 'Origin: https://staging.example.ru'
```

Ожидание:

- `status`: `ok` или допустимый `warn`;
- ключевой код готовности API: `widget_install_ready` или эквивалентный successful install-health result;
- нет `origin_not_allowlisted`, `site_key_not_registered`, `install_token_invalid`, `install_token_origin_mismatch`.

## 7. Smoke Checklist

Backend/API:

- `curl -fsS https://api-staging.example.ru/healthz` возвращает lightweight liveness `{"status":"ok"}`;
- `curl -fsS https://api-staging.example.ru/readyz` возвращает HTTP `200` и `{"status":"ready", ...}`;
- если `/readyz` вернул HTTP `503`, открыть JSON `checks` и устранить конкретную dependency-причину до smoke;
- API logs не показывают missing secret/config errors;
- Navy path работает или fallback срабатывает в допустимый timeout.

Widget/embed:

- iframe виджета открывается на staging host-site;
- install-health в UI не показывает техническую ошибку;
- install-health API возвращает `ok/widget_install_ready` или допустимый `warn`;
- normal question отправляется через `/api/manyasha/chat`;
- первый ответ содержит `reply` и `speech_reply`;
- demo prepared answers не используются без `demo_mode=1`;
- voice optional: если включили голос, waiting phrase/main reply работают; если звук выключен, TTS не вызывается;
- нет самопроизвольной речи;
- нет page-level horizontal overflow на 320px;
- manual consult modal открывается;
- auto-consult не появляется после каждого ответа;
- пользователь не видит raw `Failed to fetch`, `install_health_failed` или stack/debug text.

Suggested commands from local workstation:

```bash
PLAYWRIGHT_BASE_URL=https://staging.example.ru \
PLAYWRIGHT_API_URL=https://api-staging.example.ru \
npx playwright test tests/e2e/widget-embed-smoke.spec.ts --project=chromium
```

Если staging недоступен из Playwright окружения, выполните smoke вручную и приложите evidence.

## 8. Health vs Readiness

`/healthz` — liveness endpoint. Он отвечает только на вопрос: процесс API жив и может принять HTTP-запрос.

`/readyz` — readiness endpoint. Он отвечает на вопрос: API готов обслуживать staging/prod трафик с реальными зависимостями.

Safe пример формы ответа `/readyz` без секретов:

```json
{
  "status": "ready",
  "checks": {
    "database": {
      "status": "ok",
      "code": "database_ready",
      "message": "Database connection is ready."
    },
    "redis": {
      "status": "ok",
      "code": "redis_ready",
      "message": "Redis connection is ready."
    },
    "provider": {
      "status": "ok",
      "code": "provider_ready",
      "message": "Navy provider config is ready."
    }
  }
}
```

Правило smoke: `/healthz` должен быть зелёным почти всегда, а `/readyz` обязан быть зелёным перед external embed smoke. В staging/production `not_ready` — это blocker.

## 9. Readyz Troubleshooting

Если `/readyz` вернул `503`:

- `checks.database.code=database_unavailable`:
  проверьте `DATABASE_URL`, доступность Postgres, миграции, network/security group и логи API. Не включайте `MANAYA_USE_CREATE_ALL` как быстрый фикс для staging/prod.
- `checks.redis.code=redis_url_missing`:
  в staging/prod задайте `REDIS_URL`. Redis optional только для dev/test сценариев.
- `checks.redis.code=redis_unavailable` или `redis_client_unavailable`:
  проверьте Redis endpoint, пароль/TLS, DNS, network/security group и что контейнер API видит Redis.
- `checks.provider.code=navy_api_key_missing`:
  если `MANYASHA_LLM_PROVIDER=navy`, добавьте `NAVY_API_KEY` в secret store/CI env. Не вставляйте ключ в код, HTML или screenshots.
- `checks.provider.code=provider_invalid`:
  используйте один из допустимых providers: `navy`, `ollama`, `gemini`, `auto`.
- unsafe prod flags:
  если strict env validator падает на `DEV_AUTH_ENABLED`, `DEV_STORAGE_ENABLED`, `WIDGET_CONTEXT_REQUIRE_INSTALL`, `CORS_ALLOW_ORIGINS` или captcha flags, исправьте env и повторите validator до запуска smoke.

После исправления причины повторите:

```bash
curl -fsS https://api-staging.example.ru/healthz
curl -fsS https://api-staging.example.ru/readyz
```

## 10. Evidence To Save

Сохраните в deploy/staging ticket:

- timestamp и timezone;
- commit hash/tag image;
- env profile name: `staging`;
- API domain и widget/host domain;
- `/healthz` result;
- `/readyz` status and checks summary;
- `partner_id`/`pid` и `site_key` без secret values;
- install token `expires_at`, но не сам токен;
- install-health status/code summary;
- screenshots или короткое видео: open widget, normal chat, install-health ok;
- test command summary: passed/failed counts;
- backend log excerpt без секретов;
- known warnings и решение: proceed/rollback/fix.

## 11. Rollback

Если smoke failed:

1. Откатить image tag:

```bash
docker compose --env-file .env -f docker-compose.prod.yml pull api worker
docker compose --env-file .env -f docker-compose.prod.yml up -d api worker
```

или явно вернуть предыдущие `IMAGE_API` / `IMAGE_WORKER` в staging `.env`.

2. Временно отключить виджет для staging domain:

- убрать domain из `WIDGET_PARTNER_DOMAIN_ALLOWLIST`; или
- убрать `site_key` из `WIDGET_PARTNER_SITE_KEYS`; или
- заменить embed на maintenance stub на host-site.

3. Если token мог утечь:

- перевыпустить `WIDGET_INSTALL_SIGNING_SECRET` только при подтверждённой утечке signing secret;
- в обычном случае выпустить новый `install_token` и дождаться истечения старого TTL;
- обновить token на host-site;
- повторить install-health.

## 12. Security Notes

- Staging secrets не равны production secrets.
- Не публиковать `install_token`, `NAVY_API_KEY`, JWT/encryption/install secrets в screenshots, видео, GitHub comments и CI logs.
- TTL install token для staging smoke: обычно `900` секунд.
- Staging не заменяет production signoff.
- Production signoff отдельно требует green security evidence, Postgres-backed proof, install token drill и финальное approval.
