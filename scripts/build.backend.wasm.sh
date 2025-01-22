#!/usr/bin/env bash
set -euxo pipefail

CANISTER="backend"
export CANISTER

####
# Builds the Wasm without metadata
cargo build --locked --target wasm32-unknown-unknown --release -p $CANISTER
