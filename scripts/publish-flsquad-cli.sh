#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if command -v pwsh >/dev/null 2>&1; then
  exec pwsh -NoProfile -File "$SCRIPT_DIR/publish-flsquad-cli.ps1" "$@"
fi

if command -v powershell >/dev/null 2>&1; then
  exec powershell -NoProfile -File "$SCRIPT_DIR/publish-flsquad-cli.ps1" "$@"
fi

echo "PowerShell is required to run publish-flsquad-cli.sh." >&2
exit 1
