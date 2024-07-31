#!/usr/bin/env bash
set -euxo pipefail
cd "$(dirname "$(realpath "$0")")/.."

set -x
time xargs -P8 -I{} bash -c "{}" <<EOF
./scripts/format.cargo.sh
./scripts/format.rust.sh
./scripts/format.sh.sh
EOF
