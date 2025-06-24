#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"

print_help() {
  cat <<-EOF

	Grants a developer permission to upload assets to a frontend canister.

	EOF
}

# Source the clap.bash file ---------------------------------------------------
source "$SOURCE_DIR/clap.bash"
# Define options
clap.define short=n long=network desc="dfx network to use" variable=NETWORK default="local"
clap.define short=p long=principal desc="developer principal" variable=DEVELOPER_PRINCIPAL default="local"
# Source the output file ----------------------------------------------------------
source "$(clap.build)"

dfx canister call --identity default --network "$NETWORK" frontend grant_permission "
(
  record {
    permission = variant { Commit };
    to_principal = principal \"$DEVELOPER_PRINCIPAL\";
  },
)
"
dfx canister call --identity default --network "$NETWORK" frontend grant_permission "
(
  record {
    permission = variant { Prepare };
    to_principal = principal \"$DEVELOPER_PRINCIPAL\";
  },
)
"
