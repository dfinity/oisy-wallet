#!/bin/bash

print_help() {
  cat <<-EOF

	Mines blocks to a given address.

Arguments:
--amount <amount>  Amount of BTC to mine.
--address <address>  Address to mine to.

If no amount and no address are provided, it will mine a block to a random address.
	EOF
  # TODO: Consider using clap for argument parsing.  If not, describe the flags here.
}

BITCOIN_DIR="bitcoin-core"

# Initialize variables for the parameters
amount=""
address=""

# Loop through the parameters
while [[ "$#" -gt 0 ]]; do
  case $1 in
  --help) print_help && exit 0 ;;
  --amount)
    amount="$2"
    shift 2
    ;; # Assign the next argument to amount and shift
  --address)
    address="$2"
    shift 2
    ;; # Assign the next argument to address and shift
  *)
    echo "Unknown parameter passed: $1"
    exit 1
    ;;
  esac
done

if [ -n "$amount" ] && [ -n "$address" ]; then
  # Reference: https://internetcomputer.org/docs/current/developer-docs/multi-chain/bitcoin/using-btc/local-development
  ./$BITCOIN_DIR/bin/bitcoin-cli -conf="$(pwd)/$BITCOIN_DIR/bitcoin.conf" generatetoaddress "$amount" "$address"
  # One caveat of the previous block rewards is that they are subject to the Coinbase maturity rule
  # which states that, in order for you to spend them, you will first need to mine 100 additional blocks.
  # Therefore, we will generate 100 blocks to a random address.
  ./$BITCOIN_DIR/bin/bitcoin-cli -conf="$(pwd)/$BITCOIN_DIR/bitcoin.conf" generatetoaddress 100 mtbZzVBwLnDmhH4pE9QynWAgh6H3aC1E6M
else
  # Step necessary after making a transaction so that it becomes part of the blockchain
  ./$BITCOIN_DIR/bin/bitcoin-cli -conf="$(pwd)/$BITCOIN_DIR/bitcoin.conf" generatetoaddress 1 mtbZzVBwLnDmhH4pE9QynWAgh6H3aC1E6M
fi
