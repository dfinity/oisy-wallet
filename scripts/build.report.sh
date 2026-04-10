#!/usr/bin/env bash
set -euo pipefail

# Which Wasm?
CANISTER="$1"

# Hash the files:
sha256sum "out/${CANISTER}".* >out/filelist.txt
# Get the metadata keys (avoid process substitution: /dev/fd can break in build runners)
tmp_wasm="$(mktemp)"
cleanup() { rm -f "$tmp_wasm"; }
trap cleanup EXIT INT TERM
gunzip -c "./out/${CANISTER}.wasm.gz" >"$tmp_wasm"
ic-wasm "$tmp_wasm" metadata >out/metadata_keys.txt
# Write a report
{
  printf "\n%s\n" "$CANISTER:"
  sha256sum "out/${CANISTER}".*
  printf "\n%s\n" "$CANISTER metadata keys:"
  cat out/metadata_keys.txt
  printf "\n%s\n\n" "To see metadata, use ic-wasm.  For example, to see the git tags:" " ic-wasm <(gunzip < ./out/$CANISTER.wasm.gz) metadata git:tags"
} | tee -a out/report.txt
