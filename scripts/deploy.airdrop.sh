#!/usr/bin/env bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <backend_canister_id>"
    exit 1
fi

BACKEND_CANISTER_ID=$1

if [ -n "${ENV+1}" ]; then
  echo "TODO: to be implemented"
else
    dfx deploy airdrop --argument "(variant {
      Init = record {
        backend_canister_id = principal \"$BACKEND_CANISTER_ID\"
      }
    })" --mode reinstall

    "$(git rev-parse --show-toplevel)/scripts/generate-codes.sh" 20 1000
fi
