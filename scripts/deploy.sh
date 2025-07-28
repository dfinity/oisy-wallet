#!/usr/bin/env bash
set -euxo pipefail

dfx canister create --all
dfx deploy backend
dfx deploy signer
dfx deploy icp_ledger
dfx deploy icp_index

./scripts/download.ckbtc.sh
./scripts/deploy.ckbtc.sh

dfx deploy cketh_minter
dfx deploy cketh_ledger
dfx deploy cketh_index
dfx deploy ckusdc_ledger
dfx deploy ckusdc_index

dfx deploy kong_backend
dfx deploy icp_swap_factory
dfx deploy icp_swap_pool

dfx deploy internet_identity
dfx deploy pouh_issuer
dfx deploy cycles_ledger
dfx deploy cycles_depositor
dfx deploy rewards
dfx deploy llm

dfx deploy sol_rpc

scripts/top-up-cycles-ledger-account.sh --cycles 50T
