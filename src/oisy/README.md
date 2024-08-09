# `oisy` CLI

This is a tool used to move state from one Oisy instance to another.

## How it works

This tool:

- Configures both source and destination canisters to stop receiving writes.
- Verifies that the destination is empty.
- Copies all the data from the source canister to the destination canister.
- Checks the data transfer.
- Enables writes on the destination canister.

Utilities are also provided to check the state of both canisters.
