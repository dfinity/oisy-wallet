# Backend Testing

Two layers, both required:

- **Unit tests** inline in the same file via `#[cfg(test)] mod tests { … }`.
  Cheap, fast, run on the host.
- **Integration tests** under
  [`src/backend/tests/it/`](../../../src/backend/tests/it/) using
  `pocket-ic`. Slow — they download `pocket-ic`, the BTC canister,
  Internet Identity, and the cycles ledger; build the canister WASM; and
  run real canister calls.

## What to test

| Add tests for                                                                | Don't bother                            |
| ---------------------------------------------------------------------------- | --------------------------------------- |
| Pure functions on `model.rs`                                                 | Generated bindings under `$declarations` |
| Validation / parsing helpers in `shared::validate`                           | Re-exports                              |
| Each branch of every public endpoint (happy path + each error)               | Trivial getter wrappers                 |
| State migrations (before/after structures)                                   | —                                       |
| Bug fixes (write the regression test that fails on `main`)                   | —                                       |
| Guard logic (`utils/guards.rs`)                                              | —                                       |

## Unit tests

```rust
#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;
    use super::*;

    #[test]
    fn rejects_anonymous_caller() {
        let err = my_pure_fn(input).unwrap_err();
        assert_eq!(err, MyError::Anonymous);
    }
}
```

Notes:

- Use `pretty_assertions::assert_eq` (clippy `disallowed-macros`
  rejects `std::assert_eq`).
- `unwrap()` / `expect()` are fine **only inside `#[cfg(test)]` /
  `dev-dependencies` code** — the lint script allows it on tests.
- Reach for fixtures from `shared::types::tests` /
  `shared::validate::tests` before building your own.

## Integration tests (`pocket-ic`)

Live under
[`src/backend/tests/it/`](../../../src/backend/tests/it/), one file per
area:

```
src/backend/tests/it/
├── main.rs              mod declarations only
├── agreements.rs
├── bitcoin.rs
├── config.rs
├── contacts.rs
├── custom_token.rs
├── settings/
├── signer.rs
├── stats.rs
├── status.rs
├── transactions.rs
├── user_profile.rs
└── utils/               Test helpers (canister loader, identities, …)
```

When adding a new endpoint, add (or extend) an `*.rs` file matching the
domain and exercise the endpoint via `pocket-ic` calls. Mirror the shape
of an existing test in the same file — tooling, fixture loading, and
canister setup are conventional and centralised in `tests/it/utils/`.

### Running

```bash
./scripts/test.backend.sh                    # full suite
./scripts/test.backend.sh -- contacts        # subset (cargo test -p backend filter)
./scripts/test.backend.sh -- --ignored candid  # candid compatibility check
```

The script:

1. Reads the `pocket-ic` server version from `Cargo.lock`.
2. Downloads `pocket-ic`, the Bitcoin canister, the cycles ledger, and
   the Internet Identity wasm.
3. Builds the backend WASM (or uses `./backend.wasm.gz` if present).
4. Sets the env vars the tests expect (`POCKET_IC_BIN`,
   `BITCOIN_CANISTER_WASM_FILE`, `CYCLES_LEDGER_CANISTER_WASM_FILE`,
   `II_CANISTER_WASM_FILE`, `BACKEND_WASM_PATH`).
5. Runs `cargo test -p backend`.

CI runs the same script under `backend-tests / tests`. Don't introduce a
test that depends on the host system other than via the env vars the
script sets.

### Candid compatibility check

[`lib.rs`](../../../src/backend/src/lib.rs) ends with a
`#[test] #[ignore = "Not run unless requested explicitly"]
fn check_candid_interface_compatibility()`. The
`backend-tests / breaking-interface` job runs it with `--ignored candid`
**when**:

- `src/backend/backend.did` changed in the PR, **and**
- the PR title is **not** marked breaking (`!:` and `BREAKING CHANGE:`
  in the body).

If you intentionally change the public interface, mark the PR breaking
(see [`workflows/breaking-interface.md`](./workflows/breaking-interface.md)).
If you accidentally changed the interface, fix the code or the
declaration.

## Forbidden in tests

- `it.skip` / `#[ignore]` left on `main` (other than the candid
  compatibility test, which is by design).
- Real network calls. Use `pocket-ic` mocks / canisters set up by
  `utils/`.
- `std::assert_eq` (clippy enforces `pretty_assertions::assert_eq`).
- Console-noise via `ic_cdk::println!` chained into the test logs unless
  the test specifically asserts on it.

## Coverage

There is no coverage gate on the backend yet. The expectation is **every
endpoint has at least one happy-path integration test, and every error
branch has at least a unit test**.

## Benchmarks — `canbench`

The repo carries a `canbench-rs` benchmark suite that measures
`instructions`, `heap_increase`, and `stable_memory_increase` for
representative endpoint flows. It is **active but lightly maintained** —
not gated by CI yet, but results are tracked in version control.

- **Configuration:**
  [`canbench.yml`](../../../canbench.yml) (build cmd, wasm path, init args).
- **Source:**
  [`src/backend/src/benchmark.rs`](../../../src/backend/src/benchmark.rs)
  — feature-gated behind `canbench-rs` (declared in `src/backend/Cargo.toml`).
  Wired in [`lib.rs`](../../../src/backend/src/lib.rs) under
  `#[cfg(feature = "canbench-rs")] mod benchmark;`.
- **Saved results:**
  [`canbench_results.yml`](../../../canbench_results.yml) — committed
  ground truth. `npm run benchmark` (= `canbench --persist --show-summary`)
  diffs the current run against this file and rewrites it on `--persist`.
- **Coverage today:** roughly 30 benches across `user_profile`, `contacts`,
  `custom_tokens`, `bitcoin` pending transactions, `agreements`, settings,
  `http_request`, and `stats`.

### Running

```bash
npm run benchmark        # canbench --persist --show-summary  (rewrites canbench_results.yml)
canbench                 # diff vs canbench_results.yml without persisting
```

The first run downloads `canbench` and builds the canister WASM with
`--features canbench-rs`. Subsequent runs are fast.

### When to add or update a benchmark

- **You added an endpoint that touches a `StableBTreeMap` collection
  whose size scales with users** (e.g. `user_profile`, `contacts`,
  `custom_tokens`, `user_transactions`, `token_activity`). Add a
  `bench_<method>` (and ideally a `_<N>`-suffixed variant for the
  scaling case) following the existing patterns in
  [`benchmark.rs`](../../../src/backend/src/benchmark.rs).
- **You changed a hot path** measured by an existing bench. Re-run
  `npm run benchmark` and commit the regenerated
  `canbench_results.yml`. If `instructions` regress meaningfully, surface
  the delta in the PR body — don't silently bake in a regression.
- **Pure additive changes that don't touch persisted state** rarely
  need a benchmark.

### When NOT to add a benchmark

- Read-only `#[query]` over an O(1) cell (`config`, `stats`).
- One-off admin endpoints that controllers call manually.
- Changes that cannot regress instructions / heap (e.g. pure
  documentation or test-only edits).

### PR conventions

- Benchmark-only changes: `chore(backend): bench <method>` or
  `test(backend): add bench_<method>`.
- `canbench_results.yml` updates that come from a feature PR ride along
  in the same commit; mention the deltas in `# Tests`.
- If the benchmark suite was bypassed (canbench tooling / build
  failure), say so explicitly — don't silently skip it.

### Don'ts

- Don't hand-edit `canbench_results.yml` to "fix" a regression. Re-run
  `npm run benchmark` after a real change.
- Don't add a `bench_*` function that depends on the host clock or
  randomness — `canbench` re-runs them deterministically.
- Don't disable the `canbench-rs` feature flag globally; it must remain
  opt-in (production wasm doesn't ship benchmarks).
