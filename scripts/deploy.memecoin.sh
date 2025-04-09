#!/bin/bash

dfx identity new minter
MINTER_ID=$(dfx identity get-principal --identity minter)

PEM_FILE=/Users/daviddalbusco/.config/dfx/identity/default/identity.pem

node ./scripts/deploy.memecoin.mjs --minterId "$MINTER_ID" --pemFile "$PEM_FILE"
