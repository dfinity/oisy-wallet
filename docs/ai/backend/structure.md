# Backend Structure & Naming

## Crates

The Cargo workspace ([`Cargo.toml`](../../../Cargo.toml)) has these
members:

| Crate                     | Path                        | Purpose                                                                |
| ------------------------- | --------------------------- | ---------------------------------------------------------------------- |
| `backend`                 | `src/backend/`              | The IC canister itself (`crate-type = ["cdylib"]`, target wasm32).     |
| `shared`                  | `src/shared/`               | Public types reused across crates and exposed in the Candid interface. |
| `ic-cycles-ledger-client` | `src/cycles_ledger/client/` | Generated client for the cycles-ledger canister.                       |
| `ic-cycles-ledger-pic`    | `src/cycles_ledger/pic/`    | Pocket-IC helpers for cycles-ledger.                                   |
| `ic-cycles-ledger-types`  | `src/cycles_ledger/types/`  | Types for the cycles-ledger.                                           |

**Don't add a new crate without explicit user approval.**

The `backend` crate's public API surface is the **Candid file**
[`src/backend/backend.did`](../../../src/backend/backend.did) plus the
generated bindings under `src/declarations/backend/`.

## Module layout — `src/backend/src/`

```
src/backend/src/
├── lib.rs              Top-level wire-up: #[init], #[post_upgrade], export_candid!()
│
├── api/                Public update/query handlers, one module per area
│   ├── mod.rs          Re-exports
│   ├── admin.rs        Admin / config / stats / http_request / canister_status
│   ├── api_keys.rs
│   ├── bitcoin.rs
│   ├── contacts.rs
│   ├── custom_tokens.rs
│   ├── exchange.rs
│   ├── signer.rs
│   ├── transactions.rs
│   └── user_profile.rs
│
├── state/              Stable state container + memory IDs
│   ├── mod.rs          STATE thread_local + read_state / mutate_state / read_config
│   ├── memory.rs       MemoryManager + per-collection MemoryId constants
│   └── stored_token_migration.rs  Example of a one-shot migration helper
│
├── types/              Canister-internal types + Storable wrappers
│   ├── mod.rs
│   ├── maps.rs         StableBTreeMap / StableCell type aliases
│   └── storable.rs     Generic Candid<T> wrapper to implement Storable
│
├── signer/             Threshold-signature plumbing (chain-fusion signer)
│   ├── mod.rs
│   ├── canister_ids.rs CYCLES_LEDGER + SIGNER canister principals
│   └── service.rs      allow_signing, get_allowed_cycles, top-up flow
│
├── bitcoin/            BTC domain logic: fee-percentiles cache + pending-tx
│                       reservations. UTXO selection lives on the frontend
│                       (`prepareBtcSend` in `$btc/services/btc-utxos.service.ts`
│                       orchestrates the flow; `calculateUtxoSelection` in
│                       `$btc/utils/btc-utxos.utils.ts` picks the UTXOs).
├── contacts/           Contact-book domain
├── exchange/           Exchange-rate domain (timer + provider plumbing)
├── transactions/       User-transaction storage / queries
├── token/              Token-id helpers and storage
├── user_profile/       User profile (model + service split)
│
├── status.rs           /status endpoint body
├── delegation.rs       Delegation handler
├── benchmark.rs        canbench-rs benchmarks — wired in lib.rs behind
│                       #[cfg(feature = "canbench-rs")]. See
│                       testing.md#benchmarks--canbench.
└── utils/              Internal helpers (housekeeping timers, guards, …)
    ├── housekeeping.rs Periodic timers
    └── guards.rs       caller_is_* guard functions
```

### Domain modules

Most domain folders follow the same internal split:

- `mod.rs` — module entrypoint, re-exports.
- `model.rs` — pure domain types and operations on them (no IC calls).
- `service.rs` — orchestration, IC calls, state access. Uses the model.

Example:
[`user_profile/mod.rs`](../../../src/backend/src/user_profile/mod.rs)
declares `pub(crate) mod model;` + `pub(crate) mod service;`.

When extending a domain:

- Pure operations on a struct → `model.rs`.
- Anything that calls `state::mutate_state` / `read_state`, makes
  inter-canister calls, or returns Candid types → `service.rs`.

## Module layout — `src/shared/src/`

```
src/shared/src/
├── lib.rs
├── types.rs            Top-level type re-exports + Stats + Timestamp + traits
├── types/              One module per Candid-exposed type group
│   ├── account.rs
│   ├── agreement.rs
│   ├── api_keys.rs
│   ├── backend_config.rs
│   ├── bitcoin.rs / bitcoin/
│   ├── contact.rs
│   ├── custom_token.rs
│   ├── dapp.rs
│   ├── delegation.rs
│   ├── exchange.rs
│   ├── experimental_feature.rs
│   ├── network.rs
│   ├── notification.rs
│   ├── number.rs
│   ├── pow.rs
│   ├── result_types.rs    All `*Result` enums returned by Candid endpoints
│   ├── settings.rs
│   ├── signer.rs / signer/
│   ├── token.rs, token_id.rs, token_standard.rs
│   ├── transaction.rs, transaction_settings.rs
│   ├── user_profile.rs / user_profile/
│   └── user_transaction.rs
├── validate.rs / validate/   Validation helpers
├── http.rs               HttpRequest / HttpResponse used by /metrics + /status
├── impls.rs              Trait impls living away from type definitions
├── metrics.rs            get_metrics() helper
├── std_canister_status.rs Wrapper around the management canister status call
└── tests.rs              Cross-type tests
```

The `shared` crate is the **only** place to put types that:

- Appear in the Candid interface (`backend.did`), or
- Are reused in tests / by the cycles-ledger crates.

Canister-only types stay in `src/backend/src/types/`.

## Naming conventions

- Files and modules: `snake_case`.
- Types and traits: `PascalCase`.
- Functions / variables: `snake_case`.
- Constants / statics: `SCREAMING_SNAKE_CASE`.
- Result enums returned by Candid endpoints: `<Method>Result` —
  centralised in
  [`shared::types::result_types`](../../../src/shared/src/types/result_types.rs).
- Request types: `<Method>Request` (e.g. `CreateContactRequest`,
  `BtcAddPendingTransactionRequest`).
- Memory IDs: `<COLLECTION>_MEMORY_ID` constants in
  [`state::memory`](../../../src/backend/src/state/memory.rs).
- Stable structure type aliases: end in `Map` (`UserProfileMap`),
  `Cell` (`ConfigCell`), …, declared in
  [`types::maps`](../../../src/backend/src/types/maps.rs).

## Imports

- `imports_granularity = "Crate"`, `group_imports = "StdExternalCrate"`
  (rustfmt.toml). Don't reorder by hand — let `rustfmt` do it.
- Wildcard imports are warned (`#![warn(clippy::wildcard_imports)]` is
  on in `lib.rs`). Import explicit symbols.
- Cross-crate references use the workspace path (`shared::…`,
  `ic_cycles_ledger_client::…`).

## Where to put new code (decision tree)

1. **Is it a new public endpoint?** → add the handler under
   `src/backend/src/api/<area>.rs`; export from `api/mod.rs`; rerun
   `npm run generate`.
2. **Is it pure logic on an existing domain?** → its `model.rs`.
3. **Is it state-touching / IC-calling logic?** → its `service.rs`.
4. **Is it a brand-new domain?** → add a folder under
   `src/backend/src/<domain>/` with at least `mod.rs`. Wire it from
   `lib.rs` (`mod <domain>;`) and from any startup hook (`init`,
   `post_upgrade`, timer setup).
5. **Is it a request/response/result type used in `backend.did`?** →
   `src/shared/src/types/<area>.rs`.
6. **Is it a canister-only type?** → `src/backend/src/types/`.
7. **Is it a new persisted collection?** → bump
   `src/backend/src/state/memory.rs`, add a type alias in
   `types::maps`, add a field to `state::State`, initialise it in the
   `STATE` thread-local, and follow
   [`workflows/state-and-migrations.md`](./workflows/state-and-migrations.md).
8. **Is it a guard?** → `src/backend/src/utils/guards.rs`.
9. **Generated code?** → don't write it by hand. Run the generator.
