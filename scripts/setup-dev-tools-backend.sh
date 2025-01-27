#!/usr/bin/env bash
set -euo pipefail

cargo install cargo-binstall

./scripts/setup candid-extractor

./scripts/setup ic-wasm
