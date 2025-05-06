#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the ICP Swap Pool installation files:

	- The Wasm and Candid files are downloaded.

	The files are installed at at the locations defined for 'icp_swap_pool' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

ICP_SWAP_POOL_BUILDENV="$DFX_NETWORK"
export ICP_SWAP_POOL_BUILDENV

ICP_SWAP_REPO_URL="https://raw.githubusercontent.com/ICPSwap-Labs/docs/refs/heads/main/_canister/SwapPool"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
CANDID_URL="${ICP_SWAP_REPO_URL}/SwapPool.did"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
WASM_URL="${ICP_SWAP_REPO_URL}/SwapPool.wasm"

CANDID_FILE="$(jq -r .canisters.icp_swap_pool.candid dfx.json)"
WASM_FILE_GZ="$(jq -r .canisters.icp_swap_pool.wasm dfx.json)"
WASM_FILE="${WASM_FILE_GZ%.gz}"
ARG_FILE="$(jq -r .canisters.icp_swap_pool.init_arg_file dfx.json)"

download() {
  : 'Downloads a URL to a given file.'
  # shellcheck disable=SC2016 # The $ in the comment is not meant to be expanded.
  : '* With argument x, the filename is $X_FILE and the URL is $X_URL'
  : '* If the file already exists, the user is prompted whether to overwrite, keeping the existing file by default.'
  local asset asset_url asset_file response
  asset="$1"
  asset_url="${asset^^}_URL"
  asset_file="${asset^^}_FILE"
  : 'If the asset file already exists, ask the user whether to overwrite it.'
  if test -e "${!asset_file}" && read -r -p "Overwrite existing ${!asset_file}? [y/N] " response && [[ "${response,,}" != y* ]]; then
    echo "Using existing ICP Swap Pool $asset file."
  else
    echo "Downloading ${!asset_url} --> ${!asset_file}"
    mkdir -p "$(dirname "${!asset_file}")"
    curl -sSL "${!asset_url}" >"${!asset_file}"
  fi
}

# Download candid and wasm
download candid
download wasm

# Compress Wasm
echo "Compressing Wasm: $WASM_FILE_GZ"
gzip -c "$WASM_FILE" >"$WASM_FILE_GZ"

# Set token config
TOKEN0='record { address = "ryjl3-tyaaa-aaaaa-aaaba-cai"; standard = "icrc-1" }'
TOKEN1='record { address = "mxzaz-hqaaa-aaaar-qaada-cai"; standard = "icrc-1" }'

OWNER_PRINCIPAL="$(dfx identity get-principal)"

# Generate init args
echo "Generating init args..."
rm -f "$ARG_FILE"
mkdir -p "$(dirname "$ARG_FILE")"

cat <<EOF >"$ARG_FILE"
(
  $TOKEN0,
  $TOKEN1,
  principal "$OWNER_PRINCIPAL",
  principal "$OWNER_PRINCIPAL",
  principal "$OWNER_PRINCIPAL"
)
EOF

####
# Success
cat <<EOF
SUCCESS: The icp_swap_pool installation files have been created:
icp_swap_pool candid:       $CANDID_FILE
icp_swap_pool Wasm:         $WASM_FILE_GZ
icp_swap_pool install args: $ARG_FILE
EOF
