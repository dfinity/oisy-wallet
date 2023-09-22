#!/usr/bin/env bash

print_usage_and_exit() {
    echo "Error: $1"
    echo "Usage: $0 --total-tokens-airdrop=<value> --maximum-depth=<value> --tokens-per-person=<value> --numbers-of-children=<value>"
    exit 1
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --total-tokens-airdrop=*)
            TOTAL_TOKENS_AIRDROP="${1#*=}"
            ;;
        --maximum-depth=*)
            MAXIMUM_DEPTH="${1#*=}"
            ;;
        --tokens-per-person=*)
            TOKENS_PER_PERSON="${1#*=}"
            ;;
        --numbers-of-children=*)
            NUMBERS_OF_CHILDREN="${1#*=}"
            ;;
        *)
            print_usage_and_exit "Invalid argument"
            ;;
    esac
    shift
done

# Check if all arguments are set
if [ -z "$TOTAL_TOKENS_AIRDROP" ] || [ -z "$MAXIMUM_DEPTH" ] || [ -z "$TOKENS_PER_PERSON" ] || [ -z "$NUMBERS_OF_CHILDREN" ]; then
  print_usage_and_exit "Missing arguments"
fi

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
      token_per_person = \"$TOTAL_TOKENS_AIRDROP\";
      maximum_depth = \"$MAXIMUM_DEPTH\";
      total_tokens = \"$TOKENS_PER_PERSON\";
      numbers_of_children = \"$NUMBERS_OF_CHILDREN\";
    }
  })" --network "$ENV" --wallet "$WALLET"
else
  dfx deploy airdrop --argument "(variant {
    Init = record {
      backend_canister_id = principal \"$BACKEND_ID\";
      token_per_person = \"$TOTAL_TOKENS_AIRDROP\";
      maximum_depth = \"$MAXIMUM_DEPTH\";
      total_tokens = \"$TOKENS_PER_PERSON\";
      numbers_of_children = \"$NUMBERS_OF_CHILDREN\";
    }
  })"
fi

"$(git rev-parse --show-toplevel)/scripts/airdrop.generate-codes.sh" 20 1000
