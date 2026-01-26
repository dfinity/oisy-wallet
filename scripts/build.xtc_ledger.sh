#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the XTC Token installation files:

	- The Candid file is downloaded.

	The files are installed at the locations defined for 'xtc_ledger' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

XTC_BUILDENV="$DFX_NETWORK"
export XTC_BUILDENV

XTC_REPO_URL="https://raw.githubusercontent.com/Psychedelic/dank/refs/heads/develop/candid"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
CANDID_URL="${XTC_REPO_URL}/xtc.did"

CANDID_FILE="$(jq -r .canisters.xtc_ledger.candid dfx.json)"

download() {
  : 'Downloads a URL to a given file.'
  # shellcheck disable=SC2016 # The $ in the comment is not meant to be expanded.
  : '* With argument x, the filename is $X_FILE and the URL is $X_URL'
  : '* If the file already exists, the user is prompted whether to overwrite, keeping the existing file by default.'
  local asset asset_url asset_file
  asset="$1"
  asset_url="${asset^^}_URL"
  asset_file="${asset^^}_FILE"
  scripts/download-immutable.sh "${!asset_url}" "${!asset_file}"
}

####
# Downloads the candid file, if it does not exist already.
download candid

####
# Success
cat <<EOF
SUCCESS: The xtc_ledger installation files have been created:
xtc_ledger candid:       $CANDID_FILE
EOF
