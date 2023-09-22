#!/usr/bin/env bash

set -eExo pipefail

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

./scripts/deploy.backend.sh
./scripts/deploy.airdrop.sh --total-tokens-airdrop="$TOTAL_TOKENS_AIRDROP" --maximum-deph="$MAXIMUM_DEPTH" --tokens-per-person="$TOKENS_PER_PERSON" --numbers-of-children="$NUMBERS_OF_CHILDREN"
dfx deploy internet_identity
dfx deploy frontend
