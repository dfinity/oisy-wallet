#!/usr/bin/env bash

BACKEND_ID=$(dfx canister id backend)

if [ -n "${ENV+1}" ]; then
  echo "TODO: to be implemented"
else
    dfx deploy airdrop --argument "(variant {
      Init = record {
        backend_canister_id = principal \"$BACKEND_ID\"
      }
    })"

    "$(git rev-parse --show-toplevel)/scripts/generate-codes.sh" 20 1000
fi
