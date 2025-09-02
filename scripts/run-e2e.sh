#!/usr/bin/env bash
set -euo pipefail
trap 'rc=$?; echo "Failed (exit $rc)" >&2; exit $rc' ERR

# Try to load nvm if it's not on PATH
if ! command -v nvm >/dev/null 2>&1; then
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$HOME/.nvm/nvm.sh"
  fi
fi

echo "Using Node 22 via nvm"
nvm install 22 && nvm use 22

echo "Installing npm dependencies"
npm ci

echo "Installing Playwright browsers"
npx playwright install

if command -v sudo >/dev/null 2>&1; then
  echo "Installing Playwright system deps (using sudo)"
  sudo npx playwright install-deps
else
  echo "No sudo available: running playwright install-deps without sudo (may fail or require elevated privileges)"
  npx playwright install-deps || true
fi

echo "Running E2E tests and reports"
npm run e2e
npm run e2e:report
npm run e2e:snapshots

