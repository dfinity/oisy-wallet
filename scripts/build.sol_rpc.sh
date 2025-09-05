#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the Solana RPC installation files:

	- The Wasm and Candid files are downloaded.
	- The installation args are computed based on the target network,
	      determined by the DFX_NETWORK environment variable.

	The files are installed at at the locations defined for 'sol_rpc' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

DFX_NETWORK="${DFX_NETWORK:-local}"

SOL_RPC_RELEASE="v1.0.0"
SOL_RPC_RELEASE_URL="https://github.com/dfinity/sol-rpc-canister/releases/download/${SOL_RPC_RELEASE}"
CANDID_URL="${SOL_RPC_RELEASE_URL}/sol_rpc_canister.did"
WASM_URL="${SOL_RPC_RELEASE_URL}/sol_rpc_canister.wasm.gz"

CANDID_FILE="$(jq -r .canisters.sol_rpc.candid dfx.json)"
WASM_FILE="$(jq -r .canisters.sol_rpc.wasm dfx.json)"
ARG_FILE="$(jq -r .canisters.sol_rpc.init_arg_file dfx.json)"

####
# Downloads the candid file
scripts/download-immutable.sh "$CANDID_URL" "$CANDID_FILE"

####
# Downloads the Wasm file
scripts/download-immutable.sh "$WASM_URL" "$WASM_FILE"

####
# Computes the install args, overwriting any existing args file.
scripts/build.sol_rpc.args.sh

# Success
cat <<EOF
SUCCESS: The sol_rpc installation files have been created:
sol_rpc candid:       $CANDID_FILE
sol_rpc Wasm:         $WASM_FILE
sol_rpc install args: $ARG_FILE
EOF
