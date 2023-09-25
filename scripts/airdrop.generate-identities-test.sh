#!/usr/bin/env bash

# Generate multiple temporary II to use for testing

FILE="src/airdrop/src/tests/users.txt"

rm "$FILE"
touch "$FILE"

for i in {1..100}; do
    dfx identity new "temp$i" || echo "identity already exists"
done

# Get the list of principals
for i in {1..100}; do
    dfx identity use "temp$i"
    dfx identity get-principal >> "$FILE"
done
