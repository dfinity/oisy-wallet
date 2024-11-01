#!/bin/bash

# https://internetcomputer.org/docs/current/developer-docs/defi/tokens/indexes

# Set the IC_VERSION
# https://dashboard.internetcomputer.org/releases
IC_VERSION="75dd48c38f296fc907c269263f96633fa8a29d0e"

echo "=== ICRC Index Canister Setup Script ==="

# ask if it is ok that the script will stop and start the local replica clean

read -r -p "Enter the ledger canister ID (e.g., mxzaz-hqaaa-aaaar-qaada-cai): " LEDGER_CANISTER_ID
echo "Using Ledger Canister ID: $LEDGER_CANISTER_ID"

# Step 1: ask for retrieve_blocks_from_ledger_interval_seconds that defaults to 10 if not given
read -r -p "Enter the interval in seconds to retrieve blocks from the ledger (default: 10): " RETRIEVE_BLOCKS_FROM_LEDGER_INTERVAL_SECONDS
RETRIEVE_BLOCKS_FROM_LEDGER_INTERVAL_SECONDS=${RETRIEVE_BLOCKS_FROM_LEDGER_INTERVAL_SECONDS:-10}
echo "Using retrieve_blocks_from_ledger_interval_seconds: $RETRIEVE_BLOCKS_FROM_LEDGER_INTERVAL_SECONDS"

echo "Check if dfx.json exists..."
if [ ! -f "dfx.json" ]; then
  echo "dfx.json not found. Please run this script from the root of your project."
  exit 1
else
  echo "File dfx.json found."
fi

echo "Check if ledger canister is set in dfx.json..."
if jq -e '.canisters.icrc1_ledger_canister' dfx.json > /dev/null; then
  echo "Ledger canister is already set in dfx.json."
else
  echo "Ledger canister is not set in dfx.json. Please set the ledger canister in dfx.json."
  exit 1
fi

echo "Downloading ICRC-1 index Wasm and Candid files..."
curl -o index.wasm.gz "https://download.dfinity.systems/ic/$IC_VERSION/canisters/ic-icrc1-index-ng.wasm.gz"
curl -o index.did "https://raw.githubusercontent.com/dfinity/ic/$IC_VERSION/rs/ledger_suite/icrc1/index-ng/index-ng.did"

echo "Updating dfx.json with ICRC-1 index canister configuration..."
jq '.canisters.icrc1_index_canister = {
  "type": "custom",
  "candid": "index.did",
  "wasm": "index.wasm.gz"
}' dfx.json > tmp.json && mv tmp.json dfx.json

if ! dfx replica status > /dev/null 2>&1; then
  echo "Starting local replica..."
  dfx start --background
else
  echo "Local replica already running."
fi

echo "Deploying ICRC-1 index canister..."
dfx deploy icrc1_index_canister --argument "(opt variant{Init = record {ledger_id = principal \"$LEDGER_CANISTER_ID\", retrieve_blocks_from_ledger_interval_seconds = opt $RETRIEVE_BLOCKS_FROM_LEDGER_INTERVAL_SECONDS}})"

echo "Checking ledger ID set in the index canister..."
RETURN=$(dfx canister call icrc1_index_canister ledger_id '()')
echo "$RETURN"
if [ "$RETURN" == "(principal \"$LEDGER_CANISTER_ID\")" ]; then
  echo "Ledger ID set correctly in the index canister."
else
  echo "Something went wrong! Ledger ID not set correctly in the index canister."
  exit 1
fi

echo "Checking sync status of the index canister..."
dfx canister call icrc1_index_canister status '()'

echo "Stopping local replica..."
dfx stop

echo "=== ICRC Index Canister Setup Complete ==="
