#!/usr/bin/env bash
set -euxo pipefail

# Ensure that a minter id exists:
dfx identity get-principal --identity minter 2>/dev/null || dfx identity new minter --storage-mode=plaintext

MINTER_ACCOUNT_ID=$(dfx ledger account-id --identity minter)
CALLER_ACCOUNT_ID=$(dfx ledger account-id)

ARGS_FILE="$(jq -re .canisters.testicp_ledger.init_arg_file dfx.json)"
mkdir -p "$(dirname "$ARGS_FILE")"

mkdir -p target/ic
cat <<EOF >"$ARGS_FILE"
  (variant {
    Init = record {
      minting_account = "$MINTER_ACCOUNT_ID";
      initial_values = vec {
        record {
          "$CALLER_ACCOUNT_ID";
          record {
            e8s = 100_000_000_000 : nat64;
          };
        };
      };
      send_whitelist = vec {};
      transfer_fee = opt record {
        e8s = 10_000 : nat64;
      };
      token_symbol = opt "LTESTICP";
      token_name = opt "Local TESTICP";
    }
  })
EOF
