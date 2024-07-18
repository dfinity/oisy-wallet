#!/usr/bin/env bash

case $ENV in
  "staging")
    ECDSA_KEY_NAME="test_key_1"
    WALLET="cvthj-wyaaa-aaaad-aaaaq-cai"
    # For security reasons, mainnet root key will be hardcoded in the backend canister.
    ic_root_key_der="null"
    ;;
  "ic")
    ECDSA_KEY_NAME="key_1"
    WALLET="yit3i-lyaaa-aaaan-qeavq-cai"
    # For security reasons, mainnet root key will be hardcoded in the backend canister.
    ic_root_key_der="null"
    ;;
  *)
    ECDSA_KEY_NAME="dfx_test_key"
    # In order to read the root key we grab the array from the '"root_key": [...]' bit, the brackets
    # to match what candid expects ({}), replace the commas between array entries to match
    # what candid expects (semicolon) and annotate the numbers with their type (otherwise dfx assumes 'nat'
    # instead of 'nat8').
    rootkey_did=$(dfx ping "${ENV:-local}" \
        | jq -r '.root_key | reduce .[] as $item ("{ "; "\(.) \($item):nat8;") + " }"')
    echo "Parsed rootkey: ${rootkey_did:0:20}..." >&2
    ic_root_key_der="opt vec $rootkey_did"
    ;;
esac

II_CANISTER_ID="$(dfx canister id internet_identity --network "$ENV")"
POUH_ISSUER_CANISTER_ID="$(dfx canister id pouh_issuer --network "$ENV")"
# URL used by II-issuer in the id_alias-verifiable credentials (hard-coded in II)
# Represents more an ID than a URL
II_VC_URL="https://identity.ic0.app"
# URL used by issuer in the issued verifiable credentials (tipically hard-coded)
# Represents more an ID than a URL
# TODO: To be confirmed by DECIDE AI team
POUH_ISSUER_VC_URL="https://www.elna.ai"

if [ -n "${ENV+1}" ]; then
  dfx deploy backend --argument "(variant {
    Init = record {
         ecdsa_key_name = \"$ECDSA_KEY_NAME\";
         allowed_callers = vec {};
         supported_credentials = opt vec {
            record {
              credential_type = variant { ProofOfUniqueness };
              ii_origin = \"$II_VC_URL\";
              ii_canister_id = \"$II_CANISTER_ID\";
              issuer_origin = \"$POUH_ISSUER_VC_URL\";
              issuer_canister_id = \"$POUH_ISSUER_CANISTER_ID\";
            }
         };
         ic_root_key_der = $ic_root_key_der;
     }
  })" --network "$ENV" --wallet "$WALLET"
else
  dfx deploy backend --argument "(variant {
    Init = record {
         ecdsa_key_name = \"$ECDSA_KEY_NAME\";
         allowed_callers = vec {};
         supported_credentials = opt vec {
            record {
              credential_type = variant { ProofOfUniqueness };
              ii_origin = \"$II_VC_URL\";
              ii_canister_id = \"$II_CANISTER_ID\";
              issuer_origin = \"$POUH_ISSUER_VC_URL\";
              issuer_canister_id = \"$POUH_ISSUER_CANISTER_ID\";
            }
         };
         ic_root_key_der = $ic_root_key_der;
     }
  })" --specified-id tdxud-2yaaa-aaaad-aadiq-cai
fi
