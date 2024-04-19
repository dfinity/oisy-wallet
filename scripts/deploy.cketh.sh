#!/bin/bash

DFX_NETWORK=local

function deploy {
    local LEDGER_CANISTER=$1
    local INDEX_CANISTER=$2

    echo "Step 1: create canisters..."
    dfx canister create "$LEDGER_CANISTER" --network "$DFX_NETWORK"
    dfx canister create "$INDEX_CANISTER" --network "$DFX_NETWORK"

    local MINTERID="$(dfx canister id "$INDEX_CANISTER" --network "$DFX_NETWORK")"
    echo "$MINTERID"
    local LEDGERID="$(dfx canister id "$LEDGER_CANISTER" --network "$DFX_NETWORK")"
    echo "$LEDGERID"

    echo "Step 2: deploy minter canister..."

    # ckETH minter deployed on using the smart contract address on Sepolia used by testnet.
    # We can alternatively also deploy our own contract.

    dfx deploy "$INDEX_CANISTER" --network "$DFX_NETWORK" --argument "(variant {
      InitArg = record {
           ethereum_network = variant {Sepolia};
           ecdsa_key_name = \"dfx_test_key\";
           ethereum_contract_address = opt \"0xb44B5e756A894775FC32EDdf3314Bb1B1944dC34\";
           ledger_id = principal \"$LEDGERID\";
           ethereum_block_height = variant {Finalized};
           minimum_withdrawal_amount = 10_000_000_000_000_000;
           next_transaction_nonce = 209;
           last_scraped_block_number = 5371702;
       }
    })"

    echo "Step 3: deploy ledger canister..."
    PRINCIPAL="$(dfx identity get-principal)"
    dfx deploy "$LEDGER_CANISTER" --network "$DFX_NETWORK" --argument "(variant {
      Init = record {
         token_symbol = \"ckSepoliaETH\";
         token_name = \"Chain key local Sepolia Ethereum\";
         decimals = opt 18;
         max_memo_length = opt 80;
         minting_account = record { owner = principal \"$MINTERID\" };
         transfer_fee = 9_500;
         metadata = vec {};
         initial_balances = vec { record { record { owner = principal \"$PRINCIPAL\"; }; 100_000_000_000_000_000_000; }; };
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

    echo "Step 4: deploy index canister..."
    dfx deploy cketh_index --network "$DFX_NETWORK" --argument "(opt variant {
      Init = record {
        ledger_id = principal \"$LEDGERID\";
       }
    })"

    echo "Step 5: transfer ckETH to principal..."
    dfx canister call "$LEDGER_CANISTER" --network "$DFX_NETWORK" icrc1_transfer "(record {from=null; to=record { owner= principal \"x4w27-so7wg-cudsa-yy7fh-wcpy5-njul4-q54tv-euzzi-tdnzz-ill46-zqe\";}; amount=500_000_000_000_000_000; fee=null; memo=null; created_at_time=null;})"
}

deploy cketh_ledger cketh_index
deploy ckusdc_ledger ckusdc_index
