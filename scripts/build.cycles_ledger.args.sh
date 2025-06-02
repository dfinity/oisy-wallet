#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the cycles_ledger installation arguments.

	The file is installed at the location defined for 'cycles_ledger' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

DFX_NETWORK="${DFX_NETWORK:-local}"
ARG_FILE="$(jq -r .canisters.cycles_ledger.init_arg_file dfx.json)"

####
# Computes the install args, overwriting any existing args file.

CANISTER_ID_CYCLES_LEDGER="${CANISTER_ID_CYCLES_LEDGER:-$(dfx canister id cycles_ledger --network "$DFX_NETWORK")}"

# .. Creates the init args file
rm -f "$ARG_FILE"
mkdir -p "$(dirname "$ARG_FILE")"
cat <<EOF >"$ARG_FILE"
(variant {
  Init = record {
    index_id = null;
    max_blocks_per_request = 9_999 : nat64
   }
})
EOF

####
# Success
cat <<EOF
SUCCESS: The cycles_ledger argument file has been created:
cycles_ledger install args: $(sha256sum "$ARG_FILE")
EOF