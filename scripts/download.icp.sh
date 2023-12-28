#!/bin/bash

# Download ICP ledger and index canisters

DIR=target/ic

if [ ! -d "$DIR" ]; then
  mkdir "$DIR"
fi

IC_VERSION=d87954601e4b22972899e9957e800406a0a6b929

curl -o "$DIR"/icp_index.wasm.gz "https://download.dfinity.systems/ic/$IC_VERSION/canisters/ic-icp-index-canister.wasm.gz"
gunzip "$DIR"/icp_index.wasm.gz
curl -o "$DIR"/icp_index.did "https://raw.githubusercontent.com/dfinity/ic/$IC_VERSION/rs/rosetta-api/icp_ledger/index/index.did"

curl -o "$DIR"/icp_ledger.wasm.gz "https://download.dfinity.systems/ic/$IC_VERSION/canisters/ledger-canister.wasm.gz"
gunzip "$DIR"/icp_ledger.wasm.gz
curl -o "$DIR"/icp_ledger.did "https://raw.githubusercontent.com/dfinity/ic/$IC_VERSION/rs/rosetta-api/icp_ledger/ledger.did"
