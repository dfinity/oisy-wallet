#!/usr/bin/env bash
set -euo pipefail

ARG_FILE="$(jq -re .canisters.ckusdc_index.init_arg_file dfx.json)"

mkdir -p "$(dirname "$ARG_FILE")"

cat <<-EOF >"$ARG_FILE"
(opt variant {
  Init = record {
    ledger_id = principal "$CANISTER_ID_CKUSDC_LEDGER";
   }
})
EOF
