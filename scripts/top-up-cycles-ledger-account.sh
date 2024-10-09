#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"

print_help() {
  cat <<-EOF

	Adds cyles to a given principal's main account on the cycles ledger.

	Note: The destination account will be topped up by the desired amount minus fees.

	Note: If you have insufficient cycles on mainnet:
	* Check that you have ICP:
	  dfx ledger balance --ic
	* If not, send ICP to this account:
	  dfx ledger --ic account-id
	* Convert some ICP to cycles
	  dfx cycles --ic convert --icp 1
	* See how many cycles you have now:
	  dfx cycles --ic balance
	EOF
}

# Source the clap.bash file ---------------------------------------------------
source "$SOURCE_DIR/clap.bash"
# Define options
clap.define short=n long=network desc="dfx network to use" variable=NETWORK default="local"
clap.define short=c long=cycles desc="Number of cycles" variable=CYCLES default="1T"
clap.define short=t long=to desc="The destinantion principal or canister name" variable=ACCOUNT default="backend"
# Source the output file ----------------------------------------------------------
source "$(clap.build)"

: Verifies that the account has been specified
[[ "${ACCOUNT}" ]] || {
  echo "ERROR: Please supply the destination principal or canister name."
  print_help
}

: Converts e.g. 1T cycles to a number:
CYCLES="${CYCLES//k/K}"
CYCLES="${CYCLES//m/M}"
CYCLES="${CYCLES//g/G}"
CYCLES="${CYCLES//t/T}"
CYCLES="${CYCLES//K/_000}"
CYCLES="${CYCLES//M/_000_000}"
CYCLES="${CYCLES//G/_000_000_000}"
CYCLES="${CYCLES//T/_000_000_000_000}"

: Converts canister names to IDs:
ACCOUNT="$(dfx canister id "$ACCOUNT" --network "$NETWORK")"

top_up_local() {
  : "Tops up a local or devenv cycles account using a cycles_depositor canister."
  dfx wallet send "$(dfx canister id cycles_depositor)" "$CYCLES" --network "$NETWORK"
  dfx canister call cycles_depositor deposit --network "$NETWORK" '
	(
	  record {
	    to = record {
	    owner = principal "'"$ACCOUNT"'";
	      subaccount = null;
	    };
	    memo = null;
	    cycles = '"$CYCLES"' : nat;
	  },
	)
	'
}
top_up_mainnet() {
  : "Tops up a cycles account on mainnet or similar, where cycles cannot be magicked out of nowhere."
  dfx cycles transfer "$ACCOUNT" "$CYCLES" --network "$NETWORK"
}
is_mainnet() {
  : "Checks whether this is running on mainnet."
  : "Note: Mainnet deployments include non-production canisters on mainnet.  These should return 0."
  : "      Anything deployed to a local dfx instance or a devenv is not on mainnet, so should return 1."
  : TODO: Add support for devenv
  [[ "$NETWORK" != "local" ]]
}
top_up() {
  : Tops up a cycles account
  if is_mainnet; then
    top_up_mainnet
  else
    top_up_local
  fi
}
destination_balance() {
  : "Gets the cycles balance of the destination account."
  dfx canister call cycles_ledger icrc1_balance_of '(record { owner = principal "'"$ACCOUNT"'"; subaccount = null })' --network "$NETWORK"
}

echo "Balance before: $(destination_balance)"
top_up
echo "Balance after: $(destination_balance)"
