#!/usr/bin/env bash
set -euo pipefail
# Lint the rust code
cargo clippy --locked --target wasm32-unknown-unknown --all-features -- -D warnings -W clippy::pedantic -A clippy::module-name-repetitions -A clippy::struct-field-names
