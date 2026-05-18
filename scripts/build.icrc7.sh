#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the ICRC-7 installation files:

	- The Candid file is downloaded.

	The files are installed at the locations defined for 'icrc7' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

ICRC7_BUILDENV="$DFX_NETWORK"
export ICRC7_BUILDENV

ICRC7_REPO_URL="https://raw.githubusercontent.com/dfinity/ICRC/main/ICRCs/ICRC-7"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
CANDID_URL="${ICRC7_REPO_URL}/ICRC-7.did"

CANDID_FILE="$(jq -r .canisters.icrc7.candid dfx.json)"

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
SUCCESS: The icrc7 installation files have been created:
icrc7 candid:       $CANDID_FILE
EOF
