#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the OISY TRADE installation files:

	- The Wasm and Candid files are downloaded.

	The files are installed at the locations defined for 'oisy_trade' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

OISY_TRADE_BUILDENV="$DFX_NETWORK"
export OISY_TRADE_BUILDENV

# Candid + Wasm pinned to a tagged oisy-trade release (kong/icp_swap-style).
# v0.2.0 is the first release exposing the time-in-force / fill-or-kill
# parameter the feature targets, so candid and wasm now come from one release
# (no more candid-on-a-commit + older-wasm split).
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
CANDID_URL="https://github.com/dfinity/oisy-trade/releases/download/oisy_trade_canister-v0.2.0/oisy_trade.did"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
WASM_URL="https://github.com/dfinity/oisy-trade/releases/download/oisy_trade_canister-v0.2.0/oisy_trade_canister.wasm.gz"

CANDID_FILE="$(jq -r .canisters.oisy_trade.candid dfx.json)"
WASM_FILE="$(jq -r .canisters.oisy_trade.wasm dfx.json)"

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
SUCCESS: The oisy_trade installation files have been created:
oisy_trade candid:       $CANDID_FILE
oisy_trade Wasm:         $WASM_FILE
EOF
