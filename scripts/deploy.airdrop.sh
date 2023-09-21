#!/usr/bin/env bash

case $ENV in
  "staging")
    WALLET="cvthj-wyaaa-aaaad-aaaaq-cai"
    ;;
  "ic")
    WALLET="yit3i-lyaaa-aaaan-qeavq-cai"
    ;;
  *)
    ;;
esac

BACKEND_ID=$(dfx canister id backend)

if [ -n "${ENV+1}" ]; then
  dfx deploy airdrop --argument "(variant {
    Init = record {
      backend_canister_id = principal \"$BACKEND_ID\"
    }
  })" --network "$ENV" --wallet $WALLET
else
  dfx deploy airdrop --argument "(variant {
    Init = record {
      backend_canister_id = principal \"$BACKEND_ID\"
    }
  })"
fi

"$(git rev-parse --show-toplevel)/scripts/airdrop.generate-codes.sh" 20 1000