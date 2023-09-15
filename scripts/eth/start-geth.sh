#!/usr/bin/env bash

# Read the files into variables
ABI_CONTENT=$(cat build/SimpleStorage.abi | tr -d '\n')
BIN_CONTENT="0x$(cat build/SimpleStorage.bin | tr -d '\n')"

# Start geth with those values as environment variables
ABI=$ABI_CONTENT BIN=$BIN_CONTENT geth --goerli attach
