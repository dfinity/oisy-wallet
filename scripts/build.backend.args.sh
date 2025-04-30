#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF
	Generates the backend arguments.

  # Prerequisites
  Canisters IDs must already be known to dfx.

	This is intended to be run as part of a dfx command, so the dfx environment variables are assumed to be available:
	  https://internetcomputer.org/docs/current/developer-docs/developer-tools/cli-tools/cli-reference/dfx-envars
	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

# We write the output to a file including the network name, then we symlink it to the generic name specified in dfx.json.
CANISTER_ARG_PATH_BACKEND="$(jq -re .canisters.backend.init_arg_file dfx.json)"
CANISTER_ARG_PATH_BACKEND_FOR_NETWORK="${CANISTER_ARG_PATH_BACKEND%.did}.$DFX_NETWORK.did"
mkdir -p "$(dirname "$CANISTER_ARG_PATH_BACKEND")"
ln -s -f "$(basename "$CANISTER_ARG_PATH_BACKEND_FOR_NETWORK")" "$CANISTER_ARG_PATH_BACKEND"

case "$DFX_NETWORK" in
"staging")
  ECDSA_KEY_NAME="test_key_1"
  # For security reasons, mainnet root key will be hardcoded in the backend canister.
  ic_root_key_der="null"
  # URL used by issuer in the issued verifiable credentials (typically hard-coded)
  # Represents more an ID than a URL
  POUH_ISSUER_VC_URL="https://${CANISTER_ID_POUH_ISSUER}.icp0.io/"
  DERIVATION_ORIGIN="https://tewsx-xaaaa-aaaad-aadia-cai.icp0.io"
  ;;
"ic")
  ECDSA_KEY_NAME="key_1"
  # For security reasons, mainnet root key will be hardcoded in the backend canister.
  ic_root_key_der="null"
  # URL used by issuer in the issued verifiable credentials (tipically hard-coded)
  # Represents more an ID than a URL
  POUH_ISSUER_VC_URL="https://id.decideai.xyz/"
  DERIVATION_ORIGIN="https://oisy.com"
  ;;
*)
  ECDSA_KEY_NAME="dfx_test_key"
  # In order to read the root key we grab the array from the '"root_key": [...]' bit, the brackets
  # to match what candid expects ({}), replace the commas between array entries to match
  # what candid expects (semicolon) and annotate the numbers with their type (otherwise dfx assumes 'nat'
  # instead of 'nat8').
  rootkey_did=$(dfx ping "${DFX_NETWORK:-local}" |
    jq -r '.root_key | reduce .[] as $item ("{ "; "\(.) \($item):nat8;") + " }"')
  echo "Parsed rootkey: ${rootkey_did:0:20}..." >&2
  ic_root_key_der="opt vec $rootkey_did"
  # URL used by issuer in the issued verifiable credentials (tipically hard-coded)
  # We use the dummy issuer canister for local development
  POUH_ISSUER_VC_URL="https://dummy-issuer.vc/"
  DERIVATION_ORIGIN="http://${CANISTER_ID_BACKEND}.localhost:4943"
  ;;
esac

# If the rewards canister is known, it may perform privileged actions such as find which users are eligible for rewards.
if [[ "${CANISTER_ID_REWARDS:-}" == "" ]]; then
  ALLOWED_CALLERS="vec {}"
else
  ALLOWED_CALLERS="vec{ principal \"$CANISTER_ID_REWARDS\" }"
fi

# URL used by II-issuer in the id_alias-verifiable credentials (hard-coded in II)
# Represents more an ID than a URL
II_VC_URL="https://identity.internetcomputer.org"

echo "Deploying backend with the following arguments: ${POUH_ISSUER_VC_URL}"

echo "(variant {
    Init = record {
         ecdsa_key_name = \"$ECDSA_KEY_NAME\";
         allowed_callers = $ALLOWED_CALLERS;
         cfs_canister_id = opt principal \"$CANISTER_ID_SIGNER\";
         derivation_origin = opt \"$DERIVATION_ORIGIN\";
         supported_credentials = opt vec {
            record {
              credential_type = variant { ProofOfUniqueness };
              ii_origin = \"$II_VC_URL\";
              ii_canister_id = principal \"$CANISTER_ID_INTERNET_IDENTITY\";
              issuer_origin = \"$POUH_ISSUER_VC_URL\";
              issuer_canister_id = principal \"$CANISTER_ID_POUH_ISSUER\";
            }
         };
         ic_root_key_der = $ic_root_key_der;
     }
  })" >"$CANISTER_ARG_PATH_BACKEND_FOR_NETWORK"
