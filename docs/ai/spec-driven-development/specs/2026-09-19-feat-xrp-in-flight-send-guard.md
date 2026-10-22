# Spec: Refuse a second XRP send while the first is unresolved

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Hold one invariant for XRP: **at most one unresolved transaction per XRP address at a time**,
and hold it across a page reload and across two OISY sessions for the same principal.

Today nothing enforces it. `sendXrp` reads the account sequence, signs it and submits, and the
next send repeats that from scratch. If the first send has not reached a terminal state, the
second one is unsafe whichever sequence it picks — and the failure is not a rejected send but a
payment the user is told did not happen.

## Background

### The sequence is a nonce, and it cannot be guessed while a send is open

`Sequence` on an XRPL AccountRoot behaves like an EVM nonce: per-account, strictly increasing,
consumed by inclusion, and it orders execution. A second send while a first is open has exactly
two options and both are wrong:

| Choice    | Outcome                                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Reuse `N` | `tefPAST_SEQ` if the first landed; a queue replacement needing ~1.25× the queued fee otherwise                                               |
| Use `N+1` | Gapped if the first never lands → `terPRE_SEQ` → queues → expires → **the user is told a resend is safe while the original can still apply** |

There is no third choice. No amount of better sequence derivation fixes this — including reading
rippled's transaction queue via `account_info` with `queue: true`, which only sees one node's
queue and cannot prove the absence of anything. The only correct action is to **not start the
second send**.

### Which sequence comes next depends on how the first ended

XRPL has three terminal states, and they do not agree about the sequence:

| Terminal state     | How it is established                                                                      | Sequence `N`                                |
| ------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Applied, succeeded | `tx` returns `validated: true` + `meta.TransactionResult = tesSUCCESS`                     | consumed → next send uses `N+1`             |
| Applied, failed    | `tx` returns `validated: true` + a `tec*` result                                           | consumed → next send uses `N+1`             |
| Expired            | validated ledger index > `LastLedgerSequence` **and** `tx` confirms `searched_all` absence | **not consumed** → next send uses `N` again |

So the resolver must never compute the next sequence itself. Once the open transaction is
terminal it re-reads the node, which is correct for all three outcomes without branching on them.

This is also why the wait is bounded: `LastLedgerSequence` is what makes "not consumed" knowable
in finite time — roughly 21 ledgers, some 60–90 seconds. Without it an unresolved transaction
would block the account indefinitely.

### The node cannot tell us whether something is in flight

An unvalidated transaction is not agreed network state, so there is no single truth to ask for.
Every available signal is positive-only — it can confirm that something is in flight, never that
nothing is:

| Signal                                                      | Confirms                                 | Absence proves |
| ----------------------------------------------------------- | ---------------------------------------- | -------------- |
| `account_info` + `queue: true` → `queue_data.txn_count > 0` | something queued **on that node**        | nothing        |
| open-ledger `Sequence` > validated `Sequence`               | something in **that node's** open ledger | nothing        |
| `account_tx`                                                | validated history only                   | nothing        |

Verified against the configured Clio endpoint: `queue: true` is forwarded to rippled and returns
`queue_data`, but only on the open ledger — pairing it with `ledger_index: 'validated'` answers
`invalidParams`, and `queue_data` is absent entirely whenever the request is not forwarded.

The conclusion is that the client has to keep the record itself.

### Frontend state is not enough, and the backend already has the right home

A store in the frontend dies with the tab, which is exactly when a user retries. It is also
invisible to a second OISY session on the same principal. The record has to be per-user and
server-side.

`ActiveUserTransaction` (AUT) is already that. It gives us, unchanged:

- a per-user backend store with a `Pending → Executing → Succeeded | Failed` status machine whose
  terminal states are immutable (`src/backend/src/active_user_transactions/`)
- `external_refs`, designed for exactly this — learned-mid-flow `{ key, value }` pairs such as a
  transaction hash
- `create` / `update` / `delete` / `get` endpoints, and frontend services over them
  (`src/frontend/src/lib/services/active-user-transactions.services.ts`)
- a resume-on-load poller host (`src/frontend/src/lib/components/loaders/LoaderActiveUserTransactions.svelte`)
  that already drives six flows
- terminal-status helpers (`src/frontend/src/lib/utils/active-user-transactions.utils.ts`)

Six flows use it today: OneSec (both directions), OisyTrade, NEAR Intents, Chain Fusion, Velora,
Liquidium. XRP becomes the seventh. Nothing new is built; a variant is added.

### What PR #13592 already provides

The send pipeline this guards is `sendXrp` (`src/frontend/src/xrp/services/xrp-send.services.ts`),
and it already produces every value the record needs:

- `deriveXrpTransactionHash` computes the transaction id **locally** from the signed blob, before
  submitting, so a lost submit response still leaves something to poll.
- `deriveXrpLedgerWindow` recovers `firstLedgerSequence` / `lastLedgerSequence` from the blob
  alone, so the polling range never disagrees with what was signed.
- `loadXrpTransactionOutcome` returns `validated` / `pending` / `absent`, which is exactly the
  resolver's input.
- `XrpSendIndeterminateError` already carries the signed blob (`XrpPendingTransaction`) for a
  retry, and `retryXrpSend` resubmits it unchanged.

That last one was listed as an open caveat on PR #13592: the blob is handed back and **nothing
consumes it**. #13592 has since merged, so it is now a live gap on `main` rather than a pending
one. This spec is what consumes it.

## Behaviour

### Opening a send

Before `sendXrp` reads the account sequence:

1. Load the caller's active transactions.
2. If any non-terminal XRP record exists **for the same XRP address**, refuse the send with a
   message naming the open transaction, and offer nothing else — no override, no "send anyway".
3. Otherwise proceed.

The gate is per **address**, not per user: a record for a different address says nothing about
this one's sequence.

### Recording a send

A record is created **after the transaction is signed and before it is submitted**, with:

- `status: Pending`
- `data: Xrp { … }` carrying the values fixed at creation (source address, destination,
  destination tag, amount, fee, and the token — which fixes the network)
- `external_refs` carrying `tx_hash` (the locally derived id) and `last_ledger_sequence`, plus the
  amount, symbol and network name the row renders with in a later session
- ~~the signed blob, so a later session can resubmit it~~ **Not stored** — it does not fit an
  `external_refs` value and buys no safety the record does not already provide. See the retry
  decision under **Pending decisions**.

Created before submit, because a submit whose response is lost is precisely the case this record
exists for. Created after signing, because the hash and the ledger window are both derived from
the signed bytes and a record written earlier would be a claim about a transaction that does not
exist yet.

### Resolving a record

A resolver polls `tx` for the recorded hash over the recorded ledger range, and maps the three
terminal states:

| `loadXrpTransactionOutcome` | Ledger position                          | AUT status                        |
| --------------------------- | ---------------------------------------- | --------------------------------- |
| `validated` + `tesSUCCESS`  | —                                        | `Succeeded`                       |
| `validated` + `tec*`        | —                                        | `Failed`, error = the result code |
| `absent`                    | validated index > `last_ledger_sequence` | `Failed`, error = expired         |
| `absent`                    | validated index ≤ `last_ledger_sequence` | stays `Pending`                   |
| `pending`                   | —                                        | stays `Pending`                   |
| lookup unanswerable         | —                                        | stays `Pending`                   |

**Nothing but these transitions may close a record.** An unanswered lookup, a malformed response
or a mismatched hash leaves it `Pending`, because the cost of wrongly closing a record is the
cost this whole spec exists to avoid.

**Expiry additionally requires a recheck**, which the table above does not show. The `tx` lookup
and the validated-index read are two separate calls and can reach different members of a
load-balanced endpoint, so the lookup may have missed a payment that validated in between. Only an
absence that survives a fresh lookup past `last_ledger_sequence` writes `Failed`; a recheck that
comes back `validated` resolves accordingly, and one that comes back `pending` or unanswered leaves
the record open. `confirmXrpTransaction` already makes exactly this recheck for exactly this
reason, and it matters at least as much here — an AUT terminal status is immutable on the backend,
so the write cannot be walked back.

### Self-clearing

A record cannot get stuck. Past its `last_ledger_sequence` the transaction is provably included
or provably dead, and one fresh `tx` lookup settles which. A record whose creating session died
mid-poll is resolved by the next session that loads, with no manual cleanup and no expiry sweep
in the backend.

### Choosing the next sequence

After a record reaches a terminal state, the next send re-reads the account sequence from the
node. It must **not** derive it from the previous record, because expiry leaves the sequence
unconsumed while success and `tec` consume it.

### Negative guarantees (what it does _not_ do)

- It does **not** read rippled's transaction queue. `queue: true` is not used; it is node-local
  and positive-only, and the record supersedes it.
- It does **not** cache or derive sequences client-side. The node remains the only source of a
  sequence, always.
- It does **not** automatically resubmit. A resolved-as-expired record may offer the user a
  retry; nothing resends without an explicit action.
- It does **not** queue the second send. The second send is refused, not deferred. Deferring is a
  reasonable later upgrade and does not change the invariant.
- It does **not** block sends on other chains, or XRP sends from a different address.
- It does **not** claim to cover a transaction signed outside OISY. Nothing client-side can.

## Implementation

### 1. Backend — `src/backend/src/active_user_transactions/`

Add an `Xrp` variant to `ActiveUserTransactionData` in `src/backend/backend.did` and its Rust
model. Variants are append-only in declaration order, but a variant returned by
`get_active_user_transactions` is still a **breaking interface change** under Candid subtyping — an
old client cannot decode a tag it does not know. All three precedents shipped it that way, so this
lands as its own `feat(backend)!:` PR with a `BREAKING CHANGE:` note.

Fields fixed at creation: `source_address`, `destination_address`, `destination_tag : opt nat32`,
~~`amount_drops`, `fee_drops`, `network`~~ `amount`, `fee` and `token : TokenId`. Renamed to match
the repo: every existing variant spells its amount `amount` with a doc comment for the unit, and
all six express their chain through `TokenId`, which already carries `XrpNativeMainnet`. An XRPL
testnet therefore becomes a new `TokenId` variant rather than a second network field.

Everything learned later — `tx_hash` and `last_ledger_sequence` — rides in `external_refs`, per the
documented reason the field exists. The signed blob does not; see **Pending decisions**.

The variant also validates what cannot be satisfied, on the same reasoning as the existing
chain-fusion and oisy-trade pair checks: `data` is immutable after creation, so a row describing a
payment that could never exist would never resolve and would hold one of the user's 100 slots
forever. A token from another chain, a zero amount or fee, an address no base58 encoder could have
produced, and a destination equal to the source are all rejected at `create`.

No new endpoints, no new store, no status-machine change.

Note: the backend wasm cannot be linked in this environment — `secp256k1-sys`'s C objects have no
wasm target under Apple clang — so `candid-extractor` cannot run and `npm run generate` cannot
complete. The `.did` addition is written by computing the candid field-id hash order directly, and
the declarations are generated from it with `icp-bindgen`, which needs no wasm. CI's
`binding-checks` job runs `npm run generate` and commits or diffs the result, so it confirms or
corrects the hand-written `.did`; the pocket-ic integration test also runs on CI only.

### 2. Frontend — record creation in `src/frontend/src/xrp/services/xrp-send.services.ts`

Between `signXrpTransaction` and `submitXrpTransaction`, create the AUT record via
`createActiveUserTransaction`. On the submit path, advance `progress_step` to match
`ProgressStepsSendXrp`, as the other flows do.

~~`sendXrp` currently takes no identity for the backend.~~ It already takes one — see
**Pending decisions**.

`sendXrp` owns the record's whole lifecycle: it creates it, and on a definitive outcome it writes
the terminal status. Success, a validated `tec*` and expiry all close it; an indeterminate
confirmation deliberately does not, which is the case the record exists for. The terminal write is
best-effort, because by then the payment has already happened and a failed write must not turn a
settled send into an error — the poller resolves the record from the ledger instead, on the same
path a session that died mid-send takes.

`submitAndConfirmXrpTransaction` stays record-free, so `retryXrpSend` is unchanged: a retry
resubmits the same bytes against the record that is already open.

### 3. Frontend — resolver `src/frontend/src/xrp/services/xrp-active-tx.services.ts`

New file, modelled on `src/frontend/src/lib/services/near-intents-active-tx.services.ts`:
`pollXrpActiveUserTransactions({ identity, transactions })`, plus a per-record
`pollXrpActiveUserTransaction` applying the mapping table above through
`applyActiveUserTransactionPollUpdate`.

Register it in `src/frontend/src/lib/components/loaders/LoaderActiveUserTransactions.svelte`
alongside the six existing pollers.

### 4. Frontend — the gate

A helper giving the open XRP record for a given address, and a check in the send flow that refuses
before any node read. Reuse `isTerminalActiveUserTransaction` rather than re-deriving terminality.

~~A derived over `activeUserTransactionsStore`~~ — the gate reads the backend **directly**, via
`getActiveUserTransactions`, not the store. The store is per tab, so a record opened by another
session for the same principal is exactly the one a stale snapshot would miss, and cross-session is
the case this guard exists for. `loadActiveUserTransactions` is also wrong for it specifically: it
swallows backend errors by design, so a failed load leaves the store as it was, which would read as
"no open record". A plain `openXrpActiveUserTransaction({ transactions, source })` over the list the
gate just fetched covers both.

The gate sits after the guards that need nothing but the arguments — self-payment, non-positive
amount or fee, an out-of-range destination tag — and before the first node read. The spec asks for
"before any node read"; placing it after the argument checks also keeps a self-payment from costing
a backend round-trip to be told what the arguments already say.

Known hazard from the ICPSwap AUT migration: the AUT poller can race a send modal that is still
open, resolving and closing a record the modal is also driving. The gate and the in-modal flow
must read the same record and agree about who owns the transition.

**How that is handled:** a module-level set of record ids claimed by a live `sendXrp` in this tab,
which the poller skips. It is claimed before the record is created, so a tick landing between the
create and the submit cannot resolve a record the send is about to drive, and released in a
`finally`. Correctness does not rest on the set — both paths establish expiry the same strict way,
including the recheck, so either one's conclusion is sound alone. What it buys is that the record's
transitions are written by the code that owns the send while it still owns it, rather than by two
writers racing for an immutable terminal status. A record belonging to a dead session or another
tab is not in the set, which is exactly why the poller still resolves it.

### 5. i18n

~~One new key~~ **Three**, under `send.error`: the refusal telling the user to wait for the earlier
payment to settle, the distinct refusal for "the wallet could not check", and the `tec*` result the
resolver writes into a failed record. Translate only the locales in the `Languages` enum — 13
besides English; `ar.json` is not in it and stays empty.

### 6. Tests

- Backend: the new variant round-trips — through candid, through `create`, and end to end through
  pocket-ic — and existing records are unaffected. Each validation refusal has its own test, and
  `destination_tag` is exercised as `None`, `Some(0)` and `Some(u32::MAX)`, because `0` is a real
  tag and `None` is its absence.
- `xrp-active-tx.services.spec.ts`: each row of the mapping table, including that an unanswerable
  lookup, a malformed response and a mismatched hash all leave the record `Pending`. Plus the
  recheck in all three directions, a row with no usable poll keys or a non-XRP token never reaching
  the node, and the ownership set both skipping and releasing a record.
- `xrp-send.services.spec.ts`: the record is created after signing and before submit; a send is
  refused while a non-terminal record exists for the same address; a record for a **different**
  address does not refuse; a terminal record does not refuse; a record from another flow does not
  refuse; the refusal happens before any node read or signature; an unreadable record list and a
  failed create both refuse without submitting; each definitive outcome closes the record and an
  indeterminate one leaves it open.
- `xrp-active-tx.utils.spec.ts`: the per-address lookup, and every way
  `last_ledger_sequence` can fail to be a usable number — including the ones `Number()` would
  happily coerce.
- `ActiveUserTransactionItem.spec.ts`: an XRP row renders its amount, symbol and network with no
  arrow and no provider, and offers dismiss only once resolved.
- `XrpSendTokenWizard.spec.ts`: each refusal shows its own message and steps back.
- `LoaderActiveUserTransactions.spec.ts`: XRP rows route to the XRP poller and nothing else.
- A regression test that the next send after an expired record uses the sequence the node
  reports, not `previous + 1`.

### 7. `PRODUCT.md`

Describe the invariant and the refusal in the same PR as the behaviour change, including the
negative guarantees above.

## Acceptance criteria

1. With a non-terminal XRP record for address A, a new send from A is refused before any node
   call, with a message naming the open transaction.
2. A non-terminal record for address A does not refuse a send from address B, or on another chain.
3. A record is created after signing and before submit, carrying the locally derived hash and the
   signed `LastLedgerSequence`. ~~and the signed blob~~ — the blob is not stored; see
   **Pending decisions**. The lower bound of the ledger window is not stored either: it is a pure
   function of `LastLedgerSequence`, so the resolver reconstructs it through the same
   `xrpLedgerSearchWindow` the blob path uses, rather than keeping a second copy that could
   disagree.
4. Reloading mid-send leaves the record open; the next session's poller resolves it without user
   action.
5. A validated `tesSUCCESS` resolves to `Succeeded`; a validated `tec*` to `Failed` with the
   result code; absence past `last_ledger_sequence` to `Failed` as expired.
6. An unanswerable lookup, a malformed response, or a response for a different hash leaves the
   record `Pending`.
7. After an expired record, the next send uses the sequence the node reports — which is the same
   sequence the expired transaction used.
8. No code path reads `queue_data`, and no code path derives a sequence client-side.

## Open questions (facts to confirm)

All three are answered. Each is kept with its answer rather than deleted, because two of them
changed the design.

- ~~**Does the AUT store have a per-user record cap that a stuck XRP record could exhaust?**~~
  **Answered:** `MAX_ACTIVE_USER_TRANSACTIONS_PER_USER` is 100, and it counts **every** stored row
  regardless of status — the field's own doc says "the FE must delete acknowledged rows to free
  room for new ones". At the cap `create` returns `TooManyActiveTransactions`. XRP records
  self-clear within ~90 seconds so the steady state is at most one per address, but they
  accumulate as terminal rows until the user dismisses them, exactly like the other six flows.
  This is what makes the "create failed" case a decision rather than an edge — see
  **Pending decisions**.
- ~~**Does `LoaderActiveUserTransactions` poll often enough for a ~60–90 second window?**~~
  **Answered:** yes, with room to spare. `ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS` is 5
  seconds, against a window of `XRP_LAST_LEDGER_SEQUENCE_OFFSET` = 20 ledgers ≈ 60–80 seconds. The
  poller is also gated on `document.hidden` and stops when nothing is pending, so a hidden tab
  resolves on return rather than on the tick — which costs nothing here, because the record only
  has to be resolved before the _next_ send.
- ~~**Is the signed blob acceptable to store in `external_refs`?**~~ **Answered: no, it does not
  fit.** `MAX_ACTIVE_USER_TRANSACTION_EXTERNAL_REF_VALUE_LEN` is 256 characters; a real signed
  Payment measures **378** hex characters, or 388 with a destination tag (measured with the repo's
  own `ripple-binary-codec`). See the decision below for what was done about it.

## Pending decisions

- ~~**How `sendXrp` gets an identity.**~~ **Resolved by fact: it already takes one.** On `main`
  `sendXrp` takes `identity: NullishIdentity`, because `getXrpSigningPublicKey` and
  `signXrpTransaction` both need it. The spec was written against an earlier revision. Only the
  narrowing remained: the gate refuses without an identity and returns it non-nullish, so the
  record calls below it get an `Identity` without a second check.
- **Refuse vs. queue.** **Decided: refuse**, as this spec describes. Deferring the second send
  until the first resolves holds the same invariant with better manners and remains a possible
  follow-up.
- ~~**Whether an expired record offers a one-click retry** using the stored blob, or only
  reports.~~ **Decided: reports only, cross-session, and the blob is not stored.** It does not fit
  `external_refs` (above), and widening a bound shared by all seven flows was not worth what the
  blob buys. It buys nothing for safety — the record is what refuses the second send — and it helps
  in exactly one of the four states a fresh session can find a `Pending` record in: the
  lost-broadcast case, where re-broadcasting inside the remaining window could still land the
  payment. That window is ~60–80 seconds measured from before the submit, and a reload spends part
  of it on app boot, auth and the first poll. OISY's other in-flight send guard,
  `PendingTransaction { txid, utxos }`, stores pointers rather than signed bytes for the same job.
  An **in-session** retry is unaffected: `XrpSendIndeterminateError` still carries the blob in
  memory, so `retryXrpSend` can resubmit those exact bytes on their already-consumed sequence.
  Acceptance criterion 3 is amended accordingly.
- **What happens when the record cannot be created** — at the per-user cap, or with the backend
  unreachable. **Decided: refuse the send.** No record means the invariant cannot be held, and the
  cost of proceeding is a duplicate payment at exactly the moment a user is most likely to retry.
  It gets its own message, distinct from the "an earlier payment is still settling" one, because
  the correction is different: try again rather than wait.
- **Whether XRP records appear in the notification list.** **Decided: yes, rendered properly.**
  `ActiveUserTransactionItem` had no XRP branch, so an XRP row would have rendered as a bare `→`
  with an empty network line — an XRP record sets none of the swap display refs. It now has one:
  "Send 25 XRP" with the network beneath, a send icon rather than the convert icon, and no provider
  name, since a wallet send has no provider. Dismiss is offered only once the row has resolved,
  because deleting an open row would release the guard.
- ~~**Ordering against PR #13592.** `sendXrp` is not merged; this spec depends on it. Land after,
  or fold the gate into the send-modal PR that follows it.~~ **Resolved:** #13592 merged, and so
  did the rest of the XRP stack up to #13597. `sendXrp`, `retryXrpSend`, `deriveXrpLedgerWindow`
  and `XrpSendIndeterminateError` are all on `main`, and XRP is enabled there, so the
  implementation is based on `main` with no ordering constraint left.
- **How it ships.** **Decided: two stacked PRs.** The candid variant lands on its own as
  `feat(backend)!:` (#14109), and the frontend guard stacks on it. All three precedents did the
  same — #13092 (Liquidium), #13710 (ChainFusion), #13796 (OisyTrade) — because appending a variant
  to a type returned by `get_active_user_transactions` is a breaking interface change and the
  marker belongs on the PR that makes it.
