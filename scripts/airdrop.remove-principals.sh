#!/usr/bin/env bash

# Get list of principals to remove from the airdrop

principals=()

print_usage_and_exit() {
    echo "Error: $1"
    echo "Usage: $0 --principals=value1,value2"
    exit 1
}

# if no arguments are passed
if [ $# -eq 0 ]; then
    print_usage_and_exit "Missing arguments"
fi

# Parse named arguments
while [ "$#" -gt 0 ]; do
    case "$1" in
        --principals=*)
            IFS=',' read -ra principals <<< "${1#*=}"
            ;;
        *)
            print_usage_and_exit "Invalid argument - $1"
            ;;
    esac
    shift
done

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

set -x

# Principals
for principal in "${principals[@]}"; do
    if [ -n "${ENV+1}" ]; then
        dfx canister call airdrop remove_principal_airdrop "(principal \"$principal\")" --network "$ENV" --wallet "$WALLET"
    else
        dfx canister call airdrop remove_principal_airdrop "(principal \"$principal\")"
    fi
done
