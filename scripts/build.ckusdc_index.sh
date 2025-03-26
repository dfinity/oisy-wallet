#!/usr/bin/env bash
set -euo pipefail
scripts/download.cketh.sh # Uses the same Wasms as cketh.
scripts/build.ckusdc_index.args.sh
