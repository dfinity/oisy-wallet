#!/usr/bin/env bash

II_CANISTER_ID="$(dfx canister id internet_identity --network "${ENV:-local}")"
POUH_ISSUER_CANISTER_ID="$(dfx canister id pouh_issuer --network "${ENV:-local}")"
SIGNER_CANISTER_ID="$(dfx canister id signer --network "${ENV:-local}")"

case $ENV in
"staging")
  ECDSA_KEY_NAME="test_key_1"
  # For security reasons, mainnet root key will be hardcoded in the backend canister.
  ic_root_key_der="null"
  # URL used by issuer in the issued verifiable credentials (typically hard-coded)
  # Represents more an ID than a URL
  POUH_ISSUER_VC_URL="https://${POUH_ISSUER_CANISTER_ID}.icp0.io/"
  ;;
"ic")
  ECDSA_KEY_NAME="key_1"
  # For security reasons, mainnet root key will be hardcoded in the backend canister.
  ic_root_key_der="null"
  # URL used by issuer in the issued verifiable credentials (tipically hard-coded)
  # Represents more an ID than a URL
  POUH_ISSUER_VC_URL="https://id.decideai.xyz/"
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
  # URL used by issuer in the issued verifiable credentials (tipically hard-coded)
  # We use the dummy issuer canister for local development
  POUH_ISSUER_VC_URL="https://dummy-issuer.vc/"
  ;;
esac

# URL used by II-issuer in the id_alias-verifiable credentials (hard-coded in II)
# Represents more an ID than a URL
II_VC_URL="https://identity.ic0.app"

echo "Deploying backend with the following arguments: ${POUH_ISSUER_VC_URL}"

if [ -n "${ENV+1}" ]; then
  dfx deploy backend --argument "(variant {
    Init = record {
         ecdsa_key_name = \"$ECDSA_KEY_NAME\";
         allowed_callers = vec {};
         cfs_canister_id = opt principal \"$SIGNER_CANISTER_ID\";
         supported_credentials = opt vec {
            record {
              credential_type = variant { ProofOfUniqueness };
              ii_origin = \"$II_VC_URL\";
              ii_canister_id = principal \"$II_CANISTER_ID\";
              issuer_origin = \"$POUH_ISSUER_VC_URL\";
              issuer_canister_id = principal \"$POUH_ISSUER_CANISTER_ID\";
            }
         };
         ic_root_key_der = $ic_root_key_der;
     }
  })" --network "$ENV" "${@}"
else
  DEFAULT_CANISTER_ID="$(dfx canister id --network staging backend)"
  dfx deploy backend --argument "(variant {
    Init = record {
         ecdsa_key_name = \"$ECDSA_KEY_NAME\";
         allowed_callers = vec {};
         cfs_canister_id = opt principal \"$SIGNER_CANISTER_ID\";
         supported_credentials = opt vec {
            record {
              credential_type = variant { ProofOfUniqueness };
              ii_origin = \"$II_VC_URL\";
              ii_canister_id = principal \"$II_CANISTER_ID\";
              issuer_origin = \"$POUH_ISSUER_VC_URL\";
              issuer_canister_id = principal \"$POUH_ISSUER_CANISTER_ID\";
            }
         };
         ic_root_key_der = $ic_root_key_der;
     }
  })" --specified-id "$DEFAULT_CANISTER_ID" "${@}"
fi
