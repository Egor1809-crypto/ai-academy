# Install Token Rotation Drill

Date: 2026-04-20  
Environment: local staging-like (`APP_ENV=staging`, strict install protection enabled)  
Owner: Egor + Codex

## Command

```bash
./.venv311/bin/python scripts/install_token_rotation_drill.py \
  --api-base http://127.0.0.1:8010 \
  --partner-id default \
  --pid default \
  --site-key bankruptcy-site-main \
  --origin 127.0.0.1 \
  --install-secret drill-provision-secret-20260420 \
  --ttl-seconds 900 \
  --embed-contract-version 1 \
  --observe-seconds 30 \
  --out-dir deploy/drills
```

## Result

- Status: `PASS` (`DRILL_OK`)
- Artifact:
  - `deploy/drills/install-token-drill-20260420T104542Z.jsonl`

## Notes

- The drill produced:
  - successful token issue (`http_status=200`);
  - install-health in `warn/partner_default_dev_without_db` (acceptable for default dev partner);
  - valid install token check (`install_token_valid`);
  - stable observe window with no transition to `error`.
- Earlier failed attempts kept for traceability:
  - `deploy/drills/install-token-drill-20260420T104500Z.jsonl`
  - `deploy/drills/install-token-drill-20260420T104516Z.jsonl`
