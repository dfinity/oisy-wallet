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

case $ENV in
  "staging"|"")
    TOTAL_TOKENS_AIRDROP=100000
    MAXIMUM_DEPTH=2
    TOKENS_PER_PERSON=40
    NUMBERS_OF_CHILDREN=3
    NUMBER_OF_CODES_TO_GENERATE=1000
    NUMBER_OF_CHARACTERS_PER_CODE=10
    ;;
esac

# Check if all arguments are set
if [ -z "$TOTAL_TOKENS_AIRDROP" ] || [ -z "$MAXIMUM_DEPTH" ] || [ -z "$TOKENS_PER_PERSON" ] || [ -z "$NUMBERS_OF_CHILDREN" ] || [ -z  "$NUMBER_OF_CODES_TO_GENERATE" ] || [ -z "$NUMBER_OF_CHARACTERS_PER_CODE" ] ; then
  print_usage_and_exit "Missing arguments"
fi

./scripts/deploy.backend.sh
./scripts/deploy.airdrop.sh --total-tokens-airdrop="$TOTAL_TOKENS_AIRDROP" --maximum-depth="$MAXIMUM_DEPTH" --tokens-per-person="$TOKENS_PER_PERSON" \
    --numbers-of-children="$NUMBERS_OF_CHILDREN" --number-of-codes-to-generate="$NUMBER_OF_CODES_TO_GENERATE"  \
    --number-of-characters-per-code="$NUMBER_OF_CHARACTERS_PER_CODE" --re-install
dfx deploy internet_identity --re-install
dfx deploy frontend --re-install
