#!/usr/bin/env bash
set -euxo pipefail

dfx canister create --all
dfx deploy backend
./scripts/deploy.signer.sh

mkdir -p ./target/ic

./scripts/download.icp.sh
./scripts/deploy.icp_ledger.sh
./scripts/deploy.icp_index.sh

./scripts/download.ckbtc.sh
./scripts/deploy.ckbtc.sh

./scripts/download.cketh.sh
./scripts/deploy.cketh.sh
./scripts/deploy.ckerc20.sh

./scripts/deploy.kong_backend.sh

dfx deploy internet_identity --specified-id rdmx6-jaaaa-aaaaa-aaadq-cai
dfx deploy pouh_issuer --specified-id qbw6f-caaaa-aaaah-qdcwa-cai
dfx deploy cycles_ledger
dfx deploy cycles_depositor
dfx deploy rewards

scripts/top-up-cycles-ledger-account.sh --cycles 50T
