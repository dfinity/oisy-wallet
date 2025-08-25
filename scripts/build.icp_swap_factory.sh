#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
Creates the ICP Swap Factory installation files:

- The Wasm and Candid files are downloaded.

The files are installed at the locations defined for 'icp_swap_factory' in 'dfx.json'.
EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

DFX_NETWORK="${DFX_NETWORK:-local}"
export ICP_SWAP_FACTORY_BUILDENV="$DFX_NETWORK"

FACTORY_RELEASE_URL="https://raw.githubusercontent.com/ICPSwap-Labs/docs/ac989c62fb65ed39769dbebfa94eb57f90c86d8f/_canister/SwapFactory"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
CANDID_URL="${FACTORY_RELEASE_URL}/SwapFactory.did"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
WASM_URL="${FACTORY_RELEASE_URL}/SwapFactory.wasm"

CANDID_FILE="$(jq -r .canisters.icp_swap_factory.candid dfx.json)"
WASM_FILE_GZ="$(jq -r .canisters.icp_swap_factory.wasm dfx.json)"
WASM_FILE="${WASM_FILE_GZ%.gz}"
ARG_FILE="$(jq -r .canisters.icp_swap_factory.init_arg_file dfx.json)"

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
  opt principal "$FEE_RECEIVER_CID",
  principal "$INFO_CID",
)
EOF

cat <<EOF
SUCCESS: The icp_swap_factory installation files have been created:
icp_swap_factory candid:       $CANDID_FILE
icp_swap_factory Wasm:         $WASM_FILE_GZ
icp_swap_factory install args: $ARG_FILE
EOF
