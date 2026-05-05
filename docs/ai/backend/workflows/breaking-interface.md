# Workflow: Breaking-interface change

A change is **breaking** when it modifies the public Candid interface in
a way that is **not** backwards-compatible with the production canister.
Examples:

- Removing or renaming a method.
- Removing or renaming a field on an existing record.
- Reordering / renaming variants on an existing enum.
- Changing the type of an existing field.
- Tightening a guard / making a previously-permissive endpoint reject
  callers it used to accept (this is behavioural-breaking, but you should
  still flag it in the PR body).

Adding a new method, adding an optional field at the **end** of a record,
adding a new variant at the **end** of an enum, are typically
non-breaking — but the candid compatibility check is the source of truth.

## How CI enforces it

The job `backend-tests / breaking-interface`
([`backend-tests.yml`](../../../../.github/workflows/backend-tests.yml)):

1. Detects whether `src/backend/backend.did` changed in this PR.
2. Detects whether the PR is **already** marked breaking. Both must be
   true:
   - **Title** matches `^([a-z]+)(\([-a-zA-Z0-9,]+\))!\:` — i.e. has the
     `!` before the `:`.
   - **Body** contains a line starting with `BREAKING CHANGE: `.
3. If `.did` changed and the PR is **not** marked breaking, the job runs
   the candid compatibility test (the `#[ignore = "Not run unless requested explicitly"]`
   test in [`lib.rs`](../../../../src/backend/src/lib.rs)) against the
   production interface (`target/ic/candid/backend.ic.did`). If that
   test fails, the PR is rejected.

So: either your change is candid-compatible, or your PR title and body
declare it breaking.

## When the change IS intentional and breaking

1. **Title.** Add `!` before the colon:

   ```
   feat(backend)!: add rate limiter to cycle-sensitive methods
   ```

2. **Body.** Add a line starting with `BREAKING CHANGE:`:

   ```markdown
   # Motivation
   …

   # Changes
   - …

   # Tests
   - …

   BREAKING CHANGE: `allow_signing` now returns a typed
   `AllowSigningError` instead of `()` on rejection. Callers must update.
   ```

3. **Impact note.** In `# Changes`, list **what callers must do** to
   migrate. Frontend / external consumers will read this.

4. **Frontend update.** Run `npm run generate` so the FE bindings under
   `src/declarations/backend/` reflect the new shape, and update FE
   call-sites if needed. Often this lives in a follow-up FE PR — link it
   from the body.

5. **Coordinate the deploy.** Breaking-interface changes need careful
   sequencing between the backend canister upgrade and the FE asset
   deploy. Tag `@dfinity/oisy` in the PR description if you're not sure.

## When the change is unintentional

If the `breaking-interface` job complains and you didn't mean to break the
API:

- Inspect the diff against `target/ic/candid/backend.ic.did` (the
  production-deployed interface).
- Common culprits:
  - Renaming a struct field (Candid records are name-keyed).
  - Reordering enum variants (Candid variants are tag-ordered).
  - Changing a `Result<T, E>` to a custom enum (or vice versa).
  - Tightening an optional → required.
- Restore compatibility (often by keeping the old shape as an alias /
  variant) and rerun `npm run generate`.

## After it merges

- The merge group + `release-please` pipeline tag the next release.
- Don't bump versions or edit `signer-versions.json` manually.
- The breaking-interface marker is preserved in the changelog so deploy
  operators see it.

## Don'ts

- Mark a non-breaking PR as breaking just to silence the check — that
  pollutes the changelog and confuses downstream consumers.
- Hand-edit `backend.did` to "match" the production file. Always
  regenerate via `npm run generate`.
- Land a breaking interface change without an FE update plan (link or
  follow-up PR).
