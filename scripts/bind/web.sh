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

for canister in $(ls src/declarations/); do
  echo "Generating bindings for $canister"
  dfx generate "$canister"
done
# Clean up..
node scripts/did.update.types.mjs
node scripts/did.delete.types.mjs
npm run format
