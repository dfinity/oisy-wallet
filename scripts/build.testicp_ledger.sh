#!/usr/bin/env bash
set -euo pipefail

# Install TESTICP ledger locally as documented in:
# https://internetcomputer.org/docs/current/developer-docs/integrations/ledger/ledger-local-setup

scripts/build.testicp_ledger.wasm.sh
scripts/build.testicp_ledger.args.sh
