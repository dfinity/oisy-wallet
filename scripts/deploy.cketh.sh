#!/bin/bash

DFX_NETWORK=local

echo "Step 1: create canisters..."
dfx canister create cketh_ledger --network "$DFX_NETWORK"
dfx canister create cketh_minter --network "$DFX_NETWORK"

MINTERID="$(dfx canister id cketh_minter --network "$DFX_NETWORK")"
echo "$MINTERID"
LEDGERID="$(dfx canister id cketh_ledger --network "$DFX_NETWORK")"
echo "$LEDGERID"

echo "Step 2: deploy minter canister..."

# TODO: those parameters - the contract address - is not yet correct. It's unclear where the ckETH Minter should point when deployed locally.

dfx deploy cketh_minter --network "$DFX_NETWORK" --argument "(variant {
  InitArg = record {
       ethereum_network = variant {Sepolia};
       ecdsa_key_name = \"key_1\";
       ethereum_contract_address = opt \"0x111B5e756A894775FC32EDdf3314Bb1B1944dC34\";
       ledger_id = principal \"$LEDGERID\";
       ethereum_block_height = variant {Finalized};
       minimum_withdrawal_amount = 10_000_000_000_000_000;
       next_transaction_nonce = 209;
       last_scraped_block_number = 1;
   }
})"

echo "Step 3: deploy ledger canister..."
PRINCIPAL="$(dfx identity get-principal)"
dfx deploy cketh_ledger --network "$DFX_NETWORK" --argument "(variant {
  Init = record {
     token_symbol = \"ckSepoliaETH\";
     token_name = \"Chain key local Sepolia Ethereum\";
     decimals = opt 18;
     max_memo_length = opt 80;
     minting_account = record { owner = principal \"$MINTERID\" };
     transfer_fee = 9_500;
     metadata = vec {};
     initial_balances = vec { record { record { owner = principal \"$PRINCIPAL\"; }; 100_000_000_000; }; };
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
dfx canister call cketh_ledger --network "$DFX_NETWORK" icrc1_transfer "(record {from=null; to=record { owner= principal \"73avq-yvrvj-kuzxq-kttlj-nkaz4-tecy6-biuud-3ymeg-guvci-naire-uqe\";}; amount=100000000; fee=null; memo=null; created_at_time=null;})"
