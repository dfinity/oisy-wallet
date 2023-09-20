#!/usr/bin/env bash

export LC_ALL=C

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <code_length> <number_of_codes>"
    exit 1
fi

CODE_LENGTH=$1
NUMBER_OF_CODES=$2

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
dfx canister call airdrop add_codes '(vec '"$FORMATTED_CODES"')'
