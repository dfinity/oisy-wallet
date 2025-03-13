#!/usr/bin/env bash
set -euo pipefail

[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF
	Generates rust canister bindings.

	Prerequisites:
	- Rust crates at src/\$canister/{types,client,pic}/

	Usage:
	  $(basename "$0") [canister_name..]

	Properties:
	- Creates Rust bindings files at src/\$canister/{types,client,pic}/src/lib.rs
	EOF

  exit 0
}

# If no canisters are specified, generate bindings for all.
if (($# == 0)); then
  mapfile -t canisters < <(jq -r '.canisters|keys|.[]' dfx.json)
else
  canisters=("${@}")
fi

BINDINGS=(types) # TODO: Bindings for client & pic

for canister in "${canisters[@]}"; do
  for binding in "${BINDINGS[@]}"; do
    # Paths:
    canister_binding_config="./scripts/bind/rust/${canister}.${binding}.toml"
    candid_file=".dfx/local/canisters/$canister/${canister}.did"
    generated_file="src/$canister/$binding/src/lib.rs"
    # Generate:
    if test -f "$canister_binding_config"; then
      echo "INFO: Creating rust $binding for $canister..."
      test -f "$candid_file" || {
        echo "ERROR: Candid file missing from: '$candid_file'"
        echo "       You may need to run: dfx deploy $canister"
        exit 1
      } >&2
      mkdir -p "$(dirname "$generated_file")"
      didc bind -t rs "$candid_file" --config "$canister_binding_config" >"$generated_file" || {
        echo "ERROR: Failed to generate $binding for $canister."
        echo "       Candid:        $candid_file"
        echo "       Configuration: $canister_binding_config"
        exit 1
      } >&2
    else
      echo "INFO: No rust binding script for $canister at $canister_binding_config"
    fi
  done
done

# Format
scripts/format.rust.sh
