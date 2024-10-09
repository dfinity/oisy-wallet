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

SIGNER_RELEASE="v0.2.3"
SIGNER_RELEASE_URL="https://github.com/dfinity/chain-fusion-signer/releases/download/${SIGNER_RELEASE}"
CANDID_URL="${SIGNER_RELEASE_URL}/signer.did"
WASM_URL="${SIGNER_RELEASE_URL}/signer.wasm.gz"

CANDID_FILE="$(jq -r .canisters.signer.candid dfx.json)"
WASM_FILE="$(jq -r .canisters.signer.wasm dfx.json)"
ARG_FILE="$(jq -r .canisters.signer.init_arg_file dfx.json)"

####
# Downloads the candid file, if it does not exist already.
if test -e "$CANDID_FILE"; then
  echo "Using existing signer candid file"
else
  mkdir -p "$(dirname "$CANDID_FILE")"
  curl -sSL "$CANDID_URL" >"$CANDID_FILE"
fi

####
# Downloads the Wasm file, if it does not exist already.
if test -e "$WASM_FILE"; then
  echo "Using existing signer Wasm file"
else
  mkdir -p "$(dirname "$WASM_FILE")"
  curl -sSL "$WASM_URL" >"$WASM_FILE"
fi

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
