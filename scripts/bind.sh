#!/usr/bin/env bash

[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF
	Generates candid files and bindings.

	Prerequisites:
	- Git is clean.  This is to ensure that the automated code changes are easy to audit.
	  - Note: It is recommended also to have the code formatted before generating bindings.
	- Deploy all canisters to the 'local' network.  Or otherwise ensure that:
	  - Wasm for each canister is at: '.dfx/local/canisters/$CANISTER/$CANISTER.wasm.gz'
	    Note: You may need to set '"gzip": true' for canisters in 'dfx.json'.
	  - Candid for each canister is at: '.dfx/local/canisters/$CANISTER/$CANISTER.did'
	EOF

  exit 0
}

# Ensure that git is clean
if git status --porcelain --untracked-files=no | grep -q .; then
  echo "ERROR: Git is not clean.  Please commit all changes before automated code generation."
  exit 1
fi
# Generate candid for the backend
scripts/did.sh # TODO: Use local Wasm as input.
# Generate rust bindings
scripts/bind/rust.sh
# Format
scripts/format.sh
