#!/usr/bin/env bash
# Export one experiment run as a trace the hosted Maze Simulator can load.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STIGSIM="${STIGSIM_DIR:-$HERE/../../../stigsim}"
[ -d "$STIGSIM/node_modules" ] || { echo "run 'pnpm install' in $STIGSIM first" >&2; exit 1; }
OUTDIR="$(pwd)"
cd "$STIGSIM" && pnpm exec tsx "$HERE/export-trace.ts" "$@"
