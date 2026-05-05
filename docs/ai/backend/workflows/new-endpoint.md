# Workflow: Add a new backend endpoint

Use when you need to expose a new `update` or `query` from the canister.

## Decide the shape

| You need…                              | Endpoint kind                              |
| -------------------------------------- | ------------------------------------------ |
| Read-only, fast                        | `#[query]`                                 |
| Mutates state or makes inter-canister calls | `#[update]`                           |
| Read-only but reads cross-subnet certified state | `#[query]` with caveats           |
| HTTP path under `/metrics`, `/status`, … | extend `api/admin.rs::http_request`      |

Pick the right guard from [patterns.md](../patterns.md#guards-on-endpoints).
The default for user-facing endpoints is `caller_is_registered_user`.

## Steps

1. **Find or add the request / response / result types** in
   [`src/shared/src/types/`](../../../../src/shared/src/types/):
   - Request → `<Method>Request` struct in the matching domain module.
   - Result enum returned to the caller →
     `shared::types::result_types::<Method>Result` (e.g.
     `CreateContactResult`, `GetUserProfileResult`).
   - Inner error type → an enum next to the request.
   - Don't put canister-internal helper types here — those live in
     `src/backend/src/types/`.
2. **Add the domain logic.**
   - Pure logic → `src/backend/src/<domain>/model.rs`.
   - State / IC calls → `src/backend/src/<domain>/service.rs`.
   - If the domain folder doesn't exist, see
     [`structure.md`](../structure.md#where-to-put-new-code-decision-tree).
3. **Add the API handler** under
   `src/backend/src/api/<area>.rs`:

   ```rust
   use ic_cdk::{query, update};
   use shared::types::{
       <area>::<Method>Request,
       result_types::<Method>Result,
   };

   use crate::{<domain>::service, utils::guards::caller_is_registered_user};

   #[update(guard = "caller_is_registered_user")]
   #[must_use]
   pub fn <method>(req: <Method>Request) -> <Method>Result {
       service::<method>(req).into()
   }
   ```

   - Keep the handler thin: parse + dispatch.
   - Pick the right `#[query]` / `#[update]` and the right guard.
   - Return a `*Result` Candid enum, mapping from the inner
     `Result<T, E>` via a `From` impl in `shared::types::impls` or a
     local `into()`.
   - Re-export from `api/mod.rs` if you added a new file.
4. **Regenerate the Candid interface and FE bindings.**

   ```bash
   npm run generate
   ```

   This updates `src/backend/backend.did` (via
   [`scripts/did.sh`](../../../../scripts/did.sh) and `export_candid!()`)
   and the TS bindings under `src/declarations/backend/`. Commit both.

5. **Will this break the API?** If the new endpoint adds a method or a
   non-breaking variant, no. If it changes existing types or removes /
   renames a method, **yes** — follow
   [`breaking-interface.md`](./breaking-interface.md). The
   `backend-tests / breaking-interface` job will reject the PR otherwise.

6. **Add tests.**
   - **Unit:** every branch of `service::<method>` (happy path + each
     error). Inline in the module with `#[cfg(test)] mod tests { … }`.
     Use `pretty_assertions::assert_eq` (clippy enforces).
   - **Integration:** at least one `pocket-ic` test under
     `src/backend/tests/it/<area>.rs` exercising the public endpoint.
     Use the helpers in `tests/it/utils/`.
   - See [testing.md](../testing.md).

7. **Run the gates.**

   ```bash
   ./scripts/format.sh
   ./scripts/lint.rust.sh
   ./scripts/lint.did.sh
   ./scripts/lint.cargo-workspace-dependencies.sh
   ./scripts/test.backend.sh
   ```

   And on the FE side, if you also wrote a wrapper:

   ```bash
   npm run check && npm run test
   ```

8. **Update docs.**
   - If the endpoint introduces a new pattern (a new guard, a new
     domain module, a new HTTP route, …), add a row / section to
     [patterns.md](../patterns.md) per the
     [meta-update rule](../../governance.md#meta-update-rule).
   - If the endpoint is user-visible, mention it in the PR body's
     `# Motivation` section.

9. **PR title.**
   - Pure additive endpoint, no Candid break →
     `feat(backend): add <method> endpoint`.
   - Bug fix → `fix(backend): …`.
   - API break → `feat(backend)!: …` with a `BREAKING CHANGE:` line in
     the body.

## Skeleton — request type

```rust
// src/shared/src/types/<area>.rs
use candid::{CandidType, Deserialize};

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct <Method>Request {
    pub field_a: String,
    pub field_b: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum <Method>Error {
    NotAuthorized,
    InvalidInput(String),
}
```

```rust
// src/shared/src/types/result_types.rs
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum <Method>Result {
    Ok(<ReturnType>),
    Err(<Method>Error),
}
```

## Skeleton — service

```rust
// src/backend/src/<domain>/service.rs
use shared::types::<area>::{<Method>Error, <Method>Request};

use crate::state::{mutate_state, read_state};

pub fn <method>(req: <Method>Request) -> Result<<ReturnType>, <Method>Error> {
    // 1. validate `req` (consider validators in `shared::validate`)
    // 2. read or mutate state in a single closure
    // 3. return Ok(...) / Err(<Method>Error::...)
}
```

## Don'ts

- Don't put endpoint logic directly in `lib.rs` or in `api/<area>.rs`
  beyond a thin dispatch.
- Don't `unwrap()` / `expect()` outside tests.
- Don't hand-edit `backend.did` or `src/declarations/**`.
- Don't reuse a request struct across endpoints with different fields —
  introduce a new struct.
- Don't introduce a new `*Result` enum if an existing one fits exactly
  — reuse first.
- Don't forget the integration test. Reviewers do.
