#!/usr/bin/env bash
set -euxo pipefail

CANISTER="backend"
export CANISTER

# Get the input variables
CANDID_FILE="$(jq -r ".canisters.$CANISTER.candid" dfx.json)"
ARGS_FILE="$(jq -r ".canisters.$CANISTER.init_arg_file" dfx.json)"
WASM_FILE="$(jq -r ".canisters.$CANISTER.wasm" dfx.json)"
BUILD_DIR="target/wasm32-unknown-unknown/release"
COMMIT_FILE="target/commit"
TAGS_FILE="target/tags"

####
# Gets commit and tag information, if available.
mkdir -p target
if test -d .git; then
  scripts/commit-metadata
else
  touch "$COMMIT_FILE" "$TAGS_FILE"
fi
# Keep just the tags with semantic versions
grep -E '^v[0-9]' "$TAGS_FILE" >"${TAGS_FILE}.semver" || true # No match is fine.

####
# Builds the candid file
mkdir -p "$(dirname "$CANDID_FILE")"
candid-extractor "$BUILD_DIR/$CANISTER.wasm" >"$CANDID_FILE"

####
# Optimize Wasm and set metadata
ic-wasm \
  "$BUILD_DIR/$CANISTER.wasm" \
  -o "$BUILD_DIR/$CANISTER.optimized.wasm" \
  shrink

# adds the content of $canister.did to the `icp:public candid:service` custom section of the public metadata in the wasm
ic-wasm "$BUILD_DIR/$CANISTER.optimized.wasm" -o "$BUILD_DIR/$CANISTER.service.wasm" metadata candid:service -f "$CANDID_FILE" -v public
ic-wasm "$BUILD_DIR/$CANISTER.service.wasm" -o "$BUILD_DIR/$CANISTER.args.wasm" metadata candid:args -f "$ARGS_FILE" -v public
ic-wasm "$BUILD_DIR/$CANISTER.args.wasm" -o "$BUILD_DIR/$CANISTER.commit.wasm" metadata git:commit -f "$COMMIT_FILE" -v public
ic-wasm "$BUILD_DIR/$CANISTER.commit.wasm" -o "$BUILD_DIR/$CANISTER.metadata.wasm" metadata git:tags -f "${TAGS_FILE}.semver" -v public

gzip -fn "$BUILD_DIR/$CANISTER.metadata.wasm"

mkdir -p "$(dirname "$WASM_FILE")"
mv "$BUILD_DIR/$CANISTER.metadata.wasm.gz" "$WASM_FILE"

####
# Success
scripts/build.report.sh "$CANISTER"
