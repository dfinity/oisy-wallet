# Build plan — tips via link or QR code

Working state for [`2026-08-05-feat-tips-via-link.md`](../2026-08-05-feat-tips-via-link.md),
built as a local stack per [`stacked-builds.md`](../../stacked-builds.md).

Disposable by design: this file leaves with the rest of the folder at
[Step 7 — Post-merge cleanup](../../workflow.md#step-7--post-merge-cleanup-claude-code).
The spec stays the source of truth for **what** to build; this only records
**where** each piece lives.

## The stack

| #   | Branch                         | Spec PR | Contains                                                                                                                                                                       | Status      |
| --- | ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 1   | `feat/tips-1-backend`          | PR-1    | tip store, `create_tip` / `get_tip` / `claim_tip` / `cancel_tip` / `get_my_tips`, claim-code hashing, atomic claim, expiry, rate limiter, pruning, candid + `npm run generate` | not started |
| 2   | `feat/tips-2-service`          | PR-2    | `tip.api.ts` + `tip.services.ts`: approve → record with idempotent retry, link + QR construction, claim, cancel                                                                | not started |
| 3   | `feat/tips-3-sender-ui`        | PR-3    | `Issue Tip` menu entry, intro modal, token picker + empty state, Issue Tip step, share screen, `tip.*` i18n                                                                    | not started |
| 4   | `feat/tips-4-recipient-ui`     | PR-4    | `/tip/<id>` landing, Tip Status modal, II hand-off across the fragment, claim review, success, **unavailable**                                                                 | not started |
| 5   | `feat/tips-5-history`          | PR-5    | History with all five statuses, claimer principal on claimed rows, cancel action                                                                                               | not started |
| 6   | `feat/tips-6-reserved-balance` | PR-2b   | subtract reserved amounts once, in the derived store the token list, send, swap and both MAX controls read                                                                     | not started |

**Why reserved-balance sits at the top, not at position 3 as the spec lists it.**
It touches the most load-bearing derived state in the app, so it is the slowest
branch to review — and nothing else in the stack depends on it. At the top it
blocks nothing; at position 3 it would hold up four UI PRs behind its review.

Land bottom-up. Each branch is cut from its parent, and a fix goes to the branch
that owns the code, then cascades down.

## PR-0 — the spike

Throwaway, no branch, no PR. Everything above waits on it. It runs entirely
against a local replica: the local ck-ledgers are the real
`ic-icrc1-ledger.wasm` from `dfinity/ic` at the commit pinned in
[`scripts/download.ckbtc.sh`](../../../../../scripts/download.ckbtc.sh), so the
ICRC-2 mechanics proved locally are the mainnet ones.

What it must answer:

- [ ] **Open question 1** — `approve` to `{owner: backend, subaccount: H(tip_id)}`
      followed by `icrc2_transfer_from` with the matching `spender_subaccount`,
      against a live ledger.
- [ ] **Open question 3** — `expected_allowance` on replace, so a retried
      creation cannot destroy a live reservation.
- [ ] **Open question 2** — which ledgers advertise ICRC-2 via
      `icrc1_supported_standards`. The answer **is** the v1 token list, and it
      settles the ckETH pending decision. This is the one part the local rig
      cannot answer: local proves the wasm supports it, not what mainnet has
      deployed. Query the mainnet ledgers read-only.

Already established from the repo, so nobody re-derives it:

- `spender_subaccount` exists on `TransferFromArgs` in
  [`src/cycles_ledger/types/src/lib.rs`](../../../../../src/cycles_ledger/types/src/lib.rs)
  (`Option<serde_bytes::ByteBuf>`) — generated from a ledger candid, in a
  canister this backend already calls ICRC-2 against.
- The frontend SDK exposes it too: `TransferFromParams.spender_subaccount` in
  `@icp-sdk/canisters/ledger/icrc`, the package
  [`icrc-ledger.api.ts`](../../../../../src/frontend/src/icp/api/icrc-ledger.api.ts)
  already wraps.

So the spec's premise for open question 1 — that the field is absent from every
vendored candid in this repo — is wrong. What remains is behavioural: does a
real ledger honour it.

## The local rig

Everything needed is already in the repo. `npm run deploy` brings up the backend,
a local `internet_identity`, and the real `icp_ledger`, `ckbtc_ledger`,
`cketh_ledger` and `ckusdc_ledger` — which is the entire v1 token set.

| Step                                                        | Command                                     |
| ----------------------------------------------------------- | ------------------------------------------- |
| Toolchain (pinned in [`dfx.json`](../../../../../dfx.json)) | `dfxvm install 0.26.1`                      |
| Replica                                                     | `dfx start --clean --background`            |
| Canisters                                                   | `npm run deploy`                            |
| Fund the sender                                             | `scripts/send.tokens.sh <sender-principal>` |
| App                                                         | `npm run dev`                               |

Use **two local Internet Identity anchors in two browser profiles**: one sender,
one recipient that has never existed before. That is not a convenience — it is
the only way to test
[open questions 5 and 6](../2026-08-05-feat-tips-via-link.md#open-questions-facts-to-confirm)
(a brand-new principal claiming, and a fresh identity seeing the received token
without manual setup) for real. No unit test can fake a principal with no
profile.

## Blocked on people, not on code

These do not block building, but they block landing. Longest lead time first.

| What                                                                                                                       | Gates            | Owner                            |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------- |
| Compliance sign-off on OISY holding a bounded, revocable authorisation over user funds for up to a week (open question 11) | branch 1         | —                                |
| The `Uncovered` wording — it is information about the sender                                                               | branch 4         | whoever owns the privacy promise |
| The five undrawn states, plus a light theme for every screen (the Figma page is dark-only)                                 | branches 3, 4, 5 | design                           |
