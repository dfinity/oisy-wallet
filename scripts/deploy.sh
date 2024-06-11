#!/usr/bin/env bash

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


