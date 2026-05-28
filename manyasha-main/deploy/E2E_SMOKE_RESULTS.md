# E2E Smoke Results

Date: 2026-04-19

Command:

```bash
PLAYWRIGHT_DATABASE_URL='sqlite+pysqlite:///./playwright-smoke.db' \
PATH="/Users/egor/RROJECT MANAYA/.venv311/bin:$PATH" \
npx playwright test tests/e2e/widget-embed-smoke.spec.ts \
  --project=chromium \
  --project=webkit \
  --project=webkit-mobile
```

Summary: `9 passed (15.2s)`

Matrix:

- `chromium`: PASS (EMB-01, EMB-02, EMB-03)
- `webkit`: PASS (EMB-01, EMB-02, EMB-03)
- `webkit-mobile`: PASS (EMB-01, EMB-02, EMB-03)

Notes:

- Real run (not `--list`).
- Browser binaries installed via `npx playwright install chromium webkit`.
- Local API/frontend webServer boot from Playwright config.
