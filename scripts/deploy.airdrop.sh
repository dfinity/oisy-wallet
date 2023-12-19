#!/usr/bin/env bash

print_usage_and_exit() {
    echo "Error: $1"
    echo "Usage: $0 --total-tokens-airdrop=<value> --maximum-depth=<value> --tokens-per-person=<value> --numbers-of-children=<value> --number-of-codes-to-generate=<value> --number-of-characters-per-code=<value>"
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
        --number-of-codes-to-generate=*)
            NUMBER_OF_CODES_TO_GENERATE="${1#*=}"
            ;;
        --number-of-characters-per-code=*)
            NUMBER_OF_CHARACTERS_PER_CODE="${1#*=}"
            ;;
        *)
            print_usage_and_exit "Invalid argument - $1"
            ;;
    esac
    shift
done

# Check if all arguments are set
if [ -z "$TOTAL_TOKENS_AIRDROP" ] || [ -z "$MAXIMUM_DEPTH" ] || [ -z "$TOKENS_PER_PERSON" ] || [ -z "$NUMBERS_OF_CHILDREN" ] || [ -z  "$NUMBER_OF_CODES_TO_GENERATE" ] || [ -z "$NUMBER_OF_CHARACTERS_PER_CODE" ] ; then
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
      token_per_person = $TOKENS_PER_PERSON;
      maximum_depth = $MAXIMUM_DEPTH;
      total_tokens = $TOTAL_TOKENS_AIRDROP;
      numbers_of_children = $NUMBERS_OF_CHILDREN;
    }
  })" --network "$ENV" --wallet "$WALLET"
else
  dfx deploy airdrop --argument "(variant {
    Init = record {
      backend_canister_id = principal \"$BACKEND_ID\";
      token_per_person = $TOKENS_PER_PERSON;
      maximum_depth = $MAXIMUM_DEPTH;
      total_tokens = $TOTAL_TOKENS_AIRDROP;
      numbers_of_children = $NUMBERS_OF_CHILDREN;
    }
  })"
fi

"$(git rev-parse --show-toplevel)/scripts/airdrop.generate-codes.sh" --code-length="$NUMBER_OF_CHARACTERS_PER_CODE" --number-of-codes="$NUMBER_OF_CODES_TO_GENERATE"

if [ -n "${ENV+1}" ]; then
  "$(git rev-parse --show-toplevel)/scripts/airdrop.manager.sh"
  "$(git rev-parse --show-toplevel)/scripts/airdrop.admin.sh"
else
  # Do not populate manager and admin to spare time on local deployment
  true
fi
