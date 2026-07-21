#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Export DATABASE_URL before running migrations}"
: "${JWT_SECRET:?Export JWT_SECRET before running migrations}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
(cd "$root/backend" && node migrate-base.js)
for migration in "$root/backend/migrations/"*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"; done
