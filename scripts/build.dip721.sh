#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the DIP721 installation files:

	- The Candid file is copied from the repository.

	The files are installed at the locations defined for 'dip721' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

DIP721_BUILDENV="$DFX_NETWORK"
export DIP721_BUILDENV

# Psychedelic deleted its DIP721 repository, so its nft.did (develop branch) is kept here,
# formatted by prettier. Original: https://archive.softwareheritage.org/swh:1:cnt:f5af872edbfacb12868f0ddc49129338d43e777b
CANDID_SOURCE="scripts/dip721.did"

CANDID_FILE="$(jq -r .canisters.dip721.candid dfx.json)"

####
# Copies the candid file.
mkdir -p "$(dirname "$CANDID_FILE")"
cp "$CANDID_SOURCE" "$CANDID_FILE"

####
# Success
cat <<EOF
SUCCESS: The dip721 installation files have been created:
dip721 candid:       $CANDID_FILE
EOF
