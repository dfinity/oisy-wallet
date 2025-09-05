#!/bin/bash

# Original source
# https://github.com/dfinity/ckBTC-Minter-Frontend/blob/master/local_deploy.sh

DFX_NETWORK=local

echo "Step 1: create canisters..."
dfx canister create ckbtc_ledger --specified-id mc6ru-gyaaa-aaaar-qaaaq-cai --network "$DFX_NETWORK"
dfx canister create ckbtc_minter --specified-id ml52i-qqaaa-aaaar-qaaba-cai --network "$DFX_NETWORK"
dfx canister create ckbtc_kyt --specified-id pvm5g-xaaaa-aaaar-qaaia-cai --network "$DFX_NETWORK"

MINTERID="$(dfx canister id ckbtc_minter --network "$DFX_NETWORK")"
echo "$MINTERID"
LEDGERID="$(dfx canister id ckbtc_ledger --network "$DFX_NETWORK")"
echo "$LEDGERID"
KYTID="$(dfx canister id ckbtc_kyt --network "$DFX_NETWORK")"
echo "$KYTID"

echo "Step 2: deploy minter canister..."
dfx deploy ckbtc_minter --network "$DFX_NETWORK"

echo "Step 3: deploy ledger canister..."
PRINCIPAL="$(dfx identity get-principal)"
dfx deploy ckbtc_ledger --specified-id mc6ru-gyaaa-aaaar-qaaaq-cai --network "$DFX_NETWORK" --argument "(variant {
  Init = record {
     token_symbol = \"ckBTC\";
     token_name = \"Chain key local Bitcoin\";
     minting_account = record { owner = principal \"$MINTERID\" };
     transfer_fee = 11_500;
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

echo "Step 4: deploy kyt canister..."
dfx deploy ckbtc_kyt --network "$DFX_NETWORK"

echo "Step 5: deploy index canister..."
dfx deploy ckbtc_index --network "$DFX_NETWORK"

# Example to mint ckBTC

# BTCADDRESS="$(dfx canister call ckbtc_minter get_btc_address '(record {subaccount=null;})')"
# dfx canister call ckbtc_minter update_balance '(record {subaccount=null;})'
# WITHDRAWALADDRESS="$(dfx canister call ckbtc_minter get_withdrawal_account)"
# echo $BTCADDRESS
# echo $WITHDRAWALADDRESS
#
# cleaned_output=$(echo $WITHDRAWALADDRESS | sed -re 's/^\(|, \)$//g')
#
# dfx canister call ckbtc_ledger icrc1_transfer "(record {from=null; to=$cleaned_output; amount=1000000; fee=null; memo=null; created_at_time=null;})"
#
# Execute the command to get the input string and save the result
# dfx canister call ckbtc_minter retrieve_btc '(record {fee = null; address="bcrt1qu9za0uzzd3kjjecgv7waqq0ynn8dl8l538q0xl"; amount=10000})'

echo "Step 6: transfer ckBTC to principal..."
dfx canister call ckbtc_ledger --network "$DFX_NETWORK" icrc1_transfer "(record {from=null; to=record { owner= principal \"73avq-yvrvj-kuzxq-kttlj-nkaz4-tecy6-biuud-3ymeg-guvci-naire-uqe\";}; amount=100000000; fee=null; memo=null; created_at_time=null;})"
