#!/usr/bin/env bash

# Install ICP index locally as documented in:
# https://internetcomputer.org/docs/current/developer-docs/integrations/ledger/icp-index-local-setup

LEDGER_ACCOUNT_ID=$(dfx canister id icp_ledger)

dfx deploy icp_index --specified-id qhbym-qaaaa-aaaaa-aaafq-cai --argument '(record {ledger_id = principal"'${LEDGER_ACCOUNT_ID}'";})'

dfx canister call qhbym-qaaaa-aaaaa-aaafq-cai ledger_id '()'

dfx canister call qhbym-qaaaa-aaaaa-aaafq-cai status '()'