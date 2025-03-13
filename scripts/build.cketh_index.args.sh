#!/usr/bin/env bash
set -euo pipefail

ARG_FILE="$(jq -re .canisters.cketh_index.init_arg_file dfx.json)"

mkdir -p "$(dirname "$ARG_FILE")"

cat <<-EOF >"$ARG_FILE"
(opt variant {
  Init = record {
    ledger_id = principal "$CANISTER_ID_CKETH_LEDGER";
   }
})
EOF
