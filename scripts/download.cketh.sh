#!/bin/bash

# Download ckETH

DIR=target/ic

if [ ! -d "$DIR" ]; then
  mkdir "$DIR"
fi

IC_COMMIT="43f31c0a1b0d9f9ecbc4e2e5f142c56c7d9b0c7b"

curl -sSL https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-cketh-minter.wasm.gz -o "$DIR"/cketh_minter.wasm.gz
gunzip "$DIR"/cketh_minter.wasm.gz

curl -sSL https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-icrc1-ledger.wasm.gz -o "$DIR"/cketh_ledger.wasm.gz
gunzip "$DIR"/cketh_ledger.wasm.gz

curl -sSL https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-icrc1-index-ng.wasm.gz -o "$DIR"/cketh_index.wasm.gz
gunzip "$DIR"/cketh_index.wasm.gz

curl -sSL https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/ethereum/cketh/minter/cketh_minter.did -o "$DIR"/cketh_minter.did

curl -sSL https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/rosetta-api/icrc1/ledger/ledger.did -o "$DIR"/cketh_ledger.did

curl -sSL https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/rosetta-api/icrc1/index-ng/index-ng.did -o "$DIR"/cketh_index.did
