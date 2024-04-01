#!/bin/bash

POCKET_IC_SERVER_VERSION=3.0.1

if [ ! -d "target" ]
then
     mkdir "target"
fi

if [[ $OSTYPE == "linux-gnu"* ]] || [[ $RUNNER_OS == "Linux" ]]
then
    PLATFORM=linux
elif [[ $OSTYPE == "darwin"* ]] || [[ $RUNNER_OS == "macOS" ]]
then
    PLATFORM=darwin
else
    echo "OS not supported: ${OSTYPE:-$RUNNER_OS}"
    exit 1
fi

if [ ! -f "$POCKET_IC_PATH" ]; then
  echo "Downloading PocketIC."
  curl -sSL https://github.com/dfinity/pocketic/releases/download/${POCKET_IC_SERVER_VERSION}/pocket-ic-x86_64-${PLATFORM}.gz -o target/pocket-ic.gz
  gunzip target/pocket-ic.gz
  chmod +x target/pocket-ic
else
    echo "PocketIC already exists, skipping download."
fi

echo "Building backend canister."
cargo build --locked --target wasm32-unknown-unknown --release -p backend

echo "Running backend integration tests."
POCKET_IC_BIN=../../target/pocket-ic cargo test -p backend