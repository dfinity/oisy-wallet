#!/usr/bin/env bash
[[ "${1:-}" != "--help" ]] || {
  cat <<-EOF

	Assembles the ckbtc_minter canister deploy artefacts.

	# Prerequisites
	This is expected to be run by dfx.  In particular,
	the code that creates the arguments uses environment
	variables set by dfx.

	EOF
  exit 0
}

set -euo pipefail

# Install ICP index locally as documented in:
# https://internetcomputer.org/docs/current/developer-docs/integrations/ledger/ledger-local-setup

scripts/download.ckbtc.sh
scripts/build.ckbtc_minter.args.sh
