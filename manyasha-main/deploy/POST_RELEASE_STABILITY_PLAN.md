# Post-release Stability Plan (14-30 days)

## Goal

Подтвердить, что после релиза виджет стабилен на проде и не имеет критичных деградаций.

## Duration

- Minimum: 14 days
- Target: 30 days

## Monitored SLO/SLA

1. API error rate (widget endpoints)
2. Handoff SLA/ETA adherence
3. Install-health error ratio
4. Voice failures (autoplay/TTS/mic edge cases)
5. Median and P95 response latency

## Daily checks

1. Install-health dashboard (error/warn trends)
2. Handoff queue and resolution status
3. Security alert feed (critical/warning)
4. Top frontend failures from analytics events

## Weekly review

1. Incident summary and root causes
2. Regression backlog prioritization
3. Partner feedback and support tickets
4. Decision: keep / tune / rollback feature flags

## Exit criteria

1. No unresolved critical incidents.
2. No sustained SLO breach.
3. Handoff SLA в норме.
4. Security posture unchanged (no new high/critical).
5. Product owner and tech owner approve stabilization completion.
