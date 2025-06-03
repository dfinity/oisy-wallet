#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the Kong Backend installation files:

	- The Wasm and Candid files are downloaded.

	The files are installed at at the locations defined for 'cycles_ledger' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

CYCLES_LEDGER_BUILDENV="$DFX_NETWORK"
export CYCLES_LEDGER_BUILDENV
LEDGER_RELEASE="v1.0.1"
CYCLES_LEDGER_REPO_URL="https://github.com/dfinity/cycles-ledger/releases/download/cycles-ledger-${LEDGER_RELEASE}"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
CANDID_URL="${CYCLES_LEDGER_REPO_URL}/cycles-ledger.did"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
WASM_URL="${CYCLES_LEDGER_REPO_URL}/cycles-ledger.wasm.gz"

CANDID_FILE="$(jq -r .canisters.cycles_ledger.candid dfx.json)"
WASM_FILE="$(jq -r .canisters.cycles_ledger.wasm dfx.json)"

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
SUCCESS: The cycles_ledger installation files have been created:
cycles_ledger candid:       $CANDID_FILE
cycles_ledger Wasm:         $WASM_FILE
EOF

./scripts/build.cycles_ledger.args.sh
