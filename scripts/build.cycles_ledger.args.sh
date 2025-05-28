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
PRINCIPAL="$(dfx identity get-principal)"

# .. Creates the init args file
rm -f "$ARG_FILE"
mkdir -p "$(dirname "$ARG_FILE")"
cat <<EOF >"$ARG_FILE"
(variant {
  Init = record {
    ledger_id = principal "$CANISTER_ID_CYCLES_LEDGER";
    max_blocks_per_request = 2000;
    minting_account = record { owner = principal "$PRINCIPAL" };
    metadata = vec {};
    transfer_fee = 10_000;
    initial_balances = vec {};
    archive_options = record {
        num_blocks_to_archive = 10_000;
        trigger_threshold = 20_000;
        controller_id = principal "$PRINCIPAL";
        cycles_for_archive_creation = opt 1_000_000_000_000;
        max_message_size_bytes = null;
        node_max_memory_size_bytes = opt 3_221_225_472;
    };
  }
})
EOF

####
# Success
cat <<EOF
SUCCESS: The cycles_ledger argument file has been created:
cycles_ledger install args: $(sha256sum "$ARG_FILE")
EOF