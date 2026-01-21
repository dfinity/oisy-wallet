#!/usr/bin/env bash
set -euo pipefail
rc=0
trap 'rc=$?; echo "Failed (exit $rc)" >&2; exit $rc' ERR

# Load nvm if it's available but not on PATH
if ! command -v nvm >/dev/null 2>&1; then
  if [ -n "${NVM_DIR-}" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
  elif [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$HOME/.nvm/nvm.sh"
  fi
fi

if ! command -v nvm >/dev/null 2>&1; then
  echo "nvm not found. Install nvm or run this script in a shell that has nvm loaded." >&2
  exit 1
fi

echo "Using Node 22 via nvm"
# Install and switch to Node 22
nvm install 22
nvm use 22

echo "Installing npm dependencies"
npm ci

echo "Installing Playwright browsers"
npx playwright install

# Try to install system deps for Playwright. Use sudo if available.
if command -v sudo >/dev/null 2>&1; then
  echo "Installing Playwright system deps (using sudo)"
  sudo -E npx playwright install-deps
else
  echo "No sudo available: running playwright install-deps without sudo (may fail or require elevated privileges)"
  npx playwright install-deps || true
fi

echo "Running E2E tests"
npm run e2e

echo "Generating E2E report"
npm run e2e:report

echo "Updating E2E snapshots"
npm run e2e:snapshots
