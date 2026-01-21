#!/usr/bin/env bash
set -euo pipefail

WASM_FILE="$(jq -re .canisters.testicp_ledger.wasm dfx.json)"
mkdir -p "$(dirname "$WASM_FILE")"
if test -e "${WASM_FILE}"; then
  echo "Using existing testicp_ledger Wasm at: '$WASM_FILE'"
else
  ./scripts/download.testicp.sh
fi
