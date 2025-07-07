#!/bin/bash

# Download ckBTC

DIR=target/ic

if [ ! -d "$DIR" ]; then
  mkdir "$DIR"
fi

IC_COMMIT="03dd6ee6de80c2202f66948692c69c61eb6af54d"

scripts/download-immutable.sh "https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-ckbtc-minter.wasm.gz" /ckbtc_minter.wasm.gz
gunzip --keep --force "$DIR"/ckbtc_minter.wasm.gz

scripts/download-immutable.sh "https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-icrc1-ledger.wasm.gz" "$DIR"/ckbtc_ledger.wasm.gz
gunzip --keep --force "$DIR"/ckbtc_ledger.wasm.gz

scripts/download-immutable.sh "https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-icrc1-index-ng.wasm.gz" "$DIR"/ckbtc_index.wasm.gz
gunzip --keep --force "$DIR"/ckbtc_index.wasm.gz

scripts/download-immutable.sh "https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-ckbtc-kyt.wasm.gz" "$DIR"/ckbtc_kyt.wasm.gz
gunzip --keep --force "$DIR"/ckbtc_kyt.wasm.gz

scripts/download-immutable.sh "https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/bitcoin/ckbtc/minter/ckbtc_minter.did" "$DIR"/ckbtc_minter.did

scripts/download-immutable.sh "https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/ledger_suite/icrc1/ledger/ledger.did" "$DIR"/ckbtc_ledger.did

scripts/download-immutable.sh "https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/ledger_suite/icrc1/index-ng/index-ng.did" "$DIR"/ckbtc_index.did

scripts/download-immutable.sh "https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/bitcoin/ckbtc/kyt/kyt.did" "$DIR"/ckbtc_kyt.did
