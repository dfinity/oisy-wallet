#!/usr/bin/env bash
set -euo pipefail

BACKEND_CANDID_FILE="$(jq -re .canisters.backend.candid dfx.json)"

has_result_types() {
  git grep -w Result "$BACKEND_CANDID_FILE" || git grep -E 'Result_[0-9]' "$BACKEND_CANDID_FILE"
}

check_result_types() {
  ! has_result_types || {
    echo "ERROR: $BACKEND_CANDID_FILE should not contain Result or Result_[0-9]."
    echo "       Please define custom Resut types with specific names."
    exit 1
  }
}

check() {
  check_result_types
}

check
