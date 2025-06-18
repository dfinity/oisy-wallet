#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the Kong Backend installation files:

	- The Wasm and Candid files are downloaded.

	The files are installed at at the locations defined for 'kong_backend' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

KONG_BUILDENV="$DFX_NETWORK"
export KONG_BUILDENV

KONG_REPO_URL="https://raw.githubusercontent.com/KongSwap/kong/bea79b2f2259e5bd5a29739297d4a9f5db4fb19a/wasm"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
CANDID_URL="${KONG_REPO_URL}/kong_backend.did"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
WASM_URL="${KONG_REPO_URL}/kong_backend.wasm.gz"

CANDID_FILE="$(jq -r .canisters.kong_backend.candid dfx.json)"
WASM_FILE="$(jq -r .canisters.kong_backend.wasm dfx.json)"

download() {
  : 'Downloads a URL to a given file.'
  # shellcheck disable=SC2016 # The $ in the comment is not meant to be expanded.
  local asset asset_url asset_file
  asset="$1"
  asset_url="${asset^^}_URL"
  asset_file="${asset^^}_FILE"
  scripts/download-immutable.sh "${!asset_url}" "${!asset_file}"
}

####
# Downloads the candid file, if it does not exist already.
download candid

####
# Downloads the Wasm file, if it does not exist already.
download wasm

####
# Success
cat <<EOF
SUCCESS: The kong_backend installation files have been created:
kong_backend candid:       $CANDID_FILE
kong_backend Wasm:         $WASM_FILE
EOF
