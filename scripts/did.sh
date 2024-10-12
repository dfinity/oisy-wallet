#!/usr/bin/env bash

CARGO_PROFILE="${CARGO_PROFILE:-release}"

function generate_did() {
  local canister=$1
  canister_root="src/$canister"

  if [[ "$CARGO_PROFILE" == "release" ]]; then
    BUILD_FLAG="--release"
  else
    BUILD_FLAG="--profile $CARGO_PROFILE"
  fi

  test -e "target/wasm32-unknown-unknown/$CARGO_PROFILE/$canister.wasm" ||
    cargo build --manifest-path="$canister_root/Cargo.toml" \
      --target wasm32-unknown-unknown \
      $BUILD_FLAG --package "$canister"

  # cargo install candid-extractor
  candid-extractor "target/wasm32-unknown-unknown/$CARGO_PROFILE/$canister.wasm" >"$canister_root/$canister.did"
}

CANISTERS=backend

for canister in $(echo $CANISTERS | sed "s/,/ /g"); do
  generate_did "$canister"
done
