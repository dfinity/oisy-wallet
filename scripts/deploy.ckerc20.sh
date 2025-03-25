#!/bin/bash

DFX_NETWORK=local

MINTERID="$(dfx canister id cketh_minter --network "$DFX_NETWORK")"
echo "$MINTERID"

function deploy_ckerc20 {
  local LEDGER_CANISTER=$1
  local LEDGER_CANISTER_ID=$2
  local INDEX_CANISTER=$3
  local TOKEN_SYMBOL=$5
  local TOKEN_NAME=$6
  local DECIMALS=$7

  echo "Step A: create ledger canisters..."
  dfx canister create "$LEDGER_CANISTER" --network "$DFX_NETWORK"

  echo "Step B: deploy ledger canister..."
  PRINCIPAL="$(dfx identity get-principal)"

  dfx deploy "$LEDGER_CANISTER" --network "$DFX_NETWORK" --argument "(variant {
      Init = record {
         token_symbol = \"$TOKEN_SYMBOL\";
         token_name = \"$TOKEN_NAME\";
         decimals = opt $DECIMALS;
         max_memo_length = opt 80;
         minting_account = record { owner = principal \"$MINTERID\" };
         transfer_fee = 9_500;
         metadata = vec {};
         initial_balances = vec {
	   record { record { owner = principal \"$PRINCIPAL\"; }; 100_000_000_000_000_000_000; };
	   record { record { owner = principal \"x4w27-so7wg-cudsa-yy7fh-wcpy5-njul4-q54tv-euzzi-tdnzz-ill46-zqe\"; }; 500_000_000_000_000_000; };
         };
         archive_options = record {
             num_blocks_to_archive = 10_000;
             trigger_threshold = 20_000;
             controller_id = principal \"$PRINCIPAL\";
             cycles_for_archive_creation = opt 1_000_000_000_000;
             max_message_size_bytes = null;
             node_max_memory_size_bytes = opt 3_221_225_472;
         };
         feature_flags  = opt record { icrc2 = true };
     }
    })"

  echo "Step C: deploy index canister..."
  dfx deploy "$INDEX_CANISTER" --network "$DFX_NETWORK" --argument "(opt variant {
      Init = record {
        ledger_id = principal \"$LEDGER_CANISTER_ID\";
       }
    })"
}

deploy_ckerc20 ckusdc_ledger "yfumr-cyaaa-aaaar-qaela-cai" ckusdc_index "ycvkf-paaaa-aaaar-qaelq-cai" "ckSepoliaUSDC" "Chain key Sepolia USDC" 6
