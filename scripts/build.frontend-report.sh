#!/usr/bin/env bash
set -euo pipefail

{
  # Hash the env file.
  # Note: Whitespace is removed from end of lines and the end of file.
  # TODO: Support other environments as well.
  ENV_FILE=".env.production"
  perl -pe 'eof&&chomp;s/\s+$//g' "$ENV_FILE" | sha256sum | awk -v e="$ENV_FILE" '{ $2=e; print}'
}
