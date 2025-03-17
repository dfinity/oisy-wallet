#!/bin/bash

DFX_NETWORK=local

echo "Step 1: create canisters..."
dfx canister create cketh_ledger --network "$DFX_NETWORK"
dfx canister create cketh_minter --network "$DFX_NETWORK"

echo "Step 2: deploy minter canister..."

# ckETH minter deployed on using the smart contract address on Sepolia used by testnet.
# We can alternatively also deploy our own contract.

dfx deploy cketh_minter --network "$DFX_NETWORK"

echo "Step 3: deploy ledger canister..."
dfx deploy cketh_ledger --network "$DFX_NETWORK"

echo "Step 4: deploy index canister..."
dfx deploy cketh_index --network "$DFX_NETWORK"
