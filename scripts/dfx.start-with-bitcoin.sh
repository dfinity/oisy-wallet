#!/bin/bash

# This script assumes a local Regtest Bitcoin Core node is running.
# You can run one by executing the `setup.bitcoin-node.sh` script.

# Initialize a flag for the --reset option
clean_flag=false

# Loop through the arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --clean)
            clean_flag=true  # Set the reset flag to true if --reset is provided
            shift            # Move to the next argument
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [ "$clean_flag" = true ]; then
    dfx start --enable-bitcoin --bitcoin-node "127.0.0.1:18444" --clean
else
    dfx start --enable-bitcoin --bitcoin-node "127.0.0.1:18444"
fi
