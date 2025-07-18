#!/usr/bin/env bash
set -euo pipefail

# Which Wasm?
CANISTER="$1"

# Hash the files:
sha256sum "out/${CANISTER}".* >out/filelist.txt
# Get the metadata keys:
ic-wasm <(gunzip <"./out/${CANISTER}.wasm.gz") metadata >out/metadata_keys.txt
# Write a report
{
  printf "\n%s\n" "$CANISTER:"
  sha256sum "out/${CANISTER}".*
  printf "\n%s\n" "$CANISTER metadata keys:"
  cat out/metadata_keys.txt
  printf "\n%s\n\n" "To see metadata, use ic-wasm.  For example, to see the git tags:" " ic-wasm <(gunzip < ./out/$CANISTER.wasm.gz) metadata git:tags"
} | tee -a out/report.txt
