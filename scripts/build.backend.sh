#!/usr/bin/env bash
set -euxo pipefail

scripts/build.backend.args.sh

WASM_FILE="$(jq -r .canisters.backend.wasm dfx.json)"
BUILD_DIR="target/wasm32-unknown-unknown/release"
mkdir -p "$(dirname "$WASM_FILE")"

cargo build --locked --target wasm32-unknown-unknown --release -p backend
cp "$BUILD_DIR/backend.wasm" "$WASM_FILE"