#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
Creates the LLM installation files:

- The Wasm and Candid files are downloaded.

The files are installed at the locations defined for 'llm' in 'dfx.json'.
EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

DFX_NETWORK="${DFX_NETWORK:-local}"
export LLM_BUILDENV="$DFX_NETWORK"

LLM_RELEASE_URL="https://github.com/dfinity/llm/releases/latest/download/"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
CANDID_URL="${LLM_RELEASE_URL}/llm-canister-ollama.did"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
WASM_URL="${LLM_RELEASE_URL}/llm-canister-ollama.wasm"

CANDID_FILE="$(jq -r .canisters.llm.candid dfx.json)"
WASM_FILE_GZ="$(jq -r .canisters.llm.wasm dfx.json)"
WASM_FILE="${WASM_FILE_GZ%.gz}"
ARG_FILE="$(jq -r .canisters.llm.init_arg_file dfx.json)"

download() {
  local asset asset_url asset_file
  asset="$1"
  asset_url="${asset^^}_URL"
  asset_file="${asset^^}_FILE"
  scripts/download-immutable.sh "${!asset_url}" "${!asset_file}"
}

# Download candid and wasm
download candid
download wasm

# Compress Wasm
echo "Compressing Wasm: $WASM_FILE_GZ"
gzip -c "$WASM_FILE" >"$WASM_FILE_GZ"

# Generate init args
echo "Generating init args..."
rm -f "$ARG_FILE"
mkdir -p "$(dirname "$ARG_FILE")"

# Set default principals (can be overridden via env if needed)
INFO_CID="aaaaa-aa"
TRUSTED_CANISTER_MANAGER_CID="aaaaa-aa"
GOVERNANCE_CID="aaaaa-aa"
PASSCODE_MANAGER_CID="aaaaa-aa"
BACKUP_CID="aaaaa-aa"
FEE_RECEIVER_CID="aaaaa-aa"

cat <<EOF >"$ARG_FILE"
(
  principal "$INFO_CID",
  principal "$TRUSTED_CANISTER_MANAGER_CID",
  principal "$GOVERNANCE_CID",
  principal "$PASSCODE_MANAGER_CID",
  principal "$BACKUP_CID",
  opt principal "$FEE_RECEIVER_CID"
)
EOF

cat <<EOF
SUCCESS: The llm installation files have been created:
llm candid:       $CANDID_FILE
llm Wasm:         $WASM_FILE_GZ
llm install args: $ARG_FILE
EOF
