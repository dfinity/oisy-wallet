#!/bin/bash

# Download ckBTC

DIR=target/ic

if [ ! -d "$DIR" ]; then
  mkdir "$DIR"
fi

IC_COMMIT="43f31c0a1b0d9f9ecbc4e2e5f142c56c7d9b0c7b"

curl -sSL https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-ckbtc-minter.wasm.gz -o "$DIR"/ckbtc_minter.wasm.gz
gunzip "$DIR"/ckbtc_minter.wasm.gz

curl -sSL https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-icrc1-ledger.wasm.gz -o "$DIR"/ckbtc_ledger.wasm.gz
gunzip -k "$DIR"/ckbtc_ledger.wasm.gz

curl -sSL https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-icrc1-index-ng.wasm.gz -o "$DIR"/ckbtc_index.wasm.gz
gunzip -k "$DIR"/ckbtc_index.wasm.gz

curl -sSL https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-ckbtc-kyt.wasm.gz -o "$DIR"/ckbtc_kyt.wasm.gz
gunzip "$DIR"/ckbtc_kyt.wasm.gz

curl -sSL https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/bitcoin/ckbtc/minter/ckbtc_minter.did -o "$DIR"/ckbtc_minter.did

curl -sSL https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/ledger_suite/icrc1/ledger/ledger.did -o "$DIR"/ckbtc_ledger.did

curl -sSL https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/ledger_suite/icrc1/index-ng/index-ng.did -o "$DIR"/ckbtc_index.did

curl -sSL https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/bitcoin/ckbtc/kyt/kyt.did -o "$DIR"/ckbtc_kyt.did
