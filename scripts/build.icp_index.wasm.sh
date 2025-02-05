#!/usr/bin/env bash
[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF

	Populates the icp_index Wasm file.

	EOF
  exit 0
}
set -euo pipefail

WASM_FILE="$(jq -re .canisters.icp_index.wasm dfx.json)"
mkdir -p "$(dirname "$WASM_FILE")"
if test -e "${WASM_FILE}"; then
  echo "Using existing icp_index Wasm at: '$WASM_FILE'"
else
  ./scripts/download.icp.sh
fi
