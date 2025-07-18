#!/usr/bin/env bash
[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF

	Populates the ckbtc_minter init args file.

	# Prerequisites
	This is expected to be run via dfx, and in particular that
	environment variables provided by dfx are set.

	EOF
  exit 0
}
set -euxo pipefail

: START populating the ckbtc_minter install args file...
ARGS_FILE="$(jq -re .canisters.ckbtc_minter.init_arg_file dfx.json)"
mkdir -p "$(dirname "$ARGS_FILE")"

cat <<EOF >"$ARGS_FILE"
(variant {
  Init = record {
       btc_network = variant { Regtest };
       ledger_id = principal "$CANISTER_ID_CKBTC_LEDGER";
       ecdsa_key_name = "dfx_test_key";
       retrieve_btc_min_amount = 10_000;
       max_time_in_queue_nanos = 420_000_000_000;
       min_confirmations = opt 12;
       mode = variant { GeneralAvailability };
       kyt_fee = opt 1_333;
       kyt_principal = opt principal "$CANISTER_ID_CKBTC_KYT";
   }
})
EOF
: FINISH populating the ckbtc_minter install args file.
