# How-to

This document provides valuable information regarding Oisy Wallet integration and features.

## SNS Token Support

The [SNS aggregator](https://3r4gx-wqaaa-aaaaq-aaaia-cai.icp0.io/) is used to pre-populate the list of available SNSes. This information is not fetched at runtime because it does not change frequently. Moreover, this approach is best suited for a smoother UI/UX experience.

> Note: Some SNSes may not be enabled due to their related Index canister version being outdated and therefore not compatible with Oisy Wallet. If you wish to use these, contact the related project to propose an upgrade to their canister.

See script [./script/buil.dsns.tokens.mjs](./script/buil.dsns.tokens.mjs) for more details.

## Custom ICRC Token Integration

Oisy Wallet allows users to add custom [ICRC](https://internetcomputer.org/docs/current/developer-docs/defi/overview/#icrc-1-ledgers) tokens to their wallet. However, certain requirements must be met to ensure compatibility and security.

This chapter outlines the necessary steps and considerations for integrating a custom token into Oisy Wallet.

### Requirements

To add a custom token to Oisy Wallet, users must provide both a Ledger and Index canister ID. The Ledger canister ID is straightforward, representing the ledger where the token transactions are recorded. However, the Index canister ID is also required because Oisy Wallet does not index transactions and balances. Instead, Oisy reads balance and transactions from an indexer, the Index canister.

### Index Canister

Custom tokens seeking compatibility with Oisy Wallet can choose one of the following options for the Index canister:

1. Spin up an Index canister on mainnet using the index-ng WASM.

2. Provide a custom canister that implements specific functions.

### Index-ng

The source code of the Index-ng canister can be found in the Internet Computer main [repository](https://github.com/dfinity/ic/tree/master/rs/rosetta-api/icrc1/index-ng) and can be downloaded using the following script:

```bash
#!/bin/bash

IC_COMMIT="43f31c0a1b0d9f9ecbc4e2e5f142c56c7d9b0c7b"

curl -sSL https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-icrc1-index-ng.wasm.gz -o "$DIR"/ckbtc_index.wasm.gz
gunzip "$DIR"/ckbtc_index.wasm.gz

curl -sSL https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/rosetta-api/icrc1/index-ng/index-ng.did -o "$DIR"/ckbtc_index.did
```

> Tips: You can follow this [guide](https://internetcomputer.org/docs/current/developer-docs/defi/icrc-1/icrc1-index-setup) to deploy an ICRC-1 index canister locally.

### Custom Canister

If opting for a custom canister, it must implement the following two endpoints: one to retrieve the related Ledger canister ID and one function to effectively provide the balance and transactions.

It's important to note that although both functions are queries, for security reasons, they are called with both query and update.

> Oisy uses the JavaScript library [@dfinity/ledger-icrc](https://github.com/dfinity/ic-js/tree/main/packages/ledger-icrc) to interact with the canister.

#### Ledger ID

This function is used to verify that the Index canister is indeed linked with the Ledger. It returns the principal of the Ledger associated with the Index canister.

```
ledger_id : () -> (principal) query;
```

#### Get balance and transactions

This function allows querying of balance and transactions for a specific account. Oisy Wallet uses the principal provided by Internet Identity for the current account without a sub-account.

```
get_account_transactions : (GetAccountTransactionsArgs) -> (GetTransactionsResult) query;
```

Find more information in the Index-ng [Candid file definition](https://github.com/dfinity/ic/blob/master/rs/rosetta-api/icrc1/index/index.did).
