#!/usr/bin/env bash

./scripts/deploy.backend.sh
dfx deploy internet_identity
dfx deploy frontend