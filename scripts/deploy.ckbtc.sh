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
dfx deploy ckbtc_ledger --network "$DFX_NETWORK"

echo "Step 4: deploy kyt canister..."
dfx deploy ckbtc_kyt --network "$DFX_NETWORK"

echo "Step 5: deploy index canister..."
dfx deploy ckbtc_index --network "$DFX_NETWORK"