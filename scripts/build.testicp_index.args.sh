#!/usr/bin/env bash
[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF

	Populates the testicp_index init args file.

	# Prerequisites
	This is expected to be run via dfx, and in particular that
	environment variables provided by dfx are set.

	EOF
  exit 0
}
set -euxo pipefail

: START populating the testicp_index install args file...
ARGS_FILE="$(jq -re .canisters.testicp_index.init_arg_file dfx.json)"
mkdir -p "$(dirname "$ARGS_FILE")"

cat <<EOF >"$ARGS_FILE"
  (record {ledger_id = principal"${CANISTER_ID_TESTICP_LEDGER}";})
EOF
: FINISH populating the testicp_index install args file.
