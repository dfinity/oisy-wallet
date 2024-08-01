#!/usr/bin/env bash

# Gets all .did files listed in dfx.json as http URLs.
#
# .did files are placed in the local .dfx directory, where the .did files are expected by `dfx generate` and other commands.
function get_remote_did_files() {
	jq -r '.canisters | to_entries | .[] | select(.value.candid != null) | "\(.key) \(.value.candid)"' dfx.json |
    while read -r line; do
      IFS=', ' read -r -a array <<<"$line"
      canister_name="${array[0]}"
      source="${array[1]}"
      destination=".dfx/local/canisters/${array[0]}/${array[0]}.did"
      mkdir -p "$(dirname "$destination")"
      case "$source" in
	      http*) curl -sSL "$source" >"$destination" ;;
	      *) if test -e "$source" ; then cp "$source" "$destination" ; else echo "WARNING: $canister_name did file not found at $source" ; fi ;;
      esac
    done
}

# Extracts .did files from Wasm metadata.
function generate_did() {
  local canister=$1
  canister_root="src/$canister"

  cargo build --manifest-path="$canister_root/Cargo.toml" \
    --target wasm32-unknown-unknown \
    --release --package "$canister"

  # cargo install candid-extractor
  candid-extractor "target/wasm32-unknown-unknown/release/$canister.wasm" >"$canister_root/$canister.did"
}

CANISTERS=backend

for canister in $(echo $CANISTERS | sed "s/,/ /g"); do
  generate_did "$canister"
done

get_remote_did_files
