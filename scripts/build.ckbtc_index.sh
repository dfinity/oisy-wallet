#!/usr/bin/env bash
[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF

	Assembles the ckbtc_index canister deploy artefacts.

	# Prerequisites
	This is expected to be run by dfx.  In particular,
	the code that creates the arguments uses environment
	variables set by dfx.

	EOF
  exit 0
}

set -euo pipefail

scripts/download.ckbtc.sh
scripts/build.ckbtc_index.args.sh
