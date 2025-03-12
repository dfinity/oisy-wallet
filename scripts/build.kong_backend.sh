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

KONG_REPO_URL="https://raw.githubusercontent.com/KongSwap/kong/refs/heads/main/canisters"
CANDID_URL="${KONG_REPO_URL}/kong_backend.did"
WASM_URL="${KONG_REPO_URL}/kong_backend.wasm.gz"

CANDID_FILE="$(jq -r .canisters.kong_backend.candid dfx.json)"
WASM_FILE="$(jq -r .canisters.kong_backend.wasm dfx.json)"

download() {
  : 'Downloads a URL to a given file.'
  : '* With argument x, the filename is $X_FILE and the URL is $X_URL'
  : '* If the file already exists, the user is prompted whether to overwrite, keeping the existing file by default.'
  local asset asset_url asset_file response
  asset="$1"
  asset_url="${asset^^}_URL"
  asset_file="${asset^^}_FILE"
  : 'If the asset file already exists, ask the user whether to overwrite it.'
  if test -e "${!asset_file}" && read -r -p "Overwrite existing ${!asset_file}? [y/N] " response && [[ "${response,,}" != y* ]]; then
    echo "Using existing kong $asset file."
  else
    echo Downloading ${!asset_url} "-->" ${!asset_file}
    mkdir -p "$(dirname "${!asset_file}")"
    curl -sSL "${!asset_url}" >"${!asset_file}"
  fi
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
