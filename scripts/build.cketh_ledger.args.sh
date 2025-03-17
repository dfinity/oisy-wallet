#!/usr/bin/env bash
set -euo pipefail

PRINCIPAL="$(dfx identity get-principal)"
ARG_FILE="$(jq -re .canisters.cketh_ledger.init_arg_file dfx.json)"

mkdir -p "$(dirname "$ARG_FILE")"

cat <<-EOF >"$ARG_FILE"
(variant {
  Init = record {
     token_symbol = "ckSepoliaETH";
     token_name = "Chain key local Sepolia Ethereum";
     decimals = opt 18;
     max_memo_length = opt 80;
     minting_account = record { owner = principal "$CANISTER_ID_CKETH_MINTER" };
     transfer_fee = 9_500;
     metadata = vec {};
     initial_balances = vec {
        record { record { owner = principal "$PRINCIPAL"; }; 100_000_000_000_000_000_000; };
        record {from=null; to=record { owner= principal "x4w27-so7wg-cudsa-yy7fh-wcpy5-njul4-q54tv-euzzi-tdnzz-ill46-zqe";}; amount=500_000_000_000_000_000; fee=null; memo=null; created_at_time=null;}
     };
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
