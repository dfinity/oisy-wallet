#!/usr/bin/env bash

npm rm @dfinity/agent @dfinity/auth-client @dfinity/candid @dfinity/principal @dfinity/ckbtc @dfinity/cketh @dfinity/ledger-icp @dfinity/ledger-icrc @dfinity/utils

npm rm @dfinity/identity-secp256k1 @dfinity/ic-management -D

npm i @dfinity/agent@1.4.0 @dfinity/auth-client@1.4.0 @dfinity/candid@1.4.0 @dfinity/principal@1.4.0 @dfinity/ckbtc@latest @dfinity/cketh@latest @dfinity/ledger-icp@latest @dfinity/ledger-icrc@latest @dfinity/utils@latest

npm i @dfinity/identity-secp256k1@1.4.0 @dfinity/ic-management@latest -D
