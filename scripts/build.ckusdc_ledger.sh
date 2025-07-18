#!/usr/bin/env bash
set -euo pipefail
scripts/download.cketh.sh # Uses the same Wasm as cketh.
scripts/build.ckusdc_ledger.args.sh
