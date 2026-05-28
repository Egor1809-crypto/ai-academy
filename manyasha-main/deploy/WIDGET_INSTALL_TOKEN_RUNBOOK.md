# Widget Install Token Runbook

## Roles

- **Product Owner (partner onboarding)**:
  - подтверждает домен партнёра и `site_key`;
  - согласует окно ротации токена.
- **DevOps/SRE (platform owner)**:
  - обновляет `WIDGET_PARTNER_DOMAIN_ALLOWLIST` и `WIDGET_PARTNER_SITE_KEYS`;
  - выпускает/ротирует `install_token`;
  - контролирует install-health алерты.
- **Support/Success**:
  - проверяет, что embed на сайте партнёра в статусе `ok`;
  - эскалирует при `error` кодах.

## Standard Flow (Issue)

1. Добавить домен партнёра в `WIDGET_PARTNER_DOMAIN_ALLOWLIST`.
2. Добавить `site_key` партнёра в `WIDGET_PARTNER_SITE_KEYS`.
3. Выпустить токен:

```bash
python scripts/widget_install_token_ops.py issue \
  --api-base https://YOUR-API-DOMAIN \
  --partner-id PARTNER_UUID_OR_DEFAULT \
  --site-key partner-site-main \
  --origin https://partner-site.example \
  --install-secret "$WIDGET_INSTALL_PROVISION_KEY" \
  --ttl-seconds 900
```

4. Передать партнёру `site_key`, `install_token`, `embed_contract_version`.
5. Проверить install-health:

```bash
python scripts/widget_install_token_ops.py health \
  --api-base https://YOUR-API-DOMAIN \
  --pid PARTNER_UUID_OR_DEFAULT \
  --site-key partner-site-main \
  --install-token "<TOKEN>" \
  --origin https://partner-site.example \
  --embed-contract-version 1
```

## Rotation Policy

- **Регулярная ротация**: каждые 30 дней.
- **Внеплановая ротация**:
  - утечка токена;
  - смена домена партнёра;
  - инцидент с `install_token_invalid` / `install_token_origin_mismatch`.
- **TTL токена**:
  - рекомендуемый: `900` секунд;
  - максимум: `86400` секунд.

## Who / How / When (Operational Ownership)

- **Кто выпускает**: DevOps/SRE on-duty или platform owner.
- **Кто инициирует**: Product Owner (новый партнёр) или Support (инцидент/утечка).
- **Когда**:
  - onboarding нового партнёра;
  - плановая ротация раз в 30 дней;
  - внепланово в течение 15 минут после security-инцидента.
- **Как фиксируем**:
  - тикет в трекере с `partner_id`, `site_key`, `origin`, `expires_at`;
  - ссылка на проверку `widget-install-health` после выпуска;
  - отметка о завершении ротации на стороне партнёра.

## Rotation Procedure

1. Выпустить новый токен (`issue`).
2. Проверить `widget-install-health` с новым токеном.
3. Обновить токен на стороне партнёра.
4. Наблюдать 30 минут:
  - `manaya_widget_install_health_total{status="error"}` не растёт;
  - нет алертов по install-health.
5. Отозвать старый токен (фактически истечением TTL и удалением в интеграции).

## Monthly Drill (mandatory)

Проводить минимум 1 раз в месяц, фиксировать артефакт в тикете дежурной смены.

```bash
python scripts/install_token_rotation_drill.py \
  --api-base https://YOUR-API-DOMAIN \
  --partner-id PARTNER_UUID_OR_DEFAULT \
  --pid PARTNER_UUID_OR_DEFAULT \
  --site-key partner-site-main \
  --origin https://partner-site.example \
  --install-secret "$WIDGET_INSTALL_PROVISION_KEY" \
  --ttl-seconds 900 \
  --embed-contract-version 1 \
  --observe-seconds 600 \
  --out-dir deploy/drills
```

Критерий `PASS`:

- токен выпускается с `2xx`;
- install-health после ротации в статусе `ok` или `warn`;
- за окно наблюдения нет перехода в `error`.

## Incident Response

- `origin_not_allowlisted`:
  - проверить `Origin/Referer` в запросах;
  - обновить allowlist партнёра.
- `site_key_not_registered`:
  - сверить `data-site-key` на странице с конфигом сервера.
- `install_token_invalid` / `install_token_expired`:
  - перевыпустить токен и заменить на сайте партнёра.
- `widget_iframe_timeout` / `widget_iframe_error`:
  - проверить CSP (`frame-src`, `script-src`, `connect-src`);
  - проверить `data-widget-origin`.
