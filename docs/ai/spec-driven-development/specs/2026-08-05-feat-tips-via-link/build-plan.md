# Build plan — tips via link or QR code

Working state for [`2026-08-05-feat-tips-via-link.md`](../2026-08-05-feat-tips-via-link.md),
built as a local stack per [`stacked-builds.md`](../../stacked-builds.md).

Disposable by design: this file leaves with the rest of the folder at
[Step 7 — Post-merge cleanup](../../workflow.md#step-7--post-merge-cleanup-claude-code).
The spec stays the source of truth for **what** to build; this only records
**where** each piece lives.

## The stack

| #   | Branch                         | Spec PR | Head        | Contains                                                                                                                                                                       | Status |
| --- | ------------------------------ | ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | `feat/tips-1-backend`          | PR-1    | `ee4dcab82` | tip store, `create_tip` / `get_tip` / `get_tip_details` / `claim_tip` / `cancel_tip` / `get_my_tips`, claim-code hashing, atomic claim, expiry, rate limiters, pruning, candid | built  |
| 2   | `feat/tips-2-service`          | PR-2    | `7f34c4674` | `base64url.utils`, `tip.crypto`, `tip.services`, api + canister layer, pinned cross-language hash vectors                                                                      | built  |
| 3   | `feat/tips-3-sender-ui`        | PR-3    | `3848ef5e1` | `Issue Tip` menu entry, intro, token picker + empty state, create step, expiry, share screen with QR, `tip.*` i18n, flag off                                                   | built  |
| 4   | `feat/tips-4-recipient-ui`     | PR-4    | `2eb4e9dbd` | `/tip/<id>` **standalone landing page**, claim review, success, **unavailable**, **uncovered**                                                                                 | built  |
| 5   | `feat/tips-5-history`          | PR-5    | `4d607e162` | History with four stored statuses, claimer principal on claimed rows, cancel action                                                                                            | built  |
| 6   | `feat/tips-6-reserved-balance` | PR-2b   | `d3b78adb8` | subtract reserved amounts once, in the derived store the token list, send, swap and both MAX controls read                                                                     | built  |
| 7   | `feat/tips-7-enable`           | PR-6    | `10666311b` | flip `TIPS_ENABLED` to `true` — the release, on its own, after everything above lands                                                                                          | built  |

241 commits over `main`, none pushed. `main` here is the merged spec
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

| What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Where it goes         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| ~~**Analytics.**~~ **Done.** One `tip` event with the step in `event_modifier` and the side in `source_location`, per `trackPersonalNoteShare`. Sender steps on branch 3, claimer steps on branch 4. No amounts, ever — the symbol answers "which assets get tipped" without making the stream a spending log. Original note: The spec's [Analytics section](../2026-08-05-feat-tips-via-link.md#analytics-plausible) names the funnel — open → token → created, and landing → sign-in → claimed. That second funnel is the number the feature exists to produce: cold-start conversion of a non-crypto recipient. Follow `personal-notes-analytics.services.ts`. | a branch of its own   |
| ~~**`Uncovered` in History.**~~ **Superseded.** The canister now records a failed claim on the tip (`last_claim_failure`) and reports `TipStatus::Failed`, so History shows it without querying any allowance. Original note: `tip-status.utils.ts` deliberately cannot show it, because it is the outcome of a claim attempt rather than a stored state, and History would have to query every tip's allowance on every read. Either accept the deviation and amend the spec, or pay for the query.                                                                                                                                                              | decision, then either |

## Not yet verified

Facts the stack asserts but nothing has measured. Each is a real risk, not a
formality.

| What                                                                                                                                                                                                                                                                                     | How to close it                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **The fragment surviving Internet Identity on mobile Safari and in in-app webviews** (open question 8, second half). The entire link model rests on it. Desktop is fine — II opens in a popup, so the page never unmounts — but an in-app webview may not keep it.                       | a real phone, and a link opened from a DM      |
| **A fresh identity seeing the received token without manual setup** (open question 6). The wallet-UI half is now built — `TipClaimModal` calls `autoLoadSingleToken` on the way out, so a claimed ck-asset is enabled — but nobody has claimed on a never-before-used anchor and looked. | claim on a never-before-used anchor, then look |
| **Claim atomicity across a canister upgrade mid-flight** (open question 4). The design answers it — `Claiming` plus a five-minute in-flight timeout — but no test upgrades the canister while a claim is in the air.                                                                     | a pocket-ic test that upgrades mid-claim       |

## Deploying to be1 / fe1

The stack is exercised on the shared test environment from `test/tips-be1`, which
is branch 7 plus three commits that must **never** reach a feature PR:

- `dfx.json` and `canister_ids.json`, pointing `test_fe_1`'s backend at be1
  (`jloto-byaaa-aaaap-anryq-cai`). Without this fe1 talks to **staging**, which
  has no tips endpoints at all.
- `scripts/build.backend.args.sh`, giving `test_be_*` / `test_fe_*` a real vetKD
  key name. This one belongs in main as its own reviewed change — it is a shared
  script other teams build from.

`git diff feat/tips-7-enable test/tips-be1 --stat` must show only those three
files. Anything else means work landed on the deploy branch by mistake.

```bash
gh workflow run deploy-to-environment.yml --ref test/tips-be1 -f network=test_fe_1 -f canister=frontend
gh workflow run deploy-to-environment.yml --ref test/tips-be1 -f network=test_be_1 -f canister=backend -f force-backend=true
```

**Frontend first.** Adding a case to a variant the canister _returns_ is a
breaking candid change: a client that does not know the case cannot decode it, and
dfx says so out loud. `TipStatus::Failed`, `TipError::InsufficientFunds` and
`TipClaimFailureReason::InsufficientFunds` are all in return position. Adding an
`opt` record field is safe in either direction. An earlier deploy went
backend-first and only got away with it because the new variants require a failed
claim to appear.

**Verify from the artefacts, not the green checks.** Grepping the bundle proves
nothing — `app.constants.ts` embeds the staging fallback alongside the selected
id, so both appear. Load `https://fe1.oisy.com/tip/probe/#c=probe` and read which
canister the page actually calls. Expect transient 503 `no_healthy_nodes` right
after an asset deploy; it clears on reload.

## Mechanics that cost real time

Each of these produced a wrong diagnosis first.

**The vetKD key name is frozen at first init.** `KeyManager` keeps its key id in a
`StableCell`, and `Cell::init` _loads_ the stored value whenever the region is
non-empty — it writes the value passed in only when the memory is fresh. So a
store uses whichever key name was configured the first time it was ever touched,
permanently, and correcting the deployment argument does nothing. The fix is to
move the store to a fresh memory region: tip secrets went 22-25 → **26-29**, and
22-25 must never be reused.

**`ECDSA_KEY_NAME` is also the vetKD key name.** `build.backend.args.sh` picks it
per network and the backend reuses that one field for both. `test_be_*` and
`test_fe_*` were unlisted and fell through to the local default `dfx_test_key`,
which exists only on a local replica, so every derivation on be1 trapped with
`SignCostError(InvalidKeyName)`. It reached the sender as "the link for this tip
is not recoverable" — a confident, invented explanation for a live bug. Personal
notes was unaffected only because its store had captured a valid name earlier.

**A silently swallowed failure is expensive.** The claim-code write was
best-effort with a `consoleWarn` and no retry, so one transient failure cost a tip
its recoverable link permanently with nothing on screen. It now retries once and
returns `secretStored`, and the share screen says "copy this link now" when it
could not be saved.

**Tooling quirks.** A plain `dfx deploy backend` _and_ `scripts/lint.did.sh` both
reflow the whole of `backend.did` from tabs to spaces — pre-existing formatter
drift; discard it rather than commit it. `scripts/generate.sh` needs `didc`, which
is not installed, and `dfx generate` writes a different file layout than this
repo's pipeline, so candid declarations are hand-edited and validated by having
dfx parse the interface.

## Open decisions

Answers change what gets built; none of them block the rest.

| Question                                                                                                                                                          | Default if nobody answers                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `Cancelled` is a fifth status. Fold it into the Expired group, give it its own, or hide it?                                                                       | folded into Expired, row keeps its own label    |
| Should the four History groups also appear on the wallet home screen, or only inside the tips modal?                                                              | modal only; the home screen gets just the badge |
| Apply the II delegation guard to `claim_tip` too? It would mean turning `cancel_tip(text)` into a record.                                                         | sender-side endpoints only                      |
| Raise the vetKey `caller_hour` (10) and global (100/hour) tiers? They are real cost ceilings at ~26B cycles a derivation, and personal notes shares the exposure. | left alone, needs whoever sized them            |
| Reject a self-claim (spec decision 15)? Verified end to end that a self-claim currently succeeds.                                                                 | not implemented; owner's call                   |

## Where be1 stands

Deployed from `63c2122bd`, both canisters, frontend first. Tips work; **link
recovery does not**, and the remaining blocker is not code:

```
Canister cannot grow memory by 8388608 bytes due to its reserved cycles limit.
The current limit (10_000_000_000_000) would be exceeded by 216_531_593_707.
```

be1 cannot allocate the 8 MiB the fresh memory region needs. That error is itself
proof the new wasm is live — the old one reused existing regions and needed no
growth. It also means the key-name fix is **untested**, because
`ensure_tip_secrets()` runs before the derivation, so the cost check is never
reached and `InvalidKeyName` disappearing proves nothing yet.

Needs a controller (be1 has five, none of them ours). Either raise the limit and
keep be1's data:

```bash
dfx canister update-settings --network ic jloto-byaaa-aaaap-anryq-cai \
  --reserved-cycles-limit 20000000000000
```

or reinstall the backend, which wipes be1 state but needs no limit change: a
reinstall clears stable memory, so the store re-initialises with the corrected
name in the existing region and no new allocation is required.

Meanwhile be1 is usable for everything except recovery — `create_tip` never
touches the secrets store, and the failure is now graceful rather than silent.
