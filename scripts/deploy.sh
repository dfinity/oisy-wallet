#!/usr/bin/env bash

dfx canister create internet_identity --specified-id rdmx6-jaaaa-aaaaa-aaadq-cai
dfx canister create pouh_issuer --specified-id qbw6f-caaaa-aaaah-qdcwa-cai

./scripts/deploy.signer.sh
./scripts/deploy.backend.sh

mkdir -p ./target/ic

./scripts/download.icp.sh
./scripts/deploy.icp_ledger.sh
./scripts/deploy.icp_index.sh

./scripts/download.ckbtc.sh
./scripts/deploy.ckbtc.sh

./scripts/download.cketh.sh
./scripts/deploy.cketh.sh
./scripts/deploy.ckerc20.sh

dfx deploy internet_identity --specified-id rdmx6-jaaaa-aaaaa-aaadq-cai
dfx deploy pouh_issuer --specified-id qbw6f-caaaa-aaaah-qdcwa-cai
dfx deploy cycles_ledger
dfx deploy cycles_depositor

scripts/top-up-cycles-ledger-account.sh --cycles 50T
