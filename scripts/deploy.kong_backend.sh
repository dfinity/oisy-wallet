#!/usr/bin/env bash

DFX_NETWORK=local

KONG_BUILDENV="$DFX_NETWORK" dfx deploy kong_backend --network "$DFX_NETWORK" --specified-id l4lgk-raaaa-aaaar-qahpq-cai
