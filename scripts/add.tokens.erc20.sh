#!/bin/sh

if [ -n "$1" ]; then
  ETHERSCAN_API_KEY=$1
  node ./scripts/add.tokens.erc20.mjs --etherscan-api-key "$ETHERSCAN_API_KEY"
else
  node ./scripts/add.tokens.erc20.mjs
fi
