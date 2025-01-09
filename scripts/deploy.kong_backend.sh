#!/usr/bin/env bash

DFX_NETWORK=local

# TODO: update canister_e2e_ids.json with kong_backend after the e2e tests flow is unblocked
KONG_BUILDENV="$DFX_NETWORK" dfx deploy kong_backend --network "$DFX_NETWORK" --specified-id l4lgk-raaaa-aaaar-qahpq-cai
