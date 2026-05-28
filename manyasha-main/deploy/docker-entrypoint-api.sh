#!/bin/sh
set -eu

# Ожидаем БД (postgres в compose поднимается дольше первого старта API).
n=0
until python -c "from rpg_engine import engine; c = engine.connect(); c.close()" 2>/dev/null; do
  n=$((n + 1))
  if [ "$n" -ge 45 ]; then
    echo "[entrypoint] database not reachable after wait" >&2
    exit 1
  fi
  sleep 2
done

# По умолчанию только Alembic. Опционально: MANAYA_USE_CREATE_ALL=1 (локальная подстраховка).
if [ "${MANAYA_USE_CREATE_ALL:-0}" = "1" ]; then
  python -c "from partner_dashboard import create_schema; create_schema()"
fi

if [ "${MANAYA_SKIP_ALEMBIC:-0}" != "1" ]; then
  alembic upgrade head
fi

exec "$@"
