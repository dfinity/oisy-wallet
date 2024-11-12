#!/usr/bin/env bash

[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF
	Generates candid files and bindings.

	Prerequisites:
	- Deploy all canisters to the 'local' network.  Or otherwise ensure that:
	  - Wasm for each canister is at: '.dfx/local/canisters/$CANISTER/$CANISTER.wasm.gz'
	    Note: You may need to set '"gzip": true' for canisters in 'dfx.json'.
	  - Candid for each canister is at: '.dfx/local/canisters/$CANISTER/$CANISTER.did'
	EOF

  exit 0
}

# Generate candid for the backend
scripts/did.sh # TODO: Use local Wasm as input.
# Generate rust bindings
scripts/bind/rust.sh
# Format
scripts/format.sh
