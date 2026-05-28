#!/bin/sh
set -eu

# Этап 1: end-to-end проверка миграций и widget-flow
# Сценарии:
#   1) clean-db  — полностью чистая БД/volume
#   2) dirty-db  — повторный upgrade на уже существующей БД

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"
API_BASE="${WIDGET_SMOKE_API_BASE:-http://localhost:8000}"
PID="${WIDGET_SMOKE_PID:-default}"

log() {
  printf '%s %s\n' "[stage1]" "$*"
}

run_smoke() {
  log "running smoke_widget_flow.py (base=${API_BASE}, pid=${PID})"
  WIDGET_SMOKE_API_BASE="${API_BASE}" WIDGET_SMOKE_PID="${PID}" \
    python3 "${ROOT_DIR}/scripts/smoke_widget_flow.py"
}

up_stack() {
  log "starting db + redis + api via ${COMPOSE_FILE}"
  docker compose -f "${ROOT_DIR}/${COMPOSE_FILE}" up -d --build db redis api
}

wait_api() {
  log "waiting API healthz"
  i=0
  while [ "${i}" -lt 90 ]; do
    if curl -fsS "${API_BASE}/healthz" >/dev/null 2>&1; then
      log "api is healthy"
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  log "api did not become healthy in time"
  docker compose -f "${ROOT_DIR}/${COMPOSE_FILE}" logs api || true
  return 1
}

clean_db_phase() {
  log "phase clean-db: resetting volumes"
  docker compose -f "${ROOT_DIR}/${COMPOSE_FILE}" down -v || true
  up_stack
  wait_api
  run_smoke
}

dirty_db_phase() {
  log "phase dirty-db: restart api without dropping volumes"
  docker compose -f "${ROOT_DIR}/${COMPOSE_FILE}" stop api
  docker compose -f "${ROOT_DIR}/${COMPOSE_FILE}" up -d --build api
  wait_api
  run_smoke
}

cleanup() {
  log "teardown stack"
  docker compose -f "${ROOT_DIR}/${COMPOSE_FILE}" down || true
}

main() {
  trap cleanup EXIT
  clean_db_phase
  dirty_db_phase
  log "stage 1 completed successfully"
}

main "$@"
