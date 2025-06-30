#!/usr/bin/env bash
set -euo pipefail

PRINCIPAL="$(dfx identity get-principal)"
ARG_FILE="$(jq -re .canisters.bitcoin.init_arg_file dfx.json)"

mkdir -p "$(dirname "$ARG_FILE")"

cat <<-EOF >"$ARG_FILE"
(
  record {
    stability_threshold = opt 1 : opt nat;
    network = opt variant { regtest };
    syncing = opt variant { disabled };
    api_access = opt variant { enabled };
    disable_api_if_not_fully_synced = opt variant { disabled };
    watchdog = opt variant { disabled };
  }
)
EOF
