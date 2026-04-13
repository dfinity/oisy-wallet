#!/usr/bin/env bash

II_CANISTER_ID="$(dfx canister id internet_identity --network "${ENV:-local}")"
SIGNER_CANISTER_ID="$(dfx canister id signer --network "${ENV:-local}")"

case $ENV in
"staging")
  ECDSA_KEY_NAME="test_key_1"
  # For security reasons, mainnet root key will be hardcoded in the backend canister.
  ic_root_key_der="null"
  ;;
"ic" | "beta")
  ECDSA_KEY_NAME="key_1"
  # For security reasons, mainnet root key will be hardcoded in the backend canister.
  ic_root_key_der="null"
  ;;
esac

echo "(variant {
  Init = record {
        ecdsa_key_name = \"$ECDSA_KEY_NAME\";
        allowed_callers = vec {};
        cfs_canister_id = opt principal \"$SIGNER_CANISTER_ID\";
        ii_canister_id = opt principal \"$II_CANISTER_ID\";
        ic_root_key_der = $ic_root_key_der;
    }
})"
