#!/bin/bash

# Download ICP ledger and index canisters

DIR=target/ic

if [ ! -d "$DIR" ]; then
  mkdir "$DIR"
fi

IC_VERSION=03dd6ee6de80c2202f66948692c69c61eb6af54d

curl -o "$DIR"/icp_index.wasm.gz "https://download.dfinity.systems/ic/$IC_VERSION/canisters/ic-icp-index-canister.wasm.gz"
gunzip "$DIR"/icp_index.wasm.gz
curl -o "$DIR"/icp_index.did "https://raw.githubusercontent.com/dfinity/ic/$IC_VERSION/rs/ledger_suite/icp/index/index.did"

curl -o "$DIR"/icp_ledger.wasm.gz "https://download.dfinity.systems/ic/$IC_VERSION/canisters/ledger-canister.wasm.gz"
gunzip "$DIR"/icp_ledger.wasm.gz
curl -o "$DIR"/icp_ledger.did "https://raw.githubusercontent.com/dfinity/ic/$IC_VERSION/rs/ledger_suite/icp/ledger.did"
