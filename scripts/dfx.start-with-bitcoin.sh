#!/bin/bash

print_help() {
  cat <<-EOF

	Starts local replica with dfx supporting bitcoin.

This script assumes a local Regtest Bitcoin Core node is running.
You can run one by executing the "setup.bitcoin-node.sh" script.

Arguments:

--clean resets the replica state. Needed if you were running another replica before without bitcoin.
	EOF
  # TODO: Consider using clap for argument parsing.  If not, describe the flags here.
}

# Initialize a flag for the --reset option
clean_flag=false

# Loop through the arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
  --help) print_help && exit 0 ;;
  --clean)
    clean_flag=true # Set the reset flag to true if --reset is provided
    shift           # Move to the next argument
    ;;
  *)
    echo "Unknown option: $1"
    exit 1
    ;;
  esac
done

if [ "$clean_flag" = true ]; then
  dfx start -vv --enable-bitcoin --bitcoin-node "127.0.0.1:18444" --clean
else
  dfx start -vv --enable-bitcoin --bitcoin-node "127.0.0.1:18444"
fi
