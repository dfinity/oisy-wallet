#!/usr/bin/env bash
[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF

	Populates the icp_index init args file.

	# Prerequisites
	This is expected to be run via dfx, and in particular that
	environment variables provided by dfx are set.

	EOF
  exit 0
}
set -euxo pipefail

: START populating the icp_index install args file...
ARGS_FILE="$(jq -re .canisters.icp_index.init_arg_file dfx.json)"
mkdir -p "$(dirname "$ARGS_FILE")"

cat <<EOF >"$ARGS_FILE"
  (record {ledger_id = principal"${CANISTER_ID_ICP_LEDGER}";})
EOF
: FINISH populating the icp_index install args file.
