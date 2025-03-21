#!/usr/bin/env bash
set -euxo pipefail

dfx canister create --all
dfx deploy backend
dfx deploy signer

mkdir -p ./target/ic

./scripts/download.icp.sh
dfx deploy icp_ledger
dfx deploy icp_index

./scripts/download.ckbtc.sh
./scripts/deploy.ckbtc.sh

dfx deploy cketh_minter
dfx deploy cketh_ledger
dfx deploy cketh_index
./scripts/deploy.ckerc20.sh

dfx deploy kong_backend

dfx deploy internet_identity
dfx deploy pouh_issuer
dfx deploy cycles_ledger
dfx deploy cycles_depositor
dfx deploy rewards

scripts/top-up-cycles-ledger-account.sh --cycles 50T
