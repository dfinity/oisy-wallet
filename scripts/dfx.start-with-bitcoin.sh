#!/bin/bash

# This script assumes a local Regtest Bitcoin Core node is running.
# You can run one by executing the `setup.bitcoin-node.sh` script.

dfx start --enable-bitcoin --bitcoin-node "127.0.0.1:18444" --clean
