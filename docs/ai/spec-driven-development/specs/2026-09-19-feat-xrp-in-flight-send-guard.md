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

That last one is listed as an open caveat on PR #13592: the blob is handed back and **nothing
consumes it**. This spec is what consumes it.

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
  destination tag, amount, fee, network)
- `external_refs` carrying `tx_hash` (the locally derived id) and `last_ledger_sequence`
- the signed blob, so a later session can resubmit it

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
model. Variants are append-only under the Candid evolution rule, so this is additive.

Fields fixed at creation: `source_address`, `destination_address`, `destination_tag : opt nat32`,
`amount_drops`, `fee_drops`, `network`. Everything learned later — `tx_hash`,
`last_ledger_sequence`, and the signed blob — rides in `external_refs`, per the documented reason
the field exists.

No new endpoints, no new store, no status-machine change.

Note: the backend wasm cannot be built locally in this environment (`clang` has no wasm target),
so the candid and wasm gates run on CI.

### 2. Frontend — record creation in `src/frontend/src/xrp/services/xrp-send.services.ts`

Between `signXrpTransaction` and `submitXrpTransaction`, create the AUT record via
`createActiveUserTransaction`. On the submit path, advance `progress_step` to match
`ProgressStepsSendXrp`, as the other flows do.

`sendXrp` currently takes no identity for the backend. Creating a record requires one — see
**Pending decisions**.

### 3. Frontend — resolver `src/frontend/src/xrp/services/xrp-active-tx.services.ts`

New file, modelled on `src/frontend/src/lib/services/near-intents-active-tx.services.ts`:
`pollXrpActiveUserTransactions({ identity, transactions })`, plus a per-record
`pollXrpActiveUserTransaction` applying the mapping table above through
`applyActiveUserTransactionPollUpdate`.

Register it in `src/frontend/src/lib/components/loaders/LoaderActiveUserTransactions.svelte`
alongside the six existing pollers.

### 4. Frontend — the gate

A derived over `activeUserTransactionsStore` giving the open XRP record for a given address, and
a check in the send flow that refuses before any node read. Reuse
`isTerminalActiveUserTransaction` rather than re-deriving terminality.

Known hazard from the ICPSwap AUT migration: the AUT poller can race a send modal that is still
open, resolving and closing a record the modal is also driving. The gate and the in-modal flow
must read the same record and agree about who owns the transition.

### 5. i18n

One new key for the refusal, under the XRP send namespace, naming the open transaction and
telling the user to wait for it to settle. Translate only the locales in the `Languages` enum.

### 6. Tests

- Backend: the new variant round-trips; existing records are unaffected.
- `xrp-active-tx.services.spec.ts`: each row of the mapping table, including that an unanswerable
  lookup, a malformed response and a mismatched hash all leave the record `Pending`.
- `xrp-send.services.spec.ts`: the record is created after signing and before submit; a send is
  refused while a non-terminal record exists for the same address; a record for a **different**
  address does not refuse; a terminal record does not refuse.
- A regression test that the next send after an expired record uses the sequence the node
  reports, not `previous + 1`.

### 7. `PRODUCT.md`

Describe the invariant and the refusal in the same PR as the behaviour change, including the
negative guarantees above.

## Acceptance criteria

1. With a non-terminal XRP record for address A, a new send from A is refused before any node
   call, with a message naming the open transaction.
2. A non-terminal record for address A does not refuse a send from address B, or on another chain.
3. A record is created after signing and before submit, carrying the locally derived hash, the
   ledger window and the signed blob.
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

- **Does the AUT store have a per-user record cap that a stuck XRP record could exhaust?** Records
  self-clear within ~90 seconds, so the steady state is at most one per address — but confirm the
  cap and what happens at it.
- **Does `LoaderActiveUserTransactions` poll often enough for a ~60–90 second window?** The other
  six flows resolve over minutes to hours. If its interval is coarser than the XRP validity
  window, the guard still holds but the user waits longer than necessary to be unblocked.
- **Is the signed blob acceptable to store in `external_refs`?** It is a signed XRPL transaction,
  public once submitted, but it is larger than the `{ key, value }` pairs the field carries today
  — confirm the size limit.

## Pending decisions

- **How `sendXrp` gets an identity.** It currently takes none. Either thread one through, or move
  record creation to the caller and keep `sendXrp` backend-free. The second keeps `sendXrp`
  testable as it is now but splits the create/submit ordering across two files, which is the
  ordering this spec depends on.
- **Refuse vs. queue.** This spec refuses. Deferring the second send until the first resolves is
  strictly better UX and holds the same invariant; it is a follow-up, not a v1.
- **Whether an expired record offers a one-click retry** using the stored blob, or only reports.
  The retry primitive (`retryXrpSend`) already exists and resubmits the blob unchanged.
- **Ordering against PR #13592.** `sendXrp` is not merged; this spec depends on it. Land after,
  or fold the gate into the send-modal PR that follows it.
