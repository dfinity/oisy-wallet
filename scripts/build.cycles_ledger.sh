#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
		Creates the cycles_ledger installation files:

		- The Wasm and Candid files are downloaded.
		- The installation args are computed based on the target network,
		      determined by the DFX_NETWORK environment variable.

		The files are installed at at the locations defined for 'cycles_ledger' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

DFX_NETWORK="${DFX_NETWORK:-local}"

LEDGER_RELEASE="v1.0.1"
CANDID_URL="https://github.com/dfinity/cycles-ledger/releases/download/cycles-ledger-${LEDGER_RELEASE}/cycles-ledger.did"
WASM_URL="https://github.com/dfinity/cycles-ledger/releases/download/cycles-ledger-${LEDGER_RELEASE}/cycles-ledger.wasm.gz"

CANDID_FILE="$(jq -r .canisters.cycles_ledger.candid dfx.json)"
WASM_FILE="$(jq -r .canisters.cycles_dledger.wasm dfx.json)"
ARG_FILE="$(jq -r .canisters.cycles_ledger.init_arg_file dfx.json)"

####
# Downloads the candid file, if it does not exist already.
if test -e "$CANDID_FILE"; then
  echo "Using existing cycles_ledger candid file"
else
  mkdir -p "$(dirname "$CANDID_FILE")"
  curl -sSL "$CANDID_URL" >"$CANDID_FILE"
fi

####
# Downloads the Wasm file, if it does not exist already.
if test -e "$WASM_FILE"; then
  echo "Using existing cycles_ledger Wasm file"
else
  mkdir -p "$(dirname "$WASM_FILE")"
  curl -sSL "$WASM_URL" >"$WASM_FILE"
fi

####
# Computes the install args, overwriting any existing args file.
scripts/build.cycles_ledger.args.sh

# Success
cat <<EOF
SUCCESS: The cycles_ledger installation files have been created:
cycles_ledger candid:       $CANDID_FILE
cycles_ledger Wasm:         $WASM_FILE
cycles_ledger install args: $ARG_FILE
EOF
