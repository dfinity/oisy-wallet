#!/usr/bin/env bash

./scripts/deploy.backend.sh
./scripts/deploy.airdrop.sh
dfx deploy internet_identity
dfx deploy frontend