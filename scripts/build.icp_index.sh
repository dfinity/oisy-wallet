#!/usr/bin/env bash
set -euo pipefail

# Install ICP index locally as documented in:
# https://internetcomputer.org/docs/current/developer-docs/integrations/ledger/ledger-local-setup

scripts/build.icp_index.wasm.sh
scripts/build.icp_index.args.sh
