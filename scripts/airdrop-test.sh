#!/usr/bin/env bash

set -eExuo pipefail

rm -rf .dfx

dfx canister create --all

dfx build

dfx canister install airdrop_backend

dfx canister call airdrop_backend generate_codes_seed '(123456, 5)'
dfx canister call airdrop_backend redeem_code '(record { ii = "ii"; code = "CODE-1"; eth_address = "eth_address" })'
dfx canister call airdrop_backend get_children_codes_for_ii '("ii")'
dfx canister call airdrop_backend get_eth_addresses_and_amounts

# check that we cannot redeem code more than once
dfx canister call airdrop_backend redeem_code '(record { ii = "ii"; code = "CODE-1"; eth_address = "eth_address" })'

# check we get the same children everytime
dfx canister call airdrop_backend get_children_codes_for_ii '("ii")'

# check that we can actually kill the cannister
dfx canister call airdrop_backend kill_canister '(principal "x4vfd-jmrw4-tmcei-ufucn-lhhtk-gfoei-724ky-fz6b7-tefuy-4sewq-sae")'

# this call should not execute
dfx canister call airdrop_backend get_children_codes_for_ii '("ii")'
