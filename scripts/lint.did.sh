#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<-EOF

	Checks that the backend candid file adheres to our policies.

	EOF
}

[[ "${1:-}" != "--help" ]] || {
  print_help
  exit 0
}

BACKEND_CANDID_FILE="$(jq -re .canisters.backend.candid dfx.json)"

has_result_types() {
  : Determining whether the backend canister contains generic Result types...
  # Strip `//` line comments before checking. Since candid >=0.10.25, Rust doc
  # comments on exported types are preserved in the generated `.did`, which
  # would otherwise cause false positives on the word "Result" in prose.
  local stripped
  stripped="$(sed 's|//.*||' "$BACKEND_CANDID_FILE")"
  grep -w Result <<<"$stripped" || grep -E 'Result_[0-9]' <<<"$stripped"
}

check_result_types() {
  : Checking whether the backend canister contains generic Result types...
  ! has_result_types || {
    echo "ERROR: $BACKEND_CANDID_FILE should not contain Result or Result_[0-9]."
    echo "       Please define custom Resut types with specific names."
    exit 1
  }
}

check() {
  : Checking the backend candid file...
  check_result_types
}

check
