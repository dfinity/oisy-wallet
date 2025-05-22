#!/usr/bin/env bash
[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF

	Populates the ckbtc_ledger init args file.

	# Prerequisites
	This is expected to be run via dfx, and in particular that
	environment variables provided by dfx are set.

	EOF
  exit 0
}
set -euxo pipefail

: START populating the ckbtc_ledger install args file...
ARGS_FILE="$(jq -re .canisters.ckbtc_ledger.init_arg_file dfx.json)"
mkdir -p "$(dirname "$ARGS_FILE")"

PRINCIPAL="$(dfx identity get-principal)"

cat <<EOF >"$ARGS_FILE"
(variant {
  Init = record {
     token_symbol = "ckBTC";
     token_name = "Chain key local Bitcoin";
     minting_account = record { owner = principal "$CANISTER_ID_CKBTC_MINTER" };
     transfer_fee = 11_500;
     metadata = vec {};
     initial_balances = vec { record { record { owner = principal "$PRINCIPAL"; }; 100_000_000_000; }; };
     archive_options = record {
         num_blocks_to_archive = 10_000;
         trigger_threshold = 20_000;
         controller_id = principal "$PRINCIPAL";
         cycles_for_archive_creation = opt 1_000_000_000_000;
         max_message_size_bytes = null;
         node_max_memory_size_bytes = opt 3_221_225_472;
     };
     feature_flags  = opt record { icrc2 = true };
 }
})
EOF
: FINISH populating the ckbtc_ledger install args file.
