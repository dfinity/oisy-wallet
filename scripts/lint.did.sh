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
  git grep -w Result "$BACKEND_CANDID_FILE" || git grep -E 'Result_[0-9]' "$BACKEND_CANDID_FILE"
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
