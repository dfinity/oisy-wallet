#!/usr/bin/env bash

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

if [ -n "${ENV+1}" ]; then
  dfx deploy backend --argument "(variant {
    Init = record {
         ecdsa_key_name = \"$ECDSA_KEY_NAME\";
         allowed_callers = vec {};
     }
  })" --network "$ENV" --wallet "$WALLET"
else
  dfx deploy backend --argument "(variant {
    Init = record {
         ecdsa_key_name = \"$ECDSA_KEY_NAME\";
         allowed_callers = vec {};
     }
  })" --specified-id tdxud-2yaaa-aaaad-aadiq-cai
fi
