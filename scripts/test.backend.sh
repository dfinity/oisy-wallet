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

# Each integration test spins up a PocketIC instance holding several canisters.
# The PocketIC server's memory grows with every instance it has ever served
# (deleted instances are not fully reclaimed), so running the whole `it` suite
# in a single process eventually OOM-kills the server mid-run (connection reset
# -> SIGABRT) — and the larger the backend wasm grows, the sooner it dies.
#
# On CI, bound that growth by running the integration suite in chunks: each
# chunk is its own `cargo test --test it` process with a fresh PocketIC server,
# so peak server memory is capped at one chunk's worth of instances. Explicit
# cargo arguments (e.g. `-- --ignored candid`) and local runs keep the original
# single-process behaviour.
run_it_in_chunks() {
  local chunk_size="${BACKEND_IT_TEST_CHUNK_SIZE:-40}"
  local tests=()
  local line
  while IFS= read -r line; do
    tests+=("${line%: test}")
  done < <(cargo test -p backend --test it -- --list 2>/dev/null | grep ': test$')

  if [ "${#tests[@]}" -eq 0 ]; then
    echo "Could not list integration tests; running them in a single process." >&2
    cargo test -p backend --test it
    return
  fi

  echo "Running ${#tests[@]} integration tests in chunks of ${chunk_size}."
  local status=0 i
  for ((i = 0; i < ${#tests[@]}; i += chunk_size)); do
    local chunk=("${tests[@]:i:chunk_size}")
    echo "::group::it tests $((i + 1))-$((i + ${#chunk[@]})) / ${#tests[@]}"
    cargo test -p backend --test it -- --exact "${chunk[@]}" || status=1
    echo "::endgroup::"
  done
  return "$status"
}

echo "Running backend tests."
if [ -n "${CI:-}" ] && [ "$#" -eq 0 ]; then
  # Single-threaded within a chunk keeps peak live memory low; chunking caps the
  # cumulative server growth that single-threading alone could not. Overridable
  # via RUST_TEST_THREADS.
  export RUST_TEST_THREADS="${RUST_TEST_THREADS:-1}"
  rc=0
  cargo test -p backend --lib || rc=1
  run_it_in_chunks || rc=1
  exit "$rc"
else
  cargo test -p backend "${@}"
fi
