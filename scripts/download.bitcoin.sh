#!/bin/bash

# Download Bitcoin canister

DIR=target/ic

mkdir -p "$DIR"

BITCOIN_CANISTER_RELEASE="2024-08-30"

scripts/download-immutable.sh "https://github.com/dfinity/bitcoin-canister/releases/download/release%2F${BITCOIN_CANISTER_RELEASE}/ic-btc-canister.wasm.gz" "$DIR"/bitcoin.wasm.gz
gunzip -f "$DIR"/bitcoin.wasm.gz

scripts/download-immutable.sh "https://github.com/dfinity/bitcoin-canister/raw/refs/tags/release/${BITCOIN_CANISTER_RELEASE}/canister/candid.did" "$DIR"/bitcoin.did