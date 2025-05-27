#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
		Creates the cycles_depositor installation files:

		- The Wasm and Candid files are downloaded.
		- The installation args are computed based on the target network,
		      determined by the DFX_NETWORK environment variable.

		The files are installed at at the locations defined for 'cycles_depositor' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

DFX_NETWORK="${DFX_NETWORK:-local}"

LEDGER_RELEASE="v1.0.1"
CANDID_URL="https://github.com/dfinity/cycles-ledger/releases/download/cycles-ledger-${LEDGER_RELEASE}/depositor.did"
WASM_URL="https://github.com/dfinity/cycles-ledger/releases/download/cycles-ledger-${LEDGER_RELEASE}/depositor.wasm.gz"

CANDID_FILE="$(jq -r .canisters.cycles_depositor.candid dfx.json)"
WASM_FILE="$(jq -r .canisters.cycles_depositor.wasm dfx.json)"
ARG_FILE="$(jq -r .canisters.cycles_depositor.init_arg_file dfx.json)"

####
# Downloads the candid file
scripts/download-immutable.sh "$CANDID_URL" "$CANDID_FILE"

####
# Downloads the Wasm file
scripts/download-immutable.sh "$WASM_URL" "$WASM_FILE"

####
# Computes the install args, overwriting any existing args file.
scripts/build.cycles_depositor.args.sh

# Success
cat <<EOF
SUCCESS: The cycles_depositor installation files have been created:
cycles_depositor candid:       $CANDID_FILE
cycles_depositor Wasm:         $WASM_FILE
cycles_depositor install args: $ARG_FILE
EOF
