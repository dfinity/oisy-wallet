#!/bin/bash

DFX_NETWORK=local

echo "Step 1: create canisters..."
dfx canister create cketh_ledger --network "$DFX_NETWORK"
dfx canister create cketh_minter --network "$DFX_NETWORK"

LEDGERID="$(dfx canister id cketh_ledger --network "$DFX_NETWORK")"
echo "$LEDGERID"

echo "Step 2: deploy minter canister..."

# ckETH minter deployed on using the smart contract address on Sepolia used by testnet.
# We can alternatively also deploy our own contract.

dfx deploy cketh_minter --network "$DFX_NETWORK"

echo "Step 3: deploy ledger canister..."
dfx deploy cketh_ledger --network "$DFX_NETWORK"

echo "Step 4: deploy index canister..."
dfx deploy cketh_index --specified-id sh5u2-cqaaa-aaaar-qacna-cai --network "$DFX_NETWORK" --argument "(opt variant {
  Init = record {
    ledger_id = principal \"$LEDGERID\";
   }
})"

echo "Step 5: transfer ckETH to principal..."
dfx canister call cketh_ledger --network "$DFX_NETWORK" icrc1_transfer "(record {from=null; to=record { owner= principal \"x4w27-so7wg-cudsa-yy7fh-wcpy5-njul4-q54tv-euzzi-tdnzz-ill46-zqe\";}; amount=500_000_000_000_000_000; fee=null; memo=null; created_at_time=null;})"
