#!/usr/bin/env bash

if [ "$#" -ne 4 ]; then
    echo "Usage: $0 <total_tokens_airdrop> <maximum_depth> <tokens_per_person> <numbers_of_children>"
    exit 1
fi

# assign the arguments
TOTAL_TOKENS_AIRDROP=$1
MAXIMUM_DEPTH=$2
TOKENS_PER_PERSON=$3
NUMBERS_OF_CHILDREN=$4

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
  # We create automatically the airdrop canister only locally
  BACKEND_ID=$(dfx canister id backend --network "$ENV")
else
  dfx canister create airdrop
  BACKEND_ID=$(dfx canister id backend)
fi

if [ -n "${ENV+1}" ]; then
  dfx deploy airdrop --argument "(variant {
    Init = record {
      backend_canister_id = principal \"$BACKEND_ID\";
      token_per_person : \"$TOTAL_TOKENS_AIRDROP\";
      maximum_depth : \"$MAXIMUM_DEPTH\";
      total_tokens : \"$TOKENS_PER_PERSON\";
      numbers_of_children : \"$NUMBERS_OF_CHILDREN\";
    }
  })" --network "$ENV" --wallet "$WALLET"
else
  dfx deploy airdrop --argument "(variant {
    Init = record {
      backend_canister_id = principal \"$BACKEND_ID\"
      token_per_person : \"$TOTAL_TOKENS_AIRDROP\";
      maximum_depth : \"$MAXIMUM_DEPTH\";
      total_tokens : \"$TOKENS_PER_PERSON\";
      numbers_of_children : \"$NUMBERS_OF_CHILDREN\";
    }
  })"
fi

"$(git rev-parse --show-toplevel)/scripts/airdrop.generate-codes.sh" 20 1000
