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

./scripts/deploy.backend.sh
./scripts/deploy.airdrop.sh "$TOTAL_TOKENS_AIRDROP" "$MAXIMUM_DEPTH" "$TOKENS_PER_PERSON" "$NUMBERS_OF_CHILDREN"
dfx deploy internet_identity
dfx deploy frontend
