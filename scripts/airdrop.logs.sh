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

if [ -n "${ENV+1}" ]; then
    dfx canister call airdrop get_logs --network "$ENV" --wallet "$WALLET" | sed 's/"; "/"\n"/g' | sed 's/^.*vec { "//' | sed 's/";.*$//'
else
     dfx canister call airdrop get_logs | sed 's/"; "/"\n"/g' | sed 's/^.*vec { "//' | sed 's/";.*$//'
fi
