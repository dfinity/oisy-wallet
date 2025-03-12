#!/usr/bin/env bash
set -euo pipefail

WASM_FILE="$(jq -re .canisters.icp_ledger.wasm dfx.json)"
mkdir -p "$(dirname "$WASM_FILE")"
if test -e "${WASM_FILE}"; then
  echo "Using existing icp_ledger Wasm at: '$WASM_FILE'"
else
  ./scripts/download.icp.sh
fi
