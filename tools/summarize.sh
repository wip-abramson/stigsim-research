#!/usr/bin/env bash
# Run the summarizer using stigsim's toolchain (tsx + workspace deps).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STIGSIM="${STIGSIM_DIR:-$HERE/../../../stigsim}"
[ -d "$STIGSIM/node_modules" ] || { echo "run 'pnpm install' in $STIGSIM first" >&2; exit 1; }
REC="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; shift
cd "$STIGSIM" && pnpm exec tsx "$HERE/summarize-run.ts" "$REC" "$@"
