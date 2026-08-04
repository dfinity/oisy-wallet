#!/bin/bash

POCKET_IC_SERVER_VERSION="$(cargo metadata --locked --format-version 1 |
  jq -r '[.packages[] | select(.name=="pocket-ic") | .version] | first')"
if [ -z "${POCKET_IC_SERVER_VERSION}" ] || [ "${POCKET_IC_SERVER_VERSION}" = "null" ]; then
  echo "Failed to determine pocket-ic version from Cargo metadata." >&2
  exit 1
fi
BITCOIN_CANISTER_RELEASE="2024-08-30"
BITCOIN_CANISTER_WASM="ic-btc-canister.wasm.gz"
CYCLES_LEDGER_CANISTER_URL="$(jq -re .canisters.cycles_ledger.wasm dfx.json)"
CYCLES_LEDGER_CANISTER_WASM="cycles-ledger.wasm.gz"
II_CANISTER_URL="$(jq -re .canisters.internet_identity.wasm dfx.json)"
II_CANISTER_WASM="internet_identity.wasm.gz"
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

scripts/download-immutable.sh "https://github.com/dfinity/bitcoin-canister/releases/download/release%2F$BITCOIN_CANISTER_RELEASE/ic-btc-canister.wasm.gz" "$BITCOIN_CANISTER_WASM"
# Setting the environment variable that will be used in the test to load that particular file relative to the cargo workspace.
export BITCOIN_CANISTER_WASM_FILE="../../$BITCOIN_CANISTER_WASM"

scripts/download-immutable.sh "${CYCLES_LEDGER_CANISTER_URL}" "${CYCLES_LEDGER_CANISTER_WASM}"
# Setting the environment variable that will be used in the test to load that particular file relative to the cargo workspace.
export CYCLES_LEDGER_CANISTER_WASM_FILE="../../${CYCLES_LEDGER_CANISTER_WASM}"

scripts/download-immutable.sh "${II_CANISTER_URL}" "${II_CANISTER_WASM}"
export II_CANISTER_WASM_FILE="../../${II_CANISTER_WASM}"

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

ARCH=$(uname -m)
if [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]]; then
  ARCH=arm64
else
  ARCH=x86_64
fi

scripts/download-immutable.sh "https://github.com/dfinity/pocketic/releases/download/${POCKET_IC_SERVER_VERSION}/pocket-ic-${ARCH}-${PLATFORM}.gz" "${POCKET_IC_SERVER_PATH}.gz"

if [ ! -f "${POCKET_IC_SERVER_PATH}" ] || [ "${POCKET_IC_SERVER_PATH}.gz" -nt "${POCKET_IC_SERVER_PATH}" ]; then
  gzip -dc "${POCKET_IC_SERVER_PATH}.gz" >"${POCKET_IC_SERVER_PATH}"
  chmod +x "${POCKET_IC_SERVER_PATH}"
fi

export POCKET_IC_BIN="../../${POCKET_IC_SERVER_PATH}"
export POCKET_IC_MUTE_SERVER=1

./scripts/download-canister-api --network ic --canister backend

# Run tests

# Each integration test spins up a PocketIC instance holding several canisters,
# and the PocketIC server's memory grows with every instance it has ever served
# (deleted instances are not fully reclaimed). Running the whole `it` suite in a
# single process therefore OOM-kills the server mid-run.
#
# On CI, run the suite with nextest, which executes each test in its own process:
# every integration test gets a fresh PocketIC server, so its memory is released
# when the process exits and never accumulates across the suite. NEXTEST_PARTITION
# (e.g. "count:1/4"), set by the CI matrix, shards the suite across parallel jobs.
# Explicit cargo arguments (e.g. `-- --ignored candid`) and local runs keep the
# plain single-process `cargo test` behaviour.
echo "Running backend tests."
if [ "$#" -eq 0 ] && [ -n "${CI:-}" ]; then
  nextest_args=(run -p backend)
  [ -z "${NEXTEST_PARTITION:-}" ] || nextest_args+=(--partition "${NEXTEST_PARTITION}")
  cargo nextest "${nextest_args[@]}"
else
  cargo test -p backend "${@}"
fi
