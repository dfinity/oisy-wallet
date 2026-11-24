#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the XTC Token installation files:

	- The Candid file is copied from the repository.

	The files are installed at the locations defined for 'xtc_ledger' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

XTC_BUILDENV="$DFX_NETWORK"
export XTC_BUILDENV

# Psychedelic's dank repository is no longer public, so its candid/xtc.did (develop branch) is kept here,
# formatted by prettier. Original: https://archive.softwareheritage.org/swh:1:cnt:f5e9ebbf2afa802df8fb76a91483b0cf0792f371
CANDID_SOURCE="scripts/xtc_ledger.did"

CANDID_FILE="$(jq -r .canisters.xtc_ledger.candid dfx.json)"

####
# Copies the candid file.
mkdir -p "$(dirname "$CANDID_FILE")"
cp "$CANDID_SOURCE" "$CANDID_FILE"

####
# Success
cat <<EOF
SUCCESS: The xtc_ledger installation files have been created:
xtc_ledger candid:       $CANDID_FILE
EOF
