#!/bin/bash

dfx identity new minter
dfx identity use minter
MINTER_ID=$(dfx identity get-principal)

dfx identity use default

PEM_FILE=/Users/daviddalbusco/.config/dfx/identity/default/identity.pem

node ./scripts/deploy.snses.mjs --minterId $MINTER_ID --pemFile $PEM_FILE