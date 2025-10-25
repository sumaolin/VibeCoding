#!/usr/bin/env bash
set -euo pipefail

# Todolist startup helper
# Usage:
#   ./start.sh dev     # start backend (8000) + frontend (5173) in dev
#   ./start.sh prod    # build & start frontend, start backend for prod
#   ./start.sh stop    # stop running backend/frontend
#   ./start.sh status  # show process status

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
DB_FILE="$ROOT/todos.db"
LOG_DIR="$ROOT/logs"
PID_DIR="$ROOT/.pids"
BACKEND_PORT="${API_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

mkdir -p "$LOG_DIR" "$PID_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command '$1' not found in PATH" >&2
    exit 1
  fi
}

ensure_backend_env() {
  require_cmd python3
  if [ ! -d "$BACKEND_DIR/.venv" ]; then
    python3 -m venv "$BACKEND_DIR/.venv"
  fi
  "$BACKEND_DIR/.venv/bin/python" -m pip install --upgrade pip >/dev/null 2>&1 || true
  if [ -f "$BACKEND_DIR/requirements.txt" ]; then
    "$BACKEND_DIR/.venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
  fi
}

ensure_frontend_deps() {
  require_cmd npm
  npm install --prefix "$FRONTEND_DIR" --no-audit --no-fund
}

touch_db() {
  if [ ! -f "$DB_FILE" ]; then
    : > "$DB_FILE"
  fi
}

run_background() {
  local name="$1"
  shift
  local pidfile="$PID_DIR/$name.pid"
  local logfile="$LOG_DIR/$name.log"

  if [ -f "$pidfile" ]; then
    local existing
    existing=$(cat "$pidfile" || true)
    if [ -n "${existing:-}" ] && ps -p "$existing" >/dev/null 2>&1; then
      echo "$name already running (pid $existing)" >&2
      return
    fi
    rm -f "$pidfile"
  fi

  nohup "$@" > "$logfile" 2>&1 &
  local pid=$!
  echo "$pid" > "$pidfile"
  echo "Started $name (pid $pid, log: $logfile)"
}

start_dev() {
  touch_db
  ensure_backend_env
  ensure_frontend_deps

  run_background backend \
    "$BACKEND_DIR/.venv/bin/python" -m uvicorn backend.app:app \
    --app-dir "$BACKEND_DIR" \
    --host 0.0.0.0 \
    --port "$BACKEND_PORT" \
    --reload

  run_background frontend \
    npm --prefix "$FRONTEND_DIR" run dev -- --port "$FRONTEND_PORT" --hostname 0.0.0.0

  echo "Dev started: backend($BACKEND_PORT), frontend($FRONTEND_PORT)"
}

start_prod() {
  touch_db
  ensure_backend_env
  ensure_frontend_deps

  npm --prefix "$FRONTEND_DIR" run build

  run_background backend \
    "$BACKEND_DIR/.venv/bin/python" -m uvicorn backend.app:app \
    --app-dir "$BACKEND_DIR" \
    --host 0.0.0.0 \
    --port "$BACKEND_PORT" \
    --workers 2 \
    --proxy-headers

  run_background frontend \
    npm --prefix "$FRONTEND_DIR" run start -- --port "$FRONTEND_PORT" --hostname 0.0.0.0

  echo "Prod started: backend($BACKEND_PORT), frontend($FRONTEND_PORT)"
}

stop_all() {
  for name in backend frontend; do
    local pidfile="$PID_DIR/$name.pid"
    if [ ! -f "$pidfile" ]; then
      echo "$name: not running"
      continue
    fi
    local pid
    pid=$(cat "$pidfile" || true)
    if [ -n "${pid:-}" ] && ps -p "$pid" >/dev/null 2>&1; then
      kill "$pid" && echo "Stopped $name (pid $pid)" || echo "Failed to stop $name (pid $pid)"
      for _ in {1..10}; do
        if ! ps -p "$pid" >/dev/null 2>&1; then
          break
        fi
        sleep 0.5
      done
      if ps -p "$pid" >/dev/null 2>&1; then
        kill -9 "$pid" && echo "Force killed $name (pid $pid)"
      fi
    else
      echo "$name: pid file found but process not running"
    fi
    rm -f "$pidfile"
  done
}

status_all() {
  for name in backend frontend; do
    local pidfile="$PID_DIR/$name.pid"
    if [ -f "$pidfile" ]; then
      local pid
      pid=$(cat "$pidfile" || true)
      if [ -n "${pid:-}" ] && ps -p "$pid" >/dev/null 2>&1; then
        echo "$name: running (pid $pid)"
      else
        echo "$name: not running"
      fi
    else
      echo "$name: not running"
    fi
  done
}

case "${1:-}" in
  dev)
    start_dev
    ;;
  prod)
    start_prod
    ;;
  stop)
    stop_all
    ;;
  status)
    status_all
    ;;
  *)
    echo "Usage: $0 {dev|prod|stop|status}" >&2
    exit 1
    ;;
esac
