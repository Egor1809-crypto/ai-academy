# Manyasha External Staging Inputs Checklist

Purpose: collect the exact inputs required before running the external staging evidence pack. This is not a deploy runbook and not a place for real secrets. Keep actual values in the deployment secret store or a protected ticket.

Current status: incomplete until all required inputs below are confirmed.

## How To Use

1. Fill the "Provided?" column in your private copy or deployment ticket.
2. Do not paste secret values into git, screenshots, public logs, or chat.
3. Confirm the deployed image is built from the expected commit.
4. Only then run `docs/STAGING_RUNBOOK.md`.

## Required Inputs

| Input | What it is | Source / where to get it | Owner | Secret | Required | Can continue without it | Placeholder |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `STAGING_API_ORIGIN` | Public staging API base URL | Cloud/API ingress, DNS, deploy output | DevOps/backend | no | yes | no | `https://api-staging.example.ru` |
| `STAGING_HOST_ORIGIN` | Staging host-site origin where widget is embedded | DNS/hosting for staging site | DevOps/frontend | no | yes | no | `https://staging.example.ru` |
| `PARTNER_ID` | Partner UUID or explicit staging partner id | Partner seed/admin record/backend config | Backend/product owner | no | yes | no | `11111111-1111-4111-8111-aaaaaaaaaaaa` |
| `SITE_KEY` | Registered widget site key for staging host | `WIDGET_PARTNER_SITE_KEYS` config | Backend/DevOps | no | yes | no | `staging-main` |
| `WIDGET_INSTALL_PROVISION_KEY` | Secret used to issue install token | Secret store / GitHub environment secret | DevOps/security | yes | yes | no, unless a fresh install token is issued by an owner | `<staging-install-provision-secret>` |
| `DATABASE_URL` | Staging PostgreSQL connection | Secret store / managed Postgres | DevOps | yes | yes | no | `<postgres-url>` |
| `REDIS_URL` | Staging Redis connection | Secret store / managed Redis | DevOps | yes | yes | no | `<redis-url>` |
| `NAVY_API_KEY` | Navy provider API key | Secret store / api.navy dashboard | Product owner/DevOps | yes | yes | no | `<staging-navy-api-key>` |
| `JWT_SECRET` | Backend JWT signing secret | Secret store | DevOps/security | yes | yes | no | `<staging-jwt-secret>` |
| `ENCRYPTION_KEY` | Encryption key for protected data | Secret store / KMS policy | DevOps/security | yes | yes | no | `<staging-encryption-key>` |
| `WIDGET_AUTH_SECRET` | Widget auth token secret | Secret store | DevOps/security | yes | yes | no | `<staging-widget-auth-secret>` |
| `WIDGET_INSTALL_SIGNING_SECRET` | Install token signing secret | Secret store | DevOps/security | yes | yes | no | `<staging-install-signing-secret>` |
| `CORS_ALLOW_ORIGINS` | Explicit staging CORS allowlist | Deployment env / staging domains | DevOps | no | yes | no | `https://staging.example.ru,https://widget-staging.example.ru` |
| `WIDGET_PARTNER_DOMAIN_ALLOWLIST` | Partner-to-domain allowlist | Deployment env / partner registry | Backend/DevOps | no | yes | no | `<partner-id>:staging.example.ru` |
| `WIDGET_PARTNER_SITE_KEYS` | Partner-to-site-key registry | Deployment env / partner registry | Backend/DevOps | no | yes | no | `<partner-id>:staging-main` |
| Deployed commit/image tag | Image/commit currently deployed to staging | CI/CD release output | DevOps | no | yes | no | `bb6af49` or newer |
| DNS/domain readiness | API and host domains resolve and serve HTTPS | DNS provider / hosting dashboard | DevOps | no | yes | no | `api-staging.example.ru -> staging API` |

## Conditional Inputs

| Input | Required when | Source | Secret | Placeholder |
| --- | --- | --- | --- | --- |
| `WIDGET_CAPTCHA_SECRET` | `WIDGET_CAPTCHA_REQUIRED=true` | CAPTCHA provider / secret store | yes | `<staging-captcha-secret>` |
| `INTERNAL_METRICS_SERVICE_TOKEN` | Internal metrics endpoint is enabled | Secret store | yes | `<staging-metrics-token>` |
| `ALERT_WEBHOOK_URL` | Alert webhook is enabled | Secret store | yes | `<staging-alert-webhook>` |
| `STAGING_WIDGET_ORIGIN` | Widget static host differs from host-site/API | Frontend hosting/DNS | no | `https://widget-staging.example.ru` |

## Local Shell Template

Use this only as a local, uncommitted checklist. Replace placeholders in a private shell or CI environment, not in git.

```bash
export STAGING_API_ORIGIN="https://api-staging.example.ru"
export STAGING_HOST_ORIGIN="https://staging.example.ru"
export PARTNER_ID="11111111-1111-4111-8111-aaaaaaaaaaaa"
export SITE_KEY="staging-main"
export DEPLOYED_COMMIT_OR_TAG="bb6af49-or-newer"

# Secrets: load from a secret store. Do not paste real values into this file.
export WIDGET_INSTALL_PROVISION_KEY="<staging-install-provision-secret>"
export DATABASE_URL="<postgres-url>"
export REDIS_URL="<redis-url>"
export NAVY_API_KEY="<staging-navy-api-key>"
export JWT_SECRET="<staging-jwt-secret>"
export ENCRYPTION_KEY="<staging-encryption-key>"
export WIDGET_AUTH_SECRET="<staging-widget-auth-secret>"
export WIDGET_INSTALL_SIGNING_SECRET="<staging-install-signing-secret>"

export CORS_ALLOW_ORIGINS="https://staging.example.ru,https://widget-staging.example.ru"
export WIDGET_PARTNER_DOMAIN_ALLOWLIST="${PARTNER_ID}:staging.example.ru"
export WIDGET_PARTNER_SITE_KEYS="${PARTNER_ID}:${SITE_KEY}"
```

## Pass Gate Before Evidence Pack

- `STAGING_API_ORIGIN` and `STAGING_HOST_ORIGIN` are reachable over HTTPS.
- `PARTNER_ID`, `SITE_KEY`, domain allowlist, and site key registry all refer to the same staging partner.
- Staging runtime uses PostgreSQL and Redis, not local SQLite/dev fallback.
- Navy provider key is present in the staging secret store.
- Install token can be issued for the exact partner, site key, and host origin.
- `/healthz` returns liveness OK.
- `/readyz` returns HTTP 200 with `status=ready`.
- No real secret values are present in git, screenshots, logs, or evidence files.

If any required input is missing, external staging evidence remains pending and production signoff stays blocked.
