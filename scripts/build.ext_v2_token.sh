#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the EXT v2 Token installation files:

	- The Candid file is downloaded.

	The files are installed at the locations defined for 'ext_v2_token' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

EXT_V2_BUILDENV="$DFX_NETWORK"
export EXT_V2_BUILDENV

EXT_V2_REPO_URL="https://raw.githubusercontent.com/Toniq-Labs/ext-v2-token/refs/heads/main/src/extjs/candid"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
CANDID_URL="${EXT_V2_REPO_URL}/ext_v2.did"

CANDID_FILE="$(jq -r .canisters.ext_v2_token.candid dfx.json)"

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
SUCCESS: The ext_v2_token installation files have been created:
ext_v2_token candid:       $CANDID_FILE
EOF
