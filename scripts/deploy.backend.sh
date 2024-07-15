#!/usr/bin/env bash

ENV=${ENV:-local}

case $ENV in
  "staging")
    ECDSA_KEY_NAME="test_key_1"
    WALLET="cvthj-wyaaa-aaaad-aaaaq-cai"
    ;;
  "ic")
    ECDSA_KEY_NAME="key_1"
    WALLET="yit3i-lyaaa-aaaan-qeavq-cai"
    ;;
  *)
    ECDSA_KEY_NAME="dfx_test_key"
    ;;
esac

echo $WALLET

# At the time of writing dfx outputs incorrect JSON with dfx ping (commas between object
# entries are missing).
# In order to read the root key we grab the array from the '"root_key": [...]' bit, the brackets
# to match what candid expects ({}), replace the commas between array entries to match
# what candid expects (semicolon) and annotate the numbers with their type (otherwise dfx assumes 'nat'
# instead of 'nat8').
rootkey_did=$(dfx ping "$ENV" \
    | sed -n 's/.*"root_key": \[\(.*\)\].*/{\1}/p' \
    | sed 's/\([0-9][0-9]*\)/\1:nat8/g' \
    | sed 's/,/;/g')
echo "Parsed rootkey: ${rootkey_did:0:20}..." >&2

if [ -n "${ENV+1}" ]; then
  dfx deploy backend --argument "(variant {
    Init = record {
         ecdsa_key_name = \"$ECDSA_KEY_NAME\";
         allowed_callers = vec {};
         supported_credentials = null;
         ic_root_key_der = opt vec $rootkey_did;
     }
  })" --network "$ENV" # add --wallet $WALLET when I figure out the problem
else
  dfx deploy backend --argument "(variant {
    Init = record {
         ecdsa_key_name = \"$ECDSA_KEY_NAME\";
         allowed_callers = vec {};
         supported_credentials = null;
         ic_root_key_der = opt vec $rootkey_did;
     }
  })" --specified-id tdxud-2yaaa-aaaad-aadiq-cai
fi
