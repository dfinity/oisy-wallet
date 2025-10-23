#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
Creates the GLDT stake installation files:

- The Wasm and Candid files are downloaded.

The files are installed at the locations defined for 'gldt_stake' in 'dfx.json'.
EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

DFX_NETWORK="${DFX_NETWORK:-local}"
export GLDT_STAKE_BUILDENV="$DFX_NETWORK"

GLDT_STAKE_REPO_DOWNLOADS_URL="https://github.com/GoldDAO/gold-dao/releases/latest/download"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
CANDID_URL="${GLDT_STAKE_REPO_DOWNLOADS_URL}/can.did"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
WASM_URL="${GLDT_STAKE_REPO_DOWNLOADS_URL}/gldt_stake_canister.wasm.gz"

CANDID_FILE="$(jq -r .canisters.gldt_stake.candid dfx.json)"
WASM_FILE_GZ="$(jq -r .canisters.gldt_stake.wasm dfx.json)"
WASM_FILE="${WASM_FILE_GZ%.gz}"
ARG_FILE="$(jq -r .canisters.gldt_stake.init_arg_file dfx.json)"

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
SUCCESS: The gldt_stake installation files have been created:
gldt_stake candid:       $CANDID_FILE
gldt_stake Wasm:         $WASM_FILE_GZ
gldt_stake install args: $ARG_FILE
EOF
