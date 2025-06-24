#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the Solana RPC installation arguments.

	The file is installed at the location defined for 'sol_rpc' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

DFX_NETWORK="${DFX_NETWORK:-local}"
ARG_FILE="$(jq -r .canisters.sol_rpc.init_arg_file dfx.json)"

####
# Computes the install args, overwriting any existing args file.

CANISTER_ID_SOL_RPC="${CANISTER_ID_SOL_RPC:-$(dfx canister id sol_rpc --network "$DFX_NETWORK")}"

# .. Creates the init args file
rm -f "$ARG_FILE"
mkdir -p "$(dirname "$ARG_FILE")"
cat <<EOF >"$ARG_FILE"
(record {})
EOF

####
# Success
cat <<EOF
SUCCESS: The sol_rpc argument file has been created:
sol_rpc install args: $(sha256sum "$ARG_FILE")
EOF
