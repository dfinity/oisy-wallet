#!/usr/bin/env bash
set -euo pipefail

./scripts/setup cargo-binstall

./scripts/setup candid-extractor

./scripts/setup ic-wasm  