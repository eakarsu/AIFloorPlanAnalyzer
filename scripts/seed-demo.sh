#!/usr/bin/env bash
set -euo pipefail
[[ "${CONFIRM_DEMO_SEED:-}" == yes ]] || { echo 'Refusing destructive demo seed; set CONFIRM_DEMO_SEED=yes.' >&2; exit 2; }
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; (cd "$root/backend" && CONFIRM_DEMO_SEED=yes npm run seed)
