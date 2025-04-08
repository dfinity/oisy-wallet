#!/usr/bin/env bash
set -euo pipefail
version="$(jq -re .rust.version dev-tools.json)"
cargo +"$version" fmt
