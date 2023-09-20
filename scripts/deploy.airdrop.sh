#!/usr/bin/env bash

DFX_PRINCIPAL=$(dfx identity get-principal)

if [ -n "${ENV+1}" ]; then
  echo "TODO: to be implemented"
else
    dfx deploy airdrop --argument '(vec {principal"'${DFX_PRINCIPAL}'"})' --mode reinstall

    "$(git rev-parse --show-toplevel)/scripts/generate-codes.sh" 20 1000
fi
