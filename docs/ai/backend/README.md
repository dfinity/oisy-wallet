# Backend AI Guide

If you are about to touch anything under `src/backend/`, `src/shared/`, or
`src/backend/backend.did`, this is your starting point. Read it once per
session.

> Higher up the chain: [`AGENTS.md`](../../../AGENTS.md) → [`docs/ai/`](../README.md).

## Pre-flight checklist (every change)

- [ ] I read [`AGENTS.md`](../../../AGENTS.md) and the
      [10 commandments](../../../AGENTS.md#2-the-10-commandments-read-before-every-change).
- [ ] I know which crate / module my code belongs in — see
      [`structure.md`](./structure.md).
- [ ] I followed the idioms in [`patterns.md`](./patterns.md) (no
      `unwrap()` / `expect()` outside tests, no panics outside `init` /
      `post_upgrade` traps, single state borrow, workspace deps,
      `ic_cdk::print*` not `std::print*`, no raw threshold-signature
      calls).
- [ ] If my change affects `backend.did`, I followed
      [`workflows/breaking-interface.md`](./workflows/breaking-interface.md)
      and ran `npm run generate`.
- [ ] If my change touches stable state, I followed
      [`workflows/state-and-migrations.md`](./workflows/state-and-migrations.md).
- [ ] I have or extended tests where [`testing.md`](./testing.md) requires.
- [ ] Local quality gates pass —
      [`../pr-and-ci.md`](../pr-and-ci.md#4-local-quality-gates).
- [ ] PR title + body match conventions — [`../pr-and-ci.md`](../pr-and-ci.md).
- [ ] If I introduced a new pattern / shared type, I updated
      `docs/ai/**` in the same PR
      ([meta-update rule](../governance.md#meta-update-rule)).

## Stack at a glance

- **Rust 2021** edition. Toolchain pinned in
  [`rust-toolchain.toml`](../../../rust-toolchain.toml).
- **Workspace** — root [`Cargo.toml`](../../../Cargo.toml) declares
  `members = ["src/backend", "src/cycles_ledger/{client,pic,types}", "src/shared"]`
  and centralises every dependency. Crate `Cargo.toml` files reference
  workspace deps via `pkg = { workspace = true }`.
  [`scripts/lint.cargo-workspace-dependencies.sh`](../../../scripts/lint.cargo-workspace-dependencies.sh)
  enforces this.
- **Workspace lints** — `pedantic` + `allow_attributes = "warn"` + many
  `deny`s. See `[workspace.lints.{rust,clippy}]` in the root `Cargo.toml`
  and the local [`clippy.toml`](../../../clippy.toml).
- **Canister target:** `wasm32-unknown-unknown` for `cargo clippy` /
  builds; tests run on the host with a downloaded `pocket-ic` server.
- **Stable state** via `ic-stable-structures`. All persisted state lives
  inside a single `thread_local!` `STATE` cell (see
  [`src/backend/src/state/mod.rs`](../../../src/backend/src/state/mod.rs)).
- **Threshold signatures** are routed through the **chain-fusion signer
  canister** — clippy disallows calling `sign_with_ecdsa` /
  `sign_with_schnorr` directly.
- **Candid** — public interface in
  [`src/backend/backend.did`](../../../src/backend/backend.did),
  regenerated via `npm run generate`.
- **Testing** — unit tests inline (`#[cfg(test)] mod tests { … }`),
  integration tests under
  [`src/backend/tests/it/`](../../../src/backend/tests/it/) using
  `pocket-ic`. Driver: [`scripts/test.backend.sh`](../../../scripts/test.backend.sh).

## What "good" looks like in this repo

Recent merged backend PRs (use as templates):

- `feat(backend): Add /status endpoint for signup-rate monitoring` (#12641)
  — single endpoint added in the right module, a few new shared types,
  integration test, no API break.
- `feat(backend)!: Add rate limiter to cycle-sensitive methods` (#11821)
  — breaking-interface PR with `!` in title, `BREAKING CHANGE:` in body,
  shared type added once, used in multiple endpoints.

If your PR doesn't look like one of those (single concern, single scope,
focused diff, dedicated test), reconsider scope before continuing.

## Where to look

| You're about to…                                | Read first                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| Add or move a Rust file                         | [`structure.md`](./structure.md)                                           |
| Pick the right idiom (errors, state, guards, …) | [`patterns.md`](./patterns.md)                                             |
| Add a new endpoint                              | [`workflows/new-endpoint.md`](./workflows/new-endpoint.md)                 |
| Change `backend.did` / break the API            | [`workflows/breaking-interface.md`](./workflows/breaking-interface.md)     |
| Touch persisted state / stable structures       | [`workflows/state-and-migrations.md`](./workflows/state-and-migrations.md) |
| Write or run integration tests                  | [`testing.md`](./testing.md)                                               |
| Benchmark a hot path (`canbench`)               | [`testing.md#benchmarks--canbench`](./testing.md#benchmarks--canbench)     |
