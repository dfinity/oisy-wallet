#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the cycles_depositor installation arguments.

	The file is installed at the location defined for 'cycles_depositor' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

DFX_NETWORK="${DFX_NETWORK:-local}"
ARG_FILE="$(jq -r .canisters.cycles_depositor.init_arg_file dfx.json)"

####
# Computes the install args, overwriting any existing args file.

CANISTER_ID_CYCLES_LEDGER="${CANISTER_ID_CYCLES_LEDGER:-$(dfx canister id cycles_ledger --network "$DFX_NETWORK")}"

# .. Creates the init args file
rm -f "$ARG_FILE"
mkdir -p "$(dirname "$ARG_FILE")"
cat <<EOF >"$ARG_FILE"
(record { ledger_id = principal "$CANISTER_ID_CYCLES_LEDGER" })
EOF

####
# Success
cat <<EOF
SUCCESS: The cycles_depositor argument file has been created:
cycles_depositor install args: $(sha256sum "$ARG_FILE")
EOF
