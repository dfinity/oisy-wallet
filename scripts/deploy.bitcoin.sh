#!/bin/bash
# Original source
# https://github.com/dfinity/ckBTC-Minter-Frontend/blob/master/local_deploy.sh

# DFX_NETWORK=local
# dfx canister create bitcoin --specified-id u6s2n-gx777-77774-qaaba-cai --network "$DFX_NETWORK"
dfx deploy bitcoin --with-cycles 4000000000000