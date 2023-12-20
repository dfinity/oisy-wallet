#!/usr/bin/env bash

# Install ICP index locally as documented in:
# https://internetcomputer.org/docs/current/developer-docs/integrations/ledger/icp-index-local-setup

IC_VERSION=d87954601e4b22972899e9957e800406a0a6b929
curl -o icp_index.wasm.gz "https://download.dfinity.systems/ic/$IC_VERSION/canisters/ic-icp-index-canister.wasm.gz"
gunzip icp_index.wasm.gz
curl -o icp_index.did "https://raw.githubusercontent.com/dfinity/ic/$IC_VERSION/rs/rosetta-api/icp_ledger/index/index.did"

LEDGER_ACCOUNT_ID=$(dfx canister id icp_ledger)

dfx deploy icp_index --specified-id qhbym-qaaaa-aaaaa-aaafq-cai --argument '(record {ledger_id = principal"'${LEDGER_ACCOUNT_ID}'";})'

dfx canister call qhbym-qaaaa-aaaaa-aaafq-cai ledger_id '()'

dfx canister call qhbym-qaaaa-aaaaa-aaafq-cai status '()'