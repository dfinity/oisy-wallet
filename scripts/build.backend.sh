#!/usr/bin/env bash
set -euxo pipefail

scripts/build.backend.wasm.sh
scripts/build.backend.args.sh
scripts/commit-metadata
scripts/build.backend.metadata.sh
