# Backend Patterns

Idiomatic Rust + IC canister patterns for this repo. If a pattern here
disagrees with code in `src/backend/` or `src/shared/`, the code wins
(truth hierarchy in [governance.md](../governance.md)). Update this page
in the same PR — that's the
[meta-update rule](../governance.md#meta-update-rule).

## Errors — typed, not panicked

- **No `unwrap()` / `expect()` outside tests.** clippy `pedantic` will
  warn; reviewers will block.
- **No `panic!()` outside `init` / `post_upgrade` traps.** Inside
  `init` / `post_upgrade`, prefer `ic_cdk::trap("…")` with a clear
  message (see [`lib.rs`](../../../src/backend/src/lib.rs)).
- **Return typed result enums** from Candid endpoints. The canonical
  enums live in
  [`shared::types::result_types`](../../../src/shared/src/types/result_types.rs)
  and follow the shape:

  ```rust
  pub enum CreateUserProfileResult {
      Ok(UserProfile),
      Err(CreateUserProfileError),
  }
  ```

  Add a new `*Result` enum there when introducing a new endpoint;
  reusing an existing one is preferred when the error space matches.

- **Convert `Result<T, E>` → endpoint enum** at the API boundary. Inside
  `model.rs` / `service.rs`, return `Result<T, E>`; in `api/<area>.rs`
  map it into the `*Result` Candid enum.

- **Internal logging.** Use `ic_cdk::println!` (not `std::println!` —
  clippy disallows). For errors that you want to surface in canister
  logs but not propagate to the caller, log + map to a typed error.

## State — single borrow, single owner

- All persisted state lives in the single `thread_local!` `STATE` cell
  in [`state/mod.rs`](../../../src/backend/src/state/mod.rs).
- **Read** with `state::read_state(|s| …)`.
- **Write** with `state::mutate_state(|s| …)`.
- **Config** has dedicated helpers `state::read_config(|c| …)` /
  `state::set_config(arg)` because it lives in a `StableCell`.
- **Never hold a state borrow across `.await`.** Borrow, copy out the
  data you need, drop the borrow, then await.

  ```rust
  // Bad:
  state::mutate_state(|s| async move {
      let value = call_other_canister().await; // borrow held across await
      s.map.insert(key, value);
  });

  // Good:
  let value = call_other_canister().await;
  state::mutate_state(|s| s.map.insert(key, value));
  ```

- **Don't introduce parallel globals.** New persisted state goes through
  `state::State` + a new `MemoryId`. See
  [`workflows/state-and-migrations.md`](./workflows/state-and-migrations.md).

## Stable structures — only

- All persisted collections use `ic-stable-structures`
  (`StableBTreeMap`, `StableCell`, …) keyed by a `MemoryId` from
  [`state::memory`](../../../src/backend/src/state/memory.rs).
- Type aliases for the maps/cells live in
  [`types::maps`](../../../src/backend/src/types/maps.rs).
- Custom types are made `Storable` via the generic
  [`Candid<T>`](../../../src/backend/src/types/storable.rs) wrapper.
- Adding, renaming, or repurposing a `MemoryId` is a state migration. See
  [`workflows/state-and-migrations.md`](./workflows/state-and-migrations.md)
  for the contract.

## Guards on endpoints

Public update / query handlers should declare the right guard:

| Caller class                                  | Guard                       | Defined in                        |
| --------------------------------------------- | --------------------------- | --------------------------------- |
| Anonymous OK                                  | _none_                      | —                                 |
| Authenticated, profile may not yet exist      | `caller_is_not_anonymous`   | `src/backend/src/utils/guards.rs` |
| Authenticated, must have a registered profile | `caller_is_registered_user` | same                              |
| Controller-only (admin)                       | `caller_is_controller`      | same                              |
| Allowed-callers list (admin / monitoring)     | `caller_is_allowed`         | same                              |

Apply with `#[update(guard = "caller_is_X")]` /
`#[query(guard = "caller_is_X")]`. New guards live in
`utils/guards.rs`.

## Endpoint shape

```rust
use ic_cdk::{query, update};
use shared::types::{
    contact::CreateContactRequest,
    result_types::CreateContactResult,
};

use crate::{contacts::service, utils::guards::caller_is_registered_user};

#[update(guard = "caller_is_registered_user")]
#[must_use]
pub fn create_contact(req: CreateContactRequest) -> CreateContactResult {
    service::create_contact(req).into()
}
```

- `#[must_use]` on functions returning a meaningful value.
- Keep handlers thin: parse + dispatch to `service::*`. Business logic
  lives in `service.rs` / `model.rs`.
- Update `backend.did` via `npm run generate` after any change to the
  set / signature of `#[update]` / `#[query]` exports.

## Threshold signatures — chain-fusion signer only

- Direct calls to `sign_with_ecdsa` / `sign_with_schnorr` are forbidden
  (clippy `disallowed-methods` in [`clippy.toml`](../../../clippy.toml)).
- All threshold-signature operations go through the **chain-fusion signer
  canister**. Wiring is in
  [`signer/service.rs`](../../../src/backend/src/signer/service.rs)
  (`allow_signing`, `get_allowed_cycles`, top-up flow, allowance maths).
- See [SIGNER_DOMAINS.md](../../../SIGNER_DOMAINS.md) for the architecture
  and per-domain considerations.

## HTTP endpoints — `/metrics`, `/status`

- The `http_request` query routes URL paths:
  - `/metrics` → `shared::metrics::get_metrics()`.
  - `/status` → `status::handle()` (defined in
    [`status.rs`](../../../src/backend/src/status.rs)).
  - Anything else → 404.
- New paths are added in `api/admin.rs::http_request`. Each new endpoint
  should have its own module so logic doesn't pile up in `admin.rs`.

## Timers, housekeeping, exchange rates

- Periodic work is scheduled in `init` / `post_upgrade` via:
  - `utils::housekeeping::start_periodic_housekeeping_timers()`.
  - `exchange::start_exchange_rate_timer()`.
  - `bitcoin::api::init_fee_percentiles_cache()`.
- Don't add a new ad-hoc timer at module load time. Wire it through one
  of the existing entry points and ensure both `init` and `post_upgrade`
  trigger it.
- **Exchange rates:** Controllers store API keys via `set_api_keys`. Periodic
  refreshes run when `coingecko_api_key` is set and `exchange_rate_enabled` is not
  `opt false`. See
  [`shared::types::api_keys::ApiKeys`](../../../src/shared/src/types/api_keys.rs).
  - `get_exchange_rates` is the per-caller fetch endpoint: it returns the
    USD price for each of the caller's priceable tokens (native + custom,
    minus testnets / NFTs / ERC-4626), re-marks them as active so the timer
    keeps them warm, and awaits a one-shot refresh for any token whose
    cache is older than `PRICE_STALENESS_THRESHOLD_SEC` (2 min) or missing.
    It's an `update` (mutates `token_activity`, may issue HTTP outcalls).
  - `get_exchange_rate(TokenId)` is a legacy cache-only query for callers
    that already know the token ID and do not need activation or freshness.

## Workspace dependencies — root or nothing

- Every dependency must be declared at
  [root `Cargo.toml`](../../../Cargo.toml) under `[workspace.dependencies]`.
- Crate-level `Cargo.toml` files reference them as `pkg = { workspace = true }`
  (or `pkg = { workspace = true, optional = true }` for features).
- [`scripts/lint.cargo-workspace-dependencies.sh`](../../../scripts/lint.cargo-workspace-dependencies.sh)
  enforces this in CI (`backend-checks / workspace-dependencies`).
- **Adding a new dependency requires explicit user approval.** Pin a
  version in the workspace; don't take the latest blindly.

## Workspace lints

The root `Cargo.toml` enables strict lints (`pedantic`, `warnings = "deny"`,
`allow_attributes = "warn"`, …). Don't try to disable them locally:

- `#[allow(...)]` on individual items is a code smell; clippy warns. If
  you really need it, justify in the PR description.
- New code must compile clean against `cargo clippy --target wasm32-unknown-unknown
--all-features` and against the native target with tests + benches
  (this is what `./scripts/lint.rust.sh` runs).

## Disallowed macros / methods (from [`clippy.toml`](../../../clippy.toml))

- **Macros:** `std::print`, `std::println`, `std::eprint`, `std::eprintln`
  → use `ic_cdk::print` / `ic_cdk::println`. `std::assert_eq` in tests →
  `pretty_assertions::assert_eq`.
- **Methods:** `dfn_core::api::print`,
  `ic_cdk::api::management_canister::ecdsa::sign_with_ecdsa`,
  `…::schnorr::sign_with_schnorr`.

## Anti-patterns (reject these)

- `unwrap()` / `expect()` / `panic!()` in non-test code.
- Holding a state borrow across `.await`.
- Logging via `std::println!` / `std::eprintln!`.
- Adding a dependency only inside a single crate's `Cargo.toml` without
  routing it through the workspace.
- Editing `src/declarations/**` by hand.
- Editing the public Candid interface without bumping the PR title /
  body to mark it breaking (when applicable). See
  [`workflows/breaking-interface.md`](./workflows/breaking-interface.md).
- Calling threshold-signature management endpoints directly.
- Sprawling `lib.rs` — keep it the wire-up file. Domain logic goes in
  modules.
