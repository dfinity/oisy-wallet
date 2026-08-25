# Build plan — tips via link or QR code

Working state for [`2026-08-05-feat-tips-via-link.md`](../2026-08-05-feat-tips-via-link.md),
built as a local stack per [`stacked-builds.md`](../../stacked-builds.md).

Disposable by design: this file leaves with the rest of the folder at
[Step 7 — Post-merge cleanup](../../workflow.md#step-7--post-merge-cleanup-claude-code).
The spec stays the source of truth for **what** to build; this only records
**where** each piece lives.

## The stack

| #   | Branch                         | Spec PR | Head        | Contains                                                                                                                                                                      | Status |
| --- | ------------------------------ | ------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | `feat/tips-1-backend`          | PR-1    | `34b6e076d` | tip store, `create_tip` / `get_tip` / `get_tip_details` / `claim_tip` / `cancel_tip` / `get_my_tips`, claim-code hashing, atomic claim, expiry, rate limiters, pruning, candid | built  |
| 2   | `feat/tips-2-service`          | PR-2    | `0c6f8f2e1` | `base64url.utils`, `tip.crypto`, `tip.services`, api + canister layer, pinned cross-language hash vectors                                                                      | built  |
| 3   | `feat/tips-3-sender-ui`        | PR-3    | `c311f6c4c` | `Issue Tip` menu entry, intro, token picker + empty state, create step, expiry, share screen with QR, `tip.*` i18n, flag off                                                   | built  |
| 4   | `feat/tips-4-recipient-ui`     | PR-4    | `bc3997164` | `/tip/<id>` **standalone landing page**, claim review, success, **unavailable**, **uncovered**                                                                                 | built  |
| 5   | `feat/tips-5-history`          | PR-5    | `16e88309a` | History with four stored statuses, claimer principal on claimed rows, cancel action                                                                                            | built  |
| 6   | `feat/tips-6-reserved-balance` | PR-2b   | `d712296f6` | subtract reserved amounts once, in the derived store the token list, send, swap and both MAX controls read                                                                     | built  |
| 7   | `feat/tips-7-enable`           | PR-6    | `2654f16aa` | flip `TIPS_ENABLED` to `true` — the release, on its own, after everything above lands                                                                                          | built  |

24 commits over `main`, none pushed. `main` here is the merged spec
([#13768](https://github.com/dfinity/oisy-wallet/pull/13768)).

**Why the claim page is a standalone route.** It started under `(app)`, which
looked right — the claim needs an authenticated agent. But `AuthGuard` swaps the
whole route out for the marketing landing page whenever there is no identity,
which is exactly the visitor a tip link arrives at, so the claim view never
rendered for them at all. It is now a `+page@` that resets the layout hierarchy,
the same shape as the shared-note recipient page. Component tests could not have
caught this: they render the component directly, above the layout that was
discarding it.

**Why reserved-balance sits at the top, not at position 3 as the spec lists it.**
It touches the most load-bearing derived state in the app, so it is the slowest
branch to review — and nothing else in the stack depends on it. At the top it
blocks nothing; at position 3 it would hold up four UI PRs behind its review.

Land bottom-up. Each branch is cut from its parent, and a fix goes to the branch
that owns the code, then cascades down.

## PR-0 — the spike (complete)

Throwaway, no branch, no PR. Everything above waited on it; nothing does now. It runs entirely
against a local replica: the local ck-ledgers are the real
`ic-icrc1-ledger.wasm` from `dfinity/ic` at the commit pinned in
[`scripts/download.ckbtc.sh`](../../../../../scripts/download.ckbtc.sh), so the
ICRC-2 mechanics proved locally are the mainnet ones.

**Settled at the interface level** by reading the ledger candid that the local
replica actually installs (`target/ic/*.did`, downloaded from the pinned IC
commit — the same wasm the mainnet ck-ledgers run):

- [x] **Open question 1, candid half.** `TransferFromArgs.spender_subaccount : opt Subaccount`
      is declared, and `icrc2_approve` / `icrc2_allowance` / `icrc2_transfer_from`
      are all in the service — in **both** ledger implementations that matter:
      `ckbtc_ledger.did` (the ICRC-1 ledger, shared by ckBTC, ckETH and ckUSDC)
      and `icp_ledger.did`.
- [x] **Open question 2, interface half.** All four v1 candidates — ICP, ckBTC,
      ckETH, ckUSDC — expose ICRC-2. So the third
      [pending decision](../2026-08-05-feat-tips-via-link.md#pending-decisions-facts-clear--owner-must-decide)
      resolves: **ckETH can join v1.**
- [x] `ApproveArgs` carries both `expected_allowance : opt nat` and
      `expires_at : opt Timestamp`, which is what lets the allowance carry the
      tip's own deadline instead of relying on the backend record alone.
- [x] Confirmed against the **installed** wasm, not only the candid:
      `dfx canister call icp_ledger icrc1_supported_standards '()'` on the local
      replica returns ICRC-1, **ICRC-2** and ICRC-21.

Also already established from the repo, so nobody re-derives it:

- `spender_subaccount` on `TransferFromArgs` in
  [`src/cycles_ledger/types/src/lib.rs`](../../../../../src/cycles_ledger/types/src/lib.rs)
  — the Rust shape the backend needs, in a canister this backend already calls
  ICRC-2 against.
- `TransferFromParams.spender_subaccount` in `@icp-sdk/canisters/ledger/icrc`,
  the package [`icrc-ledger.api.ts`](../../../../../src/frontend/src/icp/api/icrc-ledger.api.ts)
  already wraps.

So the spec's premise for open question 1 — that the field is absent from every
vendored candid in this repo — was wrong twice over. What is left is behaviour,
not interface.

**Proven against the local ckBTC ledger** (`icrc2_approve` / `icrc2_transfer_from`
driven by two dfx identities, sender and spender, with a 32-byte subaccount
standing in for `H(tip_id)`):

- [x] **Open question 1, behavioural half.** `approve` to
      `{owner: spender, subaccount: SUB_A}` then `icrc2_transfer_from` with the
      matching `spender_subaccount` pays out: the claimer's balance went from 0 to
      exactly the transferred amount.
- [x] **The subaccount genuinely scopes the allowance** — this is the property the
      whole no-custody model rests on, and it holds three ways:
      `icrc2_allowance` for `{spender, no subaccount}` reads **0** while
      `{spender, SUB_A}` reads the full amount; `transfer_from` **without** a
      `spender_subaccount` fails `InsufficientAllowance { allowance = 0 }`; and
      `transfer_from` with a **different** subaccount (`SUB_B`) fails the same way.
      So one tip cannot draw on another tip's allowance, even with the same sender
      and the same spender canister.
- [x] **The payout fee comes out of the allowance, not on top of it.** After
      transferring 100_000 with a ledger fee of 11_500, the remaining allowance
      fell by 111_500. This is what the spec's "allowance covers the amount plus
      the payout fee" requires, now measured rather than assumed.
- [x] **Open question 3.** `approve` with a stale `expected_allowance` fails
      `AllowanceChanged { current_allowance }` — and the error carries the current
      value, so a retry can reconcile instead of guessing. With the correct
      `expected_allowance` it succeeds, and it **replaces** rather than adds: the
      allowance became exactly the new amount.
- [x] **`expires_at` is enforced by the ledger.** A future deadline round-trips —
      `icrc2_allowance` returns it alongside the amount — and an `approve` with a
      past deadline is rejected outright with `Expired { ledger_time }`. So the
      reservation carries the tip's own deadline; the backend record is the second
      line of defence, not the only one.

**Closed against mainnet** (read-only `icrc1_supported_standards` /
`icrc1_symbol` queries, `--network ic`):

- [x] **Open question 2, deployment half.** Every v1 candidate reports ICRC-2 in
      production. So the **v1 token list is all five the spec named**:

| Token  | Mainnet ledger                | Standards                          |
| ------ | ----------------------------- | ---------------------------------- |
| ICP    | `ryjl3-tyaaa-aaaaa-aaaba-cai` | ICRC-1, **2**, 21                  |
| ckBTC  | `mxzaz-hqaaa-aaaar-qaada-cai` | ICRC-1, **2**, 3, 10, 21, 103, 106 |
| ckETH  | `ss2fx-dyaaa-aaaar-qacoq-cai` | ICRC-1, **2**, 3, 10, 21, 103, 106 |
| ckUSDC | `xevnm-gaaaa-aaaar-qafnq-cai` | ICRC-1, **2**, 3, 10, 21, 103, 106 |
| ckUSDT | `cngnf-vqaaa-aaaar-qag4q-cai` | ICRC-1, **2**, 3, 10, 21, 103, 106 |

**Do not take ck-ERC20 ledger ids from `dfx.json`.** Its `remote.id.ic` entry for
`ckusdc_ledger` is `yfumr-cyaaa-aaaar-qaela-cai`, which answers `icrc1_symbol`
with **`ckSepoliaUSDC`** — the testnet ledger, on mainnet. Production ck-ERC20
ids live in
[`tokens.ckerc20.json`](../../../../../src/frontend/src/env/tokens/tokens.ckerc20.json),
which is what the frontend actually reads. ICP, ckBTC and ckETH are the ledgers
their `dfx.json` `ic` entries claim; the ck-ERC20 ones are not.

**PR-0 is complete.** Nothing in the stack is blocked on the mechanism any more.

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

## Still to build

Code, not sign-off. Neither blocks the stack from landing; both are worth their
own branch on top.

| What                                                                                                                                                                                              | Where it goes         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **Analytics.** Nothing is instrumented. The spec's [Analytics section](../2026-08-05-feat-tips-via-link.md#analytics-plausible) names the funnel — open → token → created, and landing → sign-in → claimed. That second funnel is the number the feature exists to produce: cold-start conversion of a non-crypto recipient. Follow `personal-notes-analytics.services.ts`. | a branch of its own   |
| **`Uncovered` in History.** Criterion 15 lists it as a sender-visible status; `tip-status.utils.ts` deliberately cannot show it, because it is the outcome of a claim attempt rather than a stored state, and History would have to query every tip's allowance on every read. Either accept the deviation and amend the spec, or pay for the query. | decision, then either |

## Not yet verified

Facts the stack asserts but nothing has measured. Each is a real risk, not a
formality.

| What                                                                                                                                                                       | How to close it                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **The fragment surviving Internet Identity on mobile Safari and in in-app webviews** (open question 8, second half). The entire link model rests on it. Desktop is fine — II opens in a popup, so the page never unmounts — but an in-app webview may not keep it. | a real phone, and a link opened from a DM      |
| **A fresh identity seeing the received token without manual setup** (open question 6). The backend half is covered by `a_tip_pays_a_brand_new_principal_…`; the wallet-UI half is not. | claim on a never-before-used anchor, then look |
| **Claim atomicity across a canister upgrade mid-flight** (open question 4). The design answers it — `Claiming` plus a five-minute in-flight timeout — but no test upgrades the canister while a claim is in the air. | a pocket-ic test that upgrades mid-claim       |
