# Manaya Deployment Guide

## Цель

Этот набор файлов поднимает продакшен-инфраструктуру Маняши в Yandex Cloud с учетом:

- 152-ФЗ: хранение данных в РФ
- KMS-шифрование данных и S3-объектов
- PostgreSQL с RLS
- object storage + CDN
- WebSocket, event-bus, worker-процессы
- sandbox/изоляция для FBX и PDF
- мониторинг TTFM, FPS и LLM timeout

## Структура

- [docker-compose.prod.yml](docker-compose.prod.yml): production stack
- [nginx.conf](nginx.conf): reverse proxy, SSL, WebSocket upgrade
- [terraform](terraform): Yandex Cloud infra
- [monitoring](monitoring): Prometheus, alerts, Grafana dashboards
- [.github/workflows/deploy.yml](.github/workflows/deploy.yml): CI/CD pipeline
- [app.py](app.py): ASGI entrypoint с `/metrics`, `/healthz`, `/ws/...`

## Профили окружения (dev / demo / prod)

В репозитории добавлены примеры:

- `.env.example` — локальная разработка (`APP_ENV=development`)
- `.env.demo.example` — стабильный demo-показ (`APP_ENV=demo`)
- `.env.prod.example` — production (`APP_ENV=production`)

Ключевые отличия профилей:

1. Provider/timeout:
   `dev/demo` используют быстрый бюджет `MANYASHA_CHAT_LLM_TIMEOUT_SECONDS=4.2`,
   `prod` — более консервативный `12.0`.
2. Widget protection:
   `dev/demo` допускают `WIDGET_CONTEXT_REQUIRE_INSTALL=false`,
   `prod` требует `WIDGET_CONTEXT_REQUIRE_INSTALL=true`.
3. CORS:
   `dev/demo` разрешают loopback-origin для локальных портов,
   `prod` — только явный allowlist доменов.
4. DB/Redis:
   `dev/demo` допускают локальные ресурсы (SQLite/локальный Redis),
   `prod` — PostgreSQL + Redis.
5. Install secrets:
   для `prod` обязательны `WIDGET_INSTALL_SIGNING_SECRET` и `WIDGET_INSTALL_PROVISION_KEY`.
6. Demo mode:
   включается только query-параметром `demo_mode=1`, не через env по умолчанию.

Важно: реальные секреты и API-ключи в git не коммитить. Для `NAVY_API_KEY` используйте только placeholder `your_key_here` в example-файлах и реальное значение в локальном `.env`/секретах CI.

## Что понадобится заранее

1. Аккаунт и folder в Yandex Cloud.
2. IAM token или service account key.
3. Домен в зоне RU и SSL-сертификат для NGINX.
4. Docker Registry в Yandex Container Registry.
5. SSH-доступ к VM.
6. Установленные локально:
   `terraform`
   `yc`
   `docker`

## Шаг 1. Подготовить переменные Terraform

Создайте `terraform/terraform.auto.tfvars`:

```hcl
yc_token          = "<yc-iam-token>"
cloud_id          = "<cloud-id>"
folder_id         = "<folder-id>"
domain_name       = "cdn.manaya.example.ru"
bucket_name       = "manaya-assets-prod"
ssh_public_key    = "ssh-ed25519 AAAA..."
postgres_password = "<strong-password>"
grafana_admin_password = "<strong-password>"
```

## Шаг 2. Поднять инфраструктуру в Yandex Cloud

```bash
cd terraform
terraform init
terraform apply
```

После успешного apply получите:

1. VPC и subnet в РФ
2. KMS symmetric key
3. S3 bucket с server-side encryption
4. CDN resource
5. Managed PostgreSQL
6. Compute instance для Docker stack

## Шаг 3. Подготовить VM

Terraform уже добавляет cloud-init, который устанавливает:

1. Docker
2. Docker Compose plugin

Проверьте SSH-вход на VM и убедитесь, что `docker compose` работает.

## Шаг 4. Подготовить production secrets

На VM создайте `/opt/manaya/.env`:

```env
IMAGE_API=cr.yandex/<registry-id>/manaya-api:<tag>
IMAGE_WORKER=cr.yandex/<registry-id>/manaya-worker:<tag>
POSTGRES_PASSWORD=<password>
YC_KMS_KEY_ID=<kms-key-id>
YC_STORAGE_BUCKET=<bucket-name>
GRAFANA_ADMIN_PASSWORD=<grafana-password>
EVENT_BUS_BROKER_URL=redis://redis:6379/1
JWT_SECRET=<strong-jwt-secret>
ENCRYPTION_KEY=<strong-encryption-key>
WIDGET_AUTH_SECRET=<strong-widget-auth-secret>
WIDGET_INSTALL_SIGNING_SECRET=<strong-install-signing-secret>
WIDGET_INSTALL_PROVISION_KEY=<strong-install-provision-secret>
WIDGET_CAPTCHA_SECRET=<captcha-secret>
CORS_ALLOW_ORIGINS=https://<your-domain>
WIDGET_PARTNER_DOMAIN_ALLOWLIST=default:<your-domain>
WIDGET_PARTNER_SITE_KEYS=default:<site-key>
NAVY_API_KEY=<navy-api-key>
MANYASHA_LLM_PROVIDER=navy
MANYASHA_CHAT_LLM_TIMEOUT_SECONDS=12.0
MANYASHA_DEMO_FAST_MODE=false
INTERNAL_METRICS_SERVICE_TOKEN=<metrics-token>
ALERT_WEBHOOK_URL=<alert-webhook-url>
```

## Шаг 5. Установить SSL-сертификаты

Поместите сертификаты в:

`deploy/certs/fullchain.pem`

`deploy/certs/privkey.pem`

Если сертификаты выпускаются внешним ACME-контуром, смонтируйте путь с ними в контейнер NGINX.

## Шаг 6. Запустить production stack

```bash
docker compose --env-file .env -f docker-compose.prod.yml up -d --remove-orphans
```

Проверьте:

```bash
curl -k https://<your-domain>/healthz
curl -k https://<your-domain>/readyz
```

`/healthz` — лёгкий liveness check: процесс API жив.

`/readyz` — readiness check: API готов обслуживать трафик. В staging/production он проверяет:

- database через лёгкий `SELECT 1`;
- Redis, если задан `REDIS_URL` или окружение staging/production;
- provider config: при `MANYASHA_LLM_PROVIDER=navy` должен быть задан `NAVY_API_KEY`.

Ожидание перед открытием трафика:

```json
{
  "status": "ready",
  "checks": {
    "database": {"status": "ok", "code": "database_ready"},
    "redis": {"status": "ok", "code": "redis_ready"},
    "provider": {"status": "ok", "code": "provider_ready"}
  }
}
```

Если `/readyz` вернул HTTP `503` и `status=not_ready`, не открывайте трафик. Смотрите `checks`:

- `database_unavailable`: проверить `DATABASE_URL`, Postgres, миграции и сетевой доступ;
- `redis_url_missing` / `redis_unavailable`: проверить `REDIS_URL` и доступность Redis;
- `navy_api_key_missing`: добавить `NAVY_API_KEY` в secret store/CI env;
- `provider_invalid`: исправить `MANYASHA_LLM_PROVIDER`;
- unsafe prod flags: повторить `python scripts/validate_prod_env.py` и исправить dev bypass/CORS/captcha/widget protection flags.



### Миграции БД (обязательно)

API-контейнер выполняет `alembic upgrade head` при старте (entrypoint), поэтому для прода
`MANAYA_USE_CREATE_ALL` должен оставаться `0`.

Проверка текущей ревизии:

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec api alembic current
```

Ручной прогон миграций (если контейнер API не поднимался):

```bash
docker compose --env-file .env -f docker-compose.prod.yml run --rm api alembic upgrade head
```



### Smoke-проверка widget flow

После запуска стека можно прогнать интеграционный smoke через pytest:

```bash
WIDGET_SMOKE_API_BASE=http://localhost:8000 pytest tests/backend/test_widget_flow_smoke.py -q
```

Для embed-ключа отличного от `default` передайте `WIDGET_SMOKE_PID`:

```bash
WIDGET_SMOKE_API_BASE=http://localhost:8000 WIDGET_SMOKE_PID=<partner-uuid-or-key> pytest tests/backend/test_widget_flow_smoke.py -q
```

Опционально задайте локальный идентификатор виджета для проверки объединённого `/api/chat/session`
(по умолчанию в скриптах уже заданы свои значения):

```bash
export WIDGET_SMOKE_LOCAL_SESSION_ID=my-test-sid
```

### Этап 1: E2E в двух режимах (clean + dirty DB)

Для поэтапной валидации миграций и API-контракта есть скрипт:

```bash
sh scripts/stage1_e2e_validate.sh
```

Он последовательно проверяет:

1. `clean-db`: `down -v` -> старт `db/redis/api` -> health -> `smoke_widget_flow.py`
2. `dirty-db`: перезапуск только `api` на той же БД -> health -> повторный `smoke_widget_flow.py`

Переопределяемые параметры:

```bash
COMPOSE_FILE=docker-compose.dev.yml \
WIDGET_SMOKE_API_BASE=http://localhost:8000 \
WIDGET_SMOKE_PID=default \
sh scripts/stage1_e2e_validate.sh
```

### Этап 2: единая история виджета (`/api/chat/session`)

- Legacy-таблица `public.chat_sessions` по-прежнему обновляется для обратной совместимости.
- Если при `GET`/`PUT` переданы query/body поля `partner_id`, `user_id`, `dialog_session_id` и в
  `app.dialog_sessions.metadata` есть `widget_local_session`, равный идентификатору виджета (тот же
  путь, что в URL сессии), чтение и запись синхронизируются с `app.dialog_messages` (шифрование как у
  остальных сообщений диалога).

### Этап 3: «сид» партнёра для `pid=default` (прод)

Миграция `b3e1c2d4f506` может добавить строку партнёра `00000000-0000-0000-0000-000000000001` для dev/embed.
В production обычно нужен реальный партнёр; при необходимости удалите сид после создания настоящих партнёров
(убедитесь, что нет зависимых записей):

```sql
DELETE FROM partners WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Этап 4: RLS (ручная проверка)

Автотесты покрывают happy-path smoke. Для изоляции данных проверьте вручную, что при другом `partner_id`
в query/body не возвращаются чужие `users` / `dialog_sessions` / сообщения (ожидается пустой список или 404).

### Этап 5: откат миграций (осторожно)

Только в аварийном режиме и после бэкапа БД:

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec api alembic downgrade -1
```

Повторный `upgrade head` вернёт схему в актуальное состояние.

## Шаг 7. Проверить безопасность sandbox

### FBX conversion

Сервис `fbx-converter` запускается с:

- `network_mode: none`
- `read_only: true`
- `cap_drop: ALL`

Это соответствует требованию изолированной конвертации.

### PDF sandbox

Сервис `pdf-sandbox` запускается c runtime `runsc`.

Для gVisor:

1. Установите `runsc` на VM.
2. Зарегистрируйте runtime в Docker daemon.
3. Оставьте `SANDBOX_RUNTIME=runsc`.

Если нужен более жесткий sandbox, замените runtime/host на Firecracker-based узел и вынесите PDF-процессинг в отдельную ноду.

## Шаг 8. Подключить мониторинг

Проверьте сервисы:

- Prometheus: `http://<vm-private-ip>:9090`
- Grafana: `http://<vm-private-ip>:3000`

Dashboard уже provisioned из:

- [monitoring/grafana/manaya-dashboard.json](monitoring/grafana/manaya-dashboard.json)

Alert rules:

- [monitoring/alerts.yml](monitoring/alerts.yml)

Отслеживаются:

1. TTFM
2. FPS
3. HTTP latency
4. LLM timeout spikes

## Шаг 9. Подключить CI/CD

Workflow:

- [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- [.github/workflows/ci.yml](.github/workflows/ci.yml) — unit/integration + widget flow smoke

Нужные GitHub Secrets:

1. `YC_SERVICE_ACCOUNT_KEY`
2. `YC_IAM_TOKEN`
3. `YC_CLOUD_ID`
4. `YC_FOLDER_ID`
5. `YC_REGISTRY_ID`
6. `YC_BUCKET_NAME`
7. `YC_KMS_KEY_ID`
8. `POSTGRES_PASSWORD`
9. `GRAFANA_ADMIN_PASSWORD`
10. `VM_HOST`
11. `VM_USER`
12. `VM_SSH_PRIVATE_KEY`
13. `VM_SSH_PUBLIC_KEY`
14. `DOMAIN_NAME`

Pipeline делает:

1. Terraform apply
2. Build/push Docker images
3. Upload deployment bundle на VM
4. `docker compose pull && up -d`

## Рекомендации для продакшена

1. Перевести rate limiting в Redis.
2. Вынести event-bus с Redis на Managed Kafka или Yandex Message Queue, если нагрузка вырастет.
3. Для 152-ФЗ держать bucket, DB и VM только в RU-регионе и включить аудит KMS-операций.
4. Разделить app-node и sandbox-node, если PDF/FBX станут отдельным security domain.
5. Добавить backup policy для PostgreSQL и object version lifecycle policy для S3.
