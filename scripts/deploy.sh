#!/usr/bin/env bash

dfx deploy backend --argument "(variant {
  Init = record {
       ecdsa_key_name = \"dfx_test_key\"
   }
})" --mode=reinstall

dfx deploy internet_identity
dfx deploy frontend
