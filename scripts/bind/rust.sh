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
  canister_binding_config="./scripts/bind/rust/${canister}.toml"
  if test -f "$canister_binding_config"; then
    echo "INFO: Creating rust bindings for $canister..."
    mkdir -p "src/backend/src/bind"
    didc bind -t rs ".dfx/local/canisters/$canister/$canister.did" --config "$canister_binding_config" >"src/$canister/client/src/lib.rs"
  else
    echo "INFO: No rust binding script for $canister at $canister_binding_config"
  fi
done

# Format
scripts/format.rust.sh
