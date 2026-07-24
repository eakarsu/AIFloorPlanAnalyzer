#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$root/.env" ]] || { echo 'Missing .env; copy .env.example and configure it.' >&2; exit 1; }
set -a
. "$root/.env"
set +a
[[ -d "$root/backend/node_modules" && -d "$root/frontend/node_modules" ]] || { echo 'Dependencies missing; run scripts/bootstrap.sh.' >&2; exit 1; }
for port in "${BACKEND_PORT:-3001}" "${FRONTEND_PORT:-3000}"; do ! lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || { echo "Port $port is already in use; refusing to terminate its owner." >&2; exit 1; }; done
if [[ "${MIGRATE_ON_START:-false}" == "true" ]]; then
  (cd "$root/backend" && node scripts/runtime-init.js)
fi
cleanup(){ kill "${backend_pid:-}" "${frontend_pid:-}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
(cd "$root/backend" && npm start) & backend_pid=$!
(cd "$root/frontend" && npm run dev -- --host "${HOST:-127.0.0.1}" --port "${FRONTEND_PORT:-3000}") & frontend_pid=$!
wait "$backend_pid" "$frontend_pid"
