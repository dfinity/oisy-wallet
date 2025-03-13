#!/usr/bin/env bash
set -euo pipefail

ARG_FILE="$(jq -re .canisters.cketh_minter.init_arg_file dfx.json)"

mkdir -p "$(dirname "$ARG_FILE")"

cat <<EOF >"$ARG_FILE"
(variant {
  InitArg = record {
       ethereum_network = variant {Sepolia};
       ecdsa_key_name = "dfx_test_key";
       ethereum_contract_address = opt "0xb44B5e756A894775FC32EDdf3314Bb1B1944dC34";
       ledger_id = principal "$CANISTER_ID_CKETH_LEDGER";
       ethereum_block_height = variant {Finalized};
       minimum_withdrawal_amount = 10_000_000_000_000_000;
       next_transaction_nonce = 209;
       last_scraped_block_number = 5371702;
   }
})
EOF
