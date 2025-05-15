#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Creates the Chain Fusion Signer installation files:

	- The Wasm and Candid files are downloaded.
	- The installation args are computed based on the target network,
	      determined by the DFX_NETWORK environment variable.

	The files are installed at at the locations defined for 'signer' in 'dfx.json'.
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

DFX_NETWORK="${DFX_NETWORK:-local}"

SIGNER_RELEASE="v0.2.8"
SIGNER_RELEASE_URL="https://github.com/dfinity/chain-fusion-signer/releases/download/${SIGNER_RELEASE}"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
CANDID_URL="${SIGNER_RELEASE_URL}/signer.did"
# shellcheck disable=SC2034 # This variable is used - see ${!asset_url} below.
WASM_URL="${SIGNER_RELEASE_URL}/signer.wasm.gz"

CANDID_FILE="$(jq -r .canisters.signer.candid dfx.json)"
WASM_FILE="$(jq -r .canisters.signer.wasm dfx.json)"
ARG_FILE="$(jq -r .canisters.signer.init_arg_file dfx.json)"

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
# Downloads the Wasm file, if it does not exist already.
download wasm

####
# Computes the install args, overwriting any existing args file.

# .. Computes fields for the init args.
case "$DFX_NETWORK" in
"staging")
  ECDSA_KEY_NAME="test_key_1"
  # For security reasons, mainnet root key will be hardcoded in the signer canister.
  ic_root_key_der="null"
  ;;
"ic")
  ECDSA_KEY_NAME="key_1"
  # For security reasons, mainnet root key will be hardcoded in the signer canister.
  ic_root_key_der="null"
  ;;
*)
  ECDSA_KEY_NAME="dfx_test_key"
  # In order to read the root key we grab the array from the '"root_key": [...]' bit, the brackets
  # to match what candid expects ({}), replace the commas between array entries to match
  # what candid expects (semicolon) and annotate the numbers with their type (otherwise dfx assumes 'nat'
  # instead of 'nat8').
  rootkey_did=$(dfx ping "${ENV:-local}" |
    jq -r '.root_key | reduce .[] as $item ("{ "; "\(.) \($item):nat8;") + " }"')
  echo "Parsed rootkey: ${rootkey_did:0:20}..." >&2
  ic_root_key_der="opt vec $rootkey_did"
  ;;
esac

# .. Creates the init args file
rm -f "$ARG_FILE"
mkdir -p "$(dirname "$ARG_FILE")"
cat <<EOF >"$ARG_FILE"
(variant {
    Init = record {
         ecdsa_key_name = "$ECDSA_KEY_NAME";
         ic_root_key_der = $ic_root_key_der;
     }
  })
EOF

####
# Success
cat <<EOF
SUCCESS: The signer installation files have been created:
signer candid:       $CANDID_FILE
signer Wasm:         $WASM_FILE
signer install args: $ARG_FILE
EOF
