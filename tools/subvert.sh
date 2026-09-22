#!/usr/bin/env bash
# Run the cost-paying liar sweep using stigsim's toolchain.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STIGSIM="${STIGSIM_DIR:-$HERE/../../../stigsim}"
[ -d "$STIGSIM/node_modules" ] || { echo "run 'pnpm install' in $STIGSIM first" >&2; exit 1; }
cd "$STIGSIM" && pnpm exec tsx "$HERE/subvert.ts" "$@"
