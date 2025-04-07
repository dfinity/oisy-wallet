#!/bin/bash

POCKET_IC_SERVER_VERSION=6.0.0
OISY_UPGRADE_VERSIONS="v0.0.13,v0.0.19"
BITCOIN_CANISTER_RELEASE="2024-08-30"
BITCON_CANISTER_WASM="ic-btc-canister.wasm.gz"
CYCLES_LEDGER_CANISTER_URL="$(jq -re .canisters.cycles_ledger.wasm dfx.json)"
CYCLES_LEDGER_CANISTER_WASM="cycles-ledger.wasm.gz"
# If a backend wasm file exists at the root, it will be used for the tests.

if [ -f "./backend.wasm.gz" ]; then
  # Setting the environment variable will be used in the test to load that particular file. Relative to where the test is.
  echo "Use existing backend.wasm.gz canister."
  export BACKEND_WASM_PATH="../../backend.wasm.gz"
else
  # If none exist we build the project. The test will resolve the target/wasm32-unknown-unknown/release/backend.wasm automatically as fallback if no exported BACKEND_WASM_PATH variable is set.
  echo "Building backend canister."
  cargo build --locked --target wasm32-unknown-unknown --release -p backend
fi

if [ -f "./$BITCON_CANISTER_WASM" ]; then
  echo "Use existing $BITCON_CANISTER_WASM canister."
else
  echo "Downloading bitcoin_canister canister."
  curl -sSL "https://github.com/dfinity/bitcoin-canister/releases/download/release%2F$BITCOIN_CANISTER_RELEASE/ic-btc-canister.wasm.gz" -o $BITCON_CANISTER_WASM
fi
# Setting the environment variable that will be used in the test to load that particular file relative to the cargo workspace.
export BITCOIN_CANISTER_WASM_FILE="../../$BITCON_CANISTER_WASM"

if [ -f "./${CYCLES_LEDGER_CANISTER_WASM}" ]; then
  echo "Use existing ${CYCLES_LEDGER_CANISTER_WASM} canister."
else
  echo "Downloading cycles_ledger canister."
  curl -sSL "${CYCLES_LEDGER_CANISTER_URL}" -o "${CYCLES_LEDGER_CANISTER_WASM}"
fi

# Setting the environment variable that will be used in the test to load that particular file relative to the cargo workspace.
export CYCLES_LEDGER_CANISTER_WASM_FILE="../../${CYCLES_LEDGER_CANISTER_WASM}"

# We use a previous version of the release to ensure upgradability
IFS=',' read -r -a versions <<<"$OISY_UPGRADE_VERSIONS"

for version in "${versions[@]}"; do
  OISY_UPGRADE_PATH="./backend-${version}.wasm.gz"

  if [ ! -f "$OISY_UPGRADE_PATH" ]; then
    curl -sSL "https://github.com/dfinity/oisy-wallet/releases/download/${version}/backend.wasm.gz" -o "$OISY_UPGRADE_PATH"
  fi
done

# Download PocketIC server

POCKET_IC_SERVER_PATH="target/pocket-ic"

if [ ! -d "target" ]; then
  mkdir "target"
fi

if [[ $OSTYPE == "linux-gnu"* ]] || [[ $RUNNER_OS == "Linux" ]]; then
  PLATFORM=linux
elif [[ $OSTYPE == "darwin"* ]] || [[ $RUNNER_OS == "macOS" ]]; then
  PLATFORM=darwin
else
  echo "OS not supported: ${OSTYPE:-$RUNNER_OS}"
  exit 1
fi

if [ ! -f "$POCKET_IC_SERVER_PATH" ]; then
  echo "Downloading PocketIC."
  curl -sSL https://github.com/dfinity/pocketic/releases/download/${POCKET_IC_SERVER_VERSION}/pocket-ic-x86_64-${PLATFORM}.gz -o ${POCKET_IC_SERVER_PATH}.gz
  gunzip ${POCKET_IC_SERVER_PATH}.gz
  chmod +x ${POCKET_IC_SERVER_PATH}
else
  echo "PocketIC server already exists, skipping download."
fi

export POCKET_IC_BIN="../../${POCKET_IC_SERVER_PATH}"
export POCKET_IC_MUTE_SERVER=""

# Run tests

echo "Running backend integration tests."
cargo test -p backend "${@}"
