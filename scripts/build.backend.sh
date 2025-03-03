#!/usr/bin/env bash
set -euxo pipefail
BACKEND_BUILD_STRATEGY="${BACKEND_BUILD_STRATEGY:-full}"

assert_wasm_preexists() {
  test -e "$BACKEND_WASM_FILE" || {
    echo "ERROR with '$BACKEND_BUILD_STRATEGY' strategy: Wasm file not found at: '$BACKEND_WASM_FILE'"
    echo "      Please run 'dfx build backend' first."
    exit 1
  } >&2
}
assert_args_preexist() {
  test -e "$BACKEND_ARGUMENT_FILE" || {
    echo "ERROR with '$BACKEND_BUILD_STRATEGY' strategy: Argument file not found at: '$BACKEND_WASM_FILE'"
    echo "      Please run 'dfx build backend' first."
    exit 1
  } >&2
}

case "$BACKEND_BUILD_STRATEGY" in
docker)
  # Build Wasm with docker
  scripts/docker-build
  ;;
none | prebuilt)
  echo "In this mode, existing args and Wasm are used."
  BACKEND_WASM_FILE="$(jq -r .canisters.backend.wasm dfx.json)"
  BACKEND_ARGUMENT_FILE="$(jq -r .canisters.backend.init_arg_file dfx.json)"
  test -e "$BACKEND_WASM_FILE" || {
    echo "ERROR with 'prebuilt' strategy: Wasm file not found at: '$BACKEND_WASM_FILE'"
    echo "      Please run 'dfx build backend' first."
    exit 1
  } >&2
  test -e "$BACKEND_ARGUMENT_FILE" || {
    echo "ERROR with 'prebuilt' strategy: Argument file not found at: '$BACKEND_WASM_FILE'"
    echo "      Please run 'dfx build backend' first."
    exit 1
  } >&2
  ;;
args)
  echo "In this mode, only the arguments are recreated.  An existing Wasm is used."
  BACKEND_WASM_FILE="$(jq -r .canisters.backend.wasm dfx.json)"
  test -e "$BACKEND_WASM_FILE" || {
    echo "ERROR with 'prebuilt' strategy: Wasm file not found at: '$BACKEND_WASM_FILE'"
    echo "      Please run 'dfx build backend' first."
    exit 1
  } >&2
  scripts/build.backend.args.sh
  ;;
full)
  scripts/build.backend.wasm.sh
  scripts/build.backend.args.sh
  scripts/commit-metadata
  scripts/build.backend.metadata.sh
  ;;
*)
  echo "ERROR: Unsupported BACKEND_BUILD_STRATEGY env var value: '${BACKEND_BUILD_STRATEGY:-}'" >&2
  exit 1
  ;;
esac
