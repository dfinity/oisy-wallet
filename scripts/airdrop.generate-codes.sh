#!/usr/bin/env bash

export LC_ALL=C


print_usage_and_exit() {
    echo "Error: $1"
    echo "Usage: $0 --code-length=<value> --number-of-codes=<value>"
    exit 1
}

# Initialize default values (optional)
CODE_LENGTH=""
NUMBER_OF_CODES=""

# Parse named arguments
while [ "$#" -gt 0 ]; do
    case "$1" in
        --code-length=*)
            CODE_LENGTH="${1#*=}"
            ;;
        --number-of-codes=*)
            NUMBER_OF_CODES="${1#*=}"
            ;;
        *)
            print_usage_and_exit "Invalid argument"
            ;;
    esac
    shift
done

# Check if all arguments are set
if [ -z "$CODE_LENGTH" ] || [ -z "$NUMBER_OF_CODES" ]; then
    print_usage_and_exit "Missing arguments"
fi

CODES=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w "$CODE_LENGTH" | head -n "$NUMBER_OF_CODES")

# Format for dfx call
FORMATTED_CODES="{"
for code in $CODES; do
    FORMATTED_CODES+="\"$code\"; "
done
FORMATTED_CODES=${FORMATTED_CODES::-2} # remove the last "; "
FORMATTED_CODES+="}"

echo "$CODES" > "$(git rev-parse --show-toplevel)/codes.txt"

# Make the dfx call

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
  dfx canister call airdrop add_codes '(vec '"$FORMATTED_CODES"')' --network "$ENV" --wallet $WALLET
else
  dfx canister call airdrop add_codes '(vec '"$FORMATTED_CODES"')'
fi
