#!/usr/bin/env bash

# Get the index as a parameter
if [ -z "$1" ]; then
  echo "Error: Missing index"
  echo "Usage: $0 <index>"
  exit 1
fi

INDEX=$1

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
    dfx canister call airdrop get_logs "($INDEX)" --network "$ENV" --wallet "$WALLET" |  sed 's/}; record/};\nrecord/g'
else
     dfx canister call airdrop get_logs "($INDEX)" | sed 's/}; record/};\nrecord/g'
fi
