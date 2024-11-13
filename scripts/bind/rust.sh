#!/usr/bin/env bash
set -euo pipefail

[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF
	Generates rust canister bindings.

	Prerequisites:
	- A Rust crate at src/\$canister/client/

	Usage:
	  $(basename $0) [canister_name..]

	Properties:
	- Creates a Rust bindings file at src/\$canister/client/src/lib.rs
	EOF

  exit 0
}

# If no canisters are specified, generate bindings for all.
if (($# == 0)); then
  mapfile -t canisters < <(jq -r '.canisters|keys|.[]' dfx.json)
else
  canisters=("${@}")
fi

for canister in "${canisters[@]}"; do
  # Paths:
  canister_binding_config="./scripts/bind/rust/${canister}.client.toml"
  candid_file=".dfx/local/canisters/$canister/${canister}.did"
  generated_client="src/$canister/client/src/lib.rs"
  # Generate:
  if test -f "$canister_binding_config"; then
    echo "INFO: Creating rust bindings for $canister..."
    test -f "$candid_file" || {
      echo "ERROR: Candid file missing from: '$candid_file'"
      echo "       You may need to run: dfx deploy $canister"
      exit 1
    } >&2
    mkdir -p "src/backend/src/bind"
    didc bind -t rs "$candid_file" --config "$canister_binding_config" >"$generated_client"
  else
    echo "INFO: No rust binding script for $canister at $canister_binding_config"
  fi
done

# Format
scripts/format.rust.sh
