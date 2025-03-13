#!/bin/bash

if [ -z "${RELEASE_COMMIT}" ]; then
  echo "RELEASE_COMMIT is unset or set to the empty string"
  exit 1
fi

# Checkout
git fetch
git checkout "$RELEASE_COMMIT" || exit 1

# Make sure target directory exists but no prior artifacts are there
mkdir -p target
rm -f target/backend.wasm.gz target/args.txt

# Generate argument file and wasm binary
ENV=ic ./scripts/deploy.args.sh >target/args.txt
DOCKER_BUILDKIT=1 docker build --progress=plain --build-arg network=ic -o target/ .

# Verify that the wasm matches the request
dfx-orbit verify "$BACKEND_REQUEST_ID" canister install backend --mode upgrade --wasm target/backend.wasm.gz --arg-file target/args.txt
