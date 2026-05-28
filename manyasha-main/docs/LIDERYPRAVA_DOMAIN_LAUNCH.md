# Lideryprava Domain Launch Checklist

Domain: `https://lideryprava.online`

Status baseline: local RC / domain-connected audit, commit `33c9442`.

This checklist tracks what must be true before Manayasha can be treated as staging-ready or production-ready on the connected domain. It intentionally uses placeholders only. Do not paste real secrets into this file, screenshots, evidence logs, GitHub comments, or tickets.

## 1. Current Status

| Item | Status | Notes |
| --- | --- | --- |
| Domain connected | yes | `https://lideryprava.online` resolves and reaches the backend. |
| `/healthz` | OK | Liveness endpoint responds. |
| `/readyz` | OK | Readiness endpoint responds with `status=ready` in the current environment. |
| Strict staging/prod | no | Current readiness shows non-strict fallback behavior. |
| Redis | currently optional | Must become `redis_ready` and required for staging/production. |
| Provider | currently fallback allowed | Must become Navy-backed `provider_ready` for staging/production. |
| Production-ready | no | Blocked by external staging evidence and Postgres-backed Alembic evidence. |

Current domain is backend-reachable, but the readiness output still looks like a dev/local-style environment because Redis is optional and provider fallback is allowed.

## 2. Domain Architecture

| Part | Planned value | Notes |
| --- | --- | --- |
| Main domain | `https://lideryprava.online` | Public website and widget host entry point. |
| API origin | `https://lideryprava.online` | Same-origin API is the simplest baseline. If an API subdomain is introduced later, use `https://api.lideryprava.online` and update CORS/install checks. |
| Widget host | same-origin | Keep widget static assets on the same domain unless a dedicated widget CDN/subdomain is introduced. |
| CORS policy | explicit allowlist only | Use exact origins. Do not use `*`. |
| Null origin | disabled | `CORS_ALLOW_NULL_ORIGIN=false` for staging/production. |

Recommended first production-like shape:

```text
Website: https://lideryprava.online
API:     https://lideryprava.online
Widget:  https://lideryprava.online/widget.html and /embed.js
```

If a separate API subdomain is used later:

```text
Website: https://lideryprava.online
API:     https://api.lideryprava.online
CORS:    https://lideryprava.online
```

## 3. Required Env Checklist

| ENV name | Example value without secret | Why it is needed | Staging required | Production required |
| --- | --- | --- | --- | --- |
| `APP_ENV` | `staging` or `production` | Enables strict readiness/security behavior. | yes | yes |
| `DATABASE_URL` | `postgresql+psycopg://manaya:<password>@postgres:5432/manaya` | PostgreSQL connection for app and Alembic. | yes | yes |
| `REDIS_URL` | `redis://redis:6379/0` | Redis readiness, cache, shared runtime dependency. | yes | yes |
| `JWT_SECRET` | `<strong-jwt-secret>` | Auth/session token signing. | yes | yes |
| `ENCRYPTION_KEY` | `<strong-encryption-key>` | Protected data encryption. | yes | yes |
| `WIDGET_AUTH_SECRET` | `<widget-auth-secret>` | Widget session/auth token signing. | yes | yes |
| `WIDGET_INSTALL_SIGNING_SECRET` | `<install-signing-secret>` | Signing install tokens. | yes | yes |
| `WIDGET_INSTALL_PROVISION_KEY` | `<install-provision-secret>` | Server-side authorization to issue install tokens. | yes | yes |
| `WIDGET_CONTEXT_REQUIRE_INSTALL` | `true` | Requires valid domain/site_key/install_token for widget context. | yes | yes |
| `WIDGET_CAPTCHA_REQUIRED` | `true` | Requires captcha where widget endpoints need abuse protection. | yes | yes |
| `WIDGET_CAPTCHA_SECRET` | `<captcha-secret>` | Captcha verification secret. | yes | yes |
| `CORS_ALLOW_ORIGINS` | `https://lideryprava.online` | Browser allowlist for frontend/API calls. | yes | yes |
| `CORS_ALLOW_NULL_ORIGIN` | `false` | Prevents unsafe null-origin access. | yes | yes |
| `WIDGET_PARTNER_DOMAIN_ALLOWLIST` | `default:lideryprava.online` | Allows this domain for the partner widget. | yes | yes |
| `WIDGET_PARTNER_SITE_KEYS` | `default:lideryprava-main` | Registers valid widget `site_key`. | yes | yes |
| `WIDGET_SITE_KEY` | `lideryprava-main` | Default site key for generated embed script, if used. | yes | yes |
| `WIDGET_INSTALL_TOKEN` | `<fresh-short-lived-install-token>` | Default install token for generated embed script, if used. Prefer fresh issued tokens. | yes | yes |
| `MANYASHA_LLM_PROVIDER` | `navy` | Selects the production-quality provider path. | yes | yes |
| `NAVY_API_KEY` | `<navy-api-key>` | Required for Navy provider readiness. | yes | yes |
| `MANYASHA_CHAT_LLM_TIMEOUT_SECONDS` | `12.0` | Provider timeout budget. | yes | yes |
| `CLIENT_REPORT_EMAIL_WEBHOOK_URL` | `https://email-provider.example/report` | Real delivery for client report email. | yes, if email feature is enabled | yes, if email feature is enabled |
| `INTERNAL_METRICS_SERVICE_TOKEN` | `<metrics-token>` | Internal metrics access control. | yes | yes |
| `ALERT_WEBHOOK_URL` | `https://alerts.example/webhook` | Alert delivery for production monitoring. | yes | yes |
| `MANAYA_USE_CREATE_ALL` | `0` | Production schema must use Alembic, not `create_all`. | yes | yes |
| `DEV_AUTH_ENABLED` | `false` | Disables dev dashboard auth bypass. | yes | yes |
| `DEV_STORAGE_ENABLED` | `false` | Disables dev storage bypass. | yes | yes |

## 4. Command Checklist

Run these commands only in a secure shell with real values loaded from a secret store. The commands below intentionally use placeholders and environment variables.

### Validate strict env

```bash
python scripts/validate_prod_env.py
```

### Apply and inspect PostgreSQL migrations

```bash
alembic upgrade head
alembic current
```

### Check liveness and readiness

```bash
curl -fsS https://lideryprava.online/healthz
curl -fsS https://lideryprava.online/readyz
```

Expected strict `/readyz` shape:

```json
{
  "status": "ready",
  "checks": {
    "database": { "status": "ok", "code": "database_ready" },
    "redis": { "status": "ok", "code": "redis_ready" },
    "provider": { "status": "ok", "code": "provider_ready" }
  }
}
```

### Issue install token

```bash
python scripts/widget_install_token_ops.py issue \
  --api-base "https://lideryprava.online" \
  --partner-id "default" \
  --site-key "lideryprava-main" \
  --origin "https://lideryprava.online" \
  --install-secret "$WIDGET_INSTALL_PROVISION_KEY" \
  --ttl-seconds 900
```

Do not paste the returned token into docs, screenshots, public issues, or commit messages.

### Verify install health

```bash
python scripts/widget_install_token_ops.py health \
  --api-base "https://lideryprava.online" \
  --origin "https://lideryprava.online" \
  --partner-id "default" \
  --site-key "lideryprava-main" \
  --install-token "$INSTALL_TOKEN" \
  --embed-contract-version 1
```

### Smoke chat check

Open the domain in a browser and verify:

```text
- widget opens;
- widget-context returns HTTP 200;
- message sends successfully;
- no 401/403/503;
- no CORS error in browser console;
- no secret appears in the response or logs.
```

### Email report smoke

If client report email is enabled:

```text
- create a client report;
- submit email with explicit consent;
- endpoint returns accepted/sent status;
- email provider receives only report_text + whitelisted diagnostics;
- raw chatHistory is not sent;
- full secret values are not logged.
```

If email provider is not configured, hide or disable the email feature for public staging/production until delivery is configured.

### Partner dashboard auth smoke

```text
- open partner dashboard;
- verify unauthenticated access is blocked;
- login with partner credentials;
- verify LeadInbox only shows tickets scoped to that partner;
- verify status/note/checklist actions require auth;
- verify no raw report, raw chatHistory, tokens, or secrets are exposed.
```

## 5. Pass Criteria

Launch evidence is green only when all of these are true:

| Gate | Required result |
| --- | --- |
| `validate_prod_env.py` | OK, no unsafe prod flags. |
| `/healthz` | HTTP 200. |
| `/readyz` | HTTP 200 and `status=ready`. |
| Database check | `database_ready`. |
| Redis check | `redis_ready`, not `redis_optional`. |
| Provider check | `provider_ready` with Navy configured, not fallback allowed. |
| Install-health | `status=ok`, `code=widget_install_ready`. |
| Widget context | HTTP 200 with valid `site_key` and `install_token`. |
| Chat | Sends and receives response without 401/403/503. |
| CORS | No browser CORS errors. |
| Email report | Works with real provider, or feature is explicitly hidden/disabled. |
| Partner dashboard | Not publicly open without auth. |
| Secrets | No secrets in logs, evidence files, screenshots, GitHub comments, or docs. |

## 6. Missing Inputs

These inputs must be provided by the infra/secrets owner before strict staging or production evidence can be completed:

| Input | Owner/source | Notes |
| --- | --- | --- |
| PostgreSQL `DATABASE_URL` | Infra/DB owner | Must be PostgreSQL, not SQLite. |
| Redis `REDIS_URL` | Infra/Redis owner | Required in staging/production readiness. |
| Navy API key | Provider/account owner | Required when `MANYASHA_LLM_PROVIDER=navy`. |
| Captcha secret | Captcha provider owner | Required when captcha is enabled. |
| Widget auth secret | Backend/security owner | Strong secret, never public. |
| Install signing secret | Backend/security owner | Strong secret, never public. |
| Install provision key | Backend/security owner | Used only server-side to issue install tokens. |
| Fresh install token | Backend/DevOps owner | Issue for exact domain + site key + partner. |
| Email webhook URL | Email provider/DevOps owner | Required if report email remains visible. |
| Partner dashboard credentials/auth setup | Product/backend owner | Must be real partner auth, not dev bypass. |
| Deployed image/tag | DevOps/release owner | Must match approved RC or newer commit. |
| DNS/TLS confirmation | Infra/DNS owner | Domain must serve HTTPS and route correctly. |

## 7. Evidence To Collect

Create future evidence artifacts without secrets:

| Evidence | Suggested location | Must include |
| --- | --- | --- |
| Postgres Alembic evidence | `deploy/evidence/POSTGRES_ALEMBIC_<timestamp>.md` | `alembic upgrade head`, `alembic current`, schema verification. |
| External staging evidence | `deploy/evidence/EXTERNAL_STAGING_SECURITY_EVIDENCE_<timestamp>.md` | Commit/image, URLs, pass/fail summary. |
| Install-health evidence | Same external staging evidence file or separate note | Sanitized install-health response summary. |
| Readyz evidence | Same external staging evidence file or separate note | `database_ready`, `redis_ready`, `provider_ready`. |
| Widget smoke evidence | Same external staging evidence file or separate note | Widget opens, context 200, chat works. |
| Email report evidence | Same external staging evidence file or separate note | Delivery status, privacy whitelist, no raw chatHistory. |
| Partner dashboard auth evidence | Same external staging evidence file or separate note | Unauth blocked, partner scope verified. |

## 8. Final Status Wording

`lideryprava.online is domain-connected and backend-reachable, but not production-ready until strict staging evidence and Postgres-backed Alembic evidence are completed.`
