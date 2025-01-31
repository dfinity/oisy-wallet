#!/usr/bin/env bash
set -euo pipefail

# Install ICP ledger locally as documented in:
# https://internetcomputer.org/docs/current/developer-docs/integrations/ledger/ledger-local-setup

scripts/build.icp_ledger.wasm.sh
scripts/build.icp_ledger.args.sh
