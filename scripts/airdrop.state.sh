#!/usr/bin/env bash

set -eExuo pipefail

# We will fetch every state of the canister

# Get init values
dfx canister call airdrop get_state_parameters --network ic

# Get rewards
dfx canister call airdrop get_state_rewards --network ic

# Get admins
dfx canister call airdrop get_state_admins --network ic

# Get managers
dfx canister call airdrop get_state_managers --network ic
