#!/bin/bash
set -euo pipefail

if [ -z "${RELEASE_COMMIT:-}" ]; then
  echo "RELEASE_COMMIT is unset or set to the empty string"
  exit 1
fi

if [ -z "${ENV_SHA:-}" ]; then
  echo "ENV_SHA is unset or set to the empty string"
  exit 1
fi

# Checkout
git fetch
git checkout "$RELEASE_COMMIT" || exit 1

# Make sure target directory exists but no prior artifacts are there
mkdir -p target
rm -fr target/frontend target/legacy_signer_frontend

# Check that the frontend ENV file matches the hash and build the legacy signer frontend
echo "$ENV_SHA .env.production" | sha256sum -c || exit 1
DOCKER_BUILDKIT=1 docker build -f Dockerfile.frontend --progress=plain --build-arg network=ic --build-arg signer_target=legacy_signer -o target/ .
mv target/frontend target/legacy_signer_frontend

# Check that the artifacts match the commit args
dfx-orbit verify "$LEGACY_SIGNER_FRONTEND_REQUEST_ID" asset upload legacy_signer_frontend --batch-id "$LEGACY_SIGNER_FRONTEND_BATCH_ID" --files target/legacy_signer_frontend
