# On-Call Alerting Runbook

## Goal

Подключить алерты виджета Маняши к реальному каналу дежурных и исключить "тихие" инциденты.

## Required secrets

- `ALERT_WEBHOOK_URL` — webhook дежурного канала (Slack/Teams/Opsgenie/PagerDuty bridge).
- `WIDGET_INSTALL_PROVISION_KEY`
- `WIDGET_INSTALL_SIGNING_SECRET`

## Infrastructure wiring

В прод-стеке используются:

- `prometheus` с rule-файлом `monitoring/alerts.yml`
- `alertmanager` с конфигом `monitoring/alertmanager.yml`
- receiver `oncall-webhook` (env-backed URL)

## Validation checklist (post-deploy)

1. Проверить, что `alertmanager` поднят в `docker compose` и healthy.
2. В Prometheus проверить target `alertmanager:9093`.
3. Через Prometheus UI убедиться, что правила `ManayaWidgetInstall*` в статусе `Normal`/`Firing`.
4. Создать тестовое событие install-health error (на staging или безопасном test-partner) и убедиться, что уведомление пришло в канал дежурных.
5. Зафиксировать ссылку на сообщение и время доставки (SLA < 2 минуты).

## Escalation policy (minimum)

- `severity=critical`:
  - ack до 5 минут;
  - эскалация дежурному backend + platform owner.
- `severity=warning`:
  - ack до 15 минут;
  - triage в рабочем канале + тикет.

## Evidence to attach in incident ticket

- screenshot/URL алерта в Prometheus/Grafana;
- webhook message ID в канале дежурных;
- root cause note;
- fix/rollback decision;
- follow-up tasks.

