#!/usr/bin/env bash
[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF

	Populates the ckbtc_kyt init args file.

	# Prerequisites
	This is expected to be run via dfx, and in particular that
	environment variables provided by dfx are set.

	EOF
  exit 0
}
set -euxo pipefail

: START populating the ckbtc_kyt install args file...
ARGS_FILE="$(jq -re .canisters.ckbtc_kyt.init_arg_file dfx.json)"
mkdir -p "$(dirname "$ARGS_FILE")"

cat <<EOF >"$ARGS_FILE"
(variant {
  InitArg = record {
    minter_id = principal "$CANISTER_ID_CKBTC_MINTER";
    maintainers = vec {};
    mode = variant { AcceptAll };
   }
})
EOF
: FINISH populating the ckbtc_kyt install args file.
