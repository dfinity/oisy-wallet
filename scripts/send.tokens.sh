#!/bin/bash

# Utility Script: Send Tokens to a Local User
# Particularly handy after installing the canisters for the first time or being forced by dfx to clean the local state.

if [ -z "$1" ]; then
  read -r -p "Enter the PRINCIPAL: " PRINCIPAL
else
  PRINCIPAL=$1
fi

DFX_NETWORK=local

dfx canister call ckbtc_ledger --network "$DFX_NETWORK" icrc1_transfer "(record {from=null; to=record { owner= principal \"$PRINCIPAL\";}; amount=1000000000; fee=null; memo=null; created_at_time=null;})"
dfx canister call cketh_ledger --network "$DFX_NETWORK" icrc1_transfer "(record {from=null; to=record { owner= principal \"$PRINCIPAL\";}; amount=77000000000; fee=null; memo=null; created_at_time=null;})"
dfx canister call icp_ledger --network "$DFX_NETWORK" icrc1_transfer "(record {from=null; to=record { owner= principal \"$PRINCIPAL\";}; amount=120000000; fee=null; memo=null; created_at_time=null;})"
