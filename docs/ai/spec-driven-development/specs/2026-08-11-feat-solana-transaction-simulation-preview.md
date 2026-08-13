> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Simulate a Solana WalletConnect transaction before the review renders

- **Type:** `feat`
- **Area:** Frontend, Solana WalletConnect signing path
- **Status:** Draft for implementation in Claude Code

---

## 1. Motivation

The Solana WalletConnect review screen today is built entirely from a **static decode** of
the request. `decode` in `src/frontend/src/sol/services/wallet-connect.services.ts` parses
the base64 transaction message, walks its **top-level** instructions through
`mapSolInstruction` (`src/frontend/src/sol/utils/sol-instructions.utils.ts`), and collapses
them into one amount / source / destination summary. Two structural blind spots follow from
that:

- **Anything OISY cannot map is invisible.** An unmapped instruction sets `unreviewed`, and
  the review shows a generic warning ("This transaction contains instructions OISY can't
  decode…"). The user is told the review is incomplete, but not what the missing part does.
- **Inner instructions do not exist yet.** Cross-program invocations are produced by the
  programs at execution time. They are simply not present in an unsigned message, so no
  static decoder, however good, can ever see them. A transaction whose whole effect happens
  inside a CPI reads as an opaque program call.

A **simulation** sees both. The network runs the message against current state and reports
what the accounts would look like afterwards, CPIs included. This spec adds a preview built
from that: what this transaction would do **to the user's own accounts**, shown next to the
existing decoded summary, before the user approves.

The RPC method is already reachable from this path: `simulateTransaction` is called today in
the same file, but **after** signing, with only `{ encoding: 'base64' }`, and its result is
discarded apart from a console warning on error. It is used as a post-hoc sanity log, not as
review material. This spec moves the useful call into the decode step, where it can still
change the user's mind.

---

## 2. Scope: the user's own accounts, three kinds of delta

The preview answers one question: **what changes for me?** It reports three kinds of change,
all of them restricted to accounts the user owns.

### 2.1 Native SOL delta for the fee payer

The lamport change on the user's own address. Because the fee payer is debited when the
transaction is loaded, this figure absorbs the base fee and the prioritisation fee alongside
any SOL the message actually moves. It is the honest "this is what it costs me" number, and
it is deliberately shown next to (not instead of) the itemised base and prioritisation fees
the review already displays.

### 2.2 SPL token amount deltas

The change in `amount` across the user's token accounts, per mint. This is where simulation
earns its keep: a swap routed through several programs produces its whole token movement
inside CPIs, and a balance diff sees it without decoding a single instruction.

### 2.3 Authority and owner field changes

**This is not optional and it is the subtlest part of the feature.** A `SetAuthority`
instruction that hands an associated token account to an attacker produces **no balance
delta at all**. The account still holds exactly the same tokens; only its owner field
changed. A preview that diffs balances alone would show nothing and would therefore imply
the transaction is harmless, which is the opposite of the truth.

So the preview diffs the **control fields** of the user's accounts, not just their amounts:

| Field                          | What a change means                                                    |
| ------------------------------ | ---------------------------------------------------------------------- |
| Token account `owner`          | Someone else now controls the account and everything in it             |
| Token account `delegate`       | Someone else may now spend from the account up to the delegated amount |
| Token account `closeAuthority` | Someone else may now close the account and claim its rent lamports     |
| Account-level program `owner`  | The account was reassigned to a different program entirely             |

Any such change is surfaced as a **warning**, in its own right, regardless of whether a
single lamport moved.

### 2.4 Destination for transfers that do decode

"You lose 5,000 USDC" without "to whom" is half an answer. The review already renders the
decoded destination (`SendDataDestination` via `SendData` in
`src/frontend/src/sol/components/wallet-connect/SolWalletConnectSignReview.svelte`), and for
an approval it renders the spender instead (`SendDataSpender`). **This behaviour is confirmed
present and must be preserved**; the preview sits alongside it rather than replacing it. What
the preview does not do is invent a destination for a movement it only observed as a balance
diff, because a diff has no counterparty in it.

---

## 3. Non-goals (deliberate, do not add later without a decision)

- **Counterparty account deltas.** The preview does not enumerate what happens to the pool
  accounts, program vaults, or the other side of a swap. That is noise, it is not
  actionable, and it makes the honest signal harder to find.
- **Any claim that a simulated preview makes a transaction safe.** Simulation runs against
  current state at the current slot. A program is free to branch on the slot, on an oracle
  value, or on account state, and behave differently when the transaction actually executes.
  The copy must never say "safe", "verified", or "checked". It says what the simulation
  produced, and that the real execution can differ.
- **Relaxing any existing fail-closed rule.** The preview is purely additive. In particular
  the open work on `av/sol-wc-reject-authority-and-burn` refuses to sign decoded-but-
  unrenderable instructions (`SetAuthority`, `Burn`, and the Token-2022 equivalents), and
  this preview is **not** a reason to soften that. A rejection that never reaches the review
  and a preview that describes what the review shows are answers to different questions.
- **Blocking on the simulation.** See fail-open, below.

---

## 4. Behaviour

### 4.1 Fail open

If the simulation fails, errors, times out, is rate-limited, reports that the transaction
itself would fail, or the RPC provider does not support the options requested, **the review
renders exactly as it does today**. No preview section, no error toast, no extra warning. A
failed preview must never be able to stop a user from seeing a request or from rejecting it.

This is the opposite of the decode's posture, and deliberately so. The decode is what the
review is made of, so a failed decode leaves nothing safe to approve. The preview is extra
information on top; its absence returns the user to the status quo, which is a state OISY
already considers acceptable to sign from.

### 4.2 Never a safety guarantee

The preview always carries a plain statement that it is a simulation against current network
state and that the result at execution can differ. It is shown whenever the preview is shown,
including when the preview found no changes at all: "we saw nothing" is the single most
dangerous thing to present without that caveat.

### 4.3 Latency, and the interaction with the approve gate

The preview adds an RPC round trip **before** the review renders, because a preview that
arrives after the user has already approved is worthless. To keep that bounded:

- the pre-state read and the simulation are issued **in parallel**, so the cost is one round
  trip, not two;
- the whole preview is raced against a timeout, after which it is abandoned and the review
  renders without it.

This interacts with the separate open work on `av/sol-wc-reject-authority-and-burn`, which
gates the Approve button on the decode having completed. Once both land, Approve stays
disabled for the duration of the preview as well. That is the intended ordering (the user
cannot approve a review that is still being computed), but it does mean the timeout above is
also the ceiling on how long Approve can stay disabled.

---

## 5. Approach

### 5.1 Which accounts to look at, and why the list must be bounded

`simulateTransaction` takes an explicit list of addresses whose post-state to return.
Requesting the whole account set of a modern DeFi transaction would be a large response for
almost no signal, since the overwhelming majority of those accounts are not the user's.

Two facts bound the list cheaply and without guessing:

1. **Only writable accounts can change.** A read-only account is, by construction, identical
   before and after. `parseSolBase64TransactionMessage`
   (`src/frontend/src/sol/utils/sol-transactions.utils.ts`) already returns a decompiled
   message whose instruction account metas carry an `AccountRole`, and `@solana/kit` exports
   `isWritableRole` to test it. Crucially, that decompile is
   `decompileTransactionMessageFetchingLookupTables`, so **versioned (v0) messages have
   already had their address lookup tables resolved** by the time we see the account list.
   Nothing extra is needed for v0 support, and nothing works without it.
2. **A hard cap.** Beyond a fixed number of writable accounts the preview is abandoned
   rather than truncated. A truncated preview would report "no changes" for accounts it
   never looked at, which is exactly the failure mode this feature exists to prevent.

From the returned states, the preview keeps only the accounts that are the user's: the user's
own address, plus any token account whose owner is the user **either before or after** the
transaction (the "after" arm is what keeps a freshly created ATA in view).

### 5.2 Pre-state and post-state

An important asymmetry, verified against the pinned `@solana/kit` (6.9.x) typings rather than
assumed:

- `getTransaction` returns `preTokenBalances` / `postTokenBalances` in its meta, which is what
  `fetchSolTransactionsForSignature`
  (`src/frontend/src/sol/services/sol-transactions.services.ts`) builds transaction history
  from.
- `simulateTransaction`'s typed response **does declare** `preBalances`, `postBalances`,
  `preTokenBalances`, `postTokenBalances` and `fee` — but every one of them is nullable, and
  they are populated only by newer validator versions. They cannot be depended on across the
  RPC providers OISY talks to.

So the preview does not build on them. It takes **post-state from the simulation's `accounts`
response** and reads **pre-state separately**, via `getMultipleAccounts` for the same address
list, issued in parallel with the simulation.

Requesting `encoding: 'jsonParsed'` for both sides means the RPC applies its own SPL token
account parser and returns `mint`, `owner`, `delegate`, `closeAuthority` and
`tokenAmount { amount, decimals }` as JSON. Hand-decoding the SPL token account binary layout
is therefore **not** required, and neither is a separate lookup for a mint's decimals — the
parsed post-state carries them. This is the same encoding and the same response shape the
codebase already reads account state with in `getAccountInfo`
(`src/frontend/src/sol/api/solana.api.ts`), so the parsing helper can be shared.

Note that `getAccountInfo` in that file memoises its results per network for the lifetime of
the session. That cache is right for immutable-ish metadata and wrong for a pre-state read,
where a stale entry would silently fabricate a delta. The preview's pre-state read must
therefore be a fresh, uncached call.

### 5.3 Simulation options

- `sigVerify: false` and `replaceRecentBlockhash: true`, so an unsigned (or partially signed)
  message simulates at all. The two conflict at the RPC and in the typings; the
  replace-blockhash overload is the one that admits an unsigned message.
- `accounts: { encoding: 'jsonParsed', addresses }` for post-state, with `addresses` bounded
  as described above.
- `encoding: 'base64'` for the wire transaction. The WalletConnect `params.transaction` value
  is already a base64 wire transaction, so it is passed through unchanged.

### 5.4 Where the code goes

| Concern                                                      | Location                                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Raw RPC calls (`simulateTransaction`, `getMultipleAccounts`) | `src/frontend/src/sol/api/solana.api.ts`                                     |
| Account selection and the pre/post diff (pure, testable)     | `src/frontend/src/sol/utils/sol-simulation.utils.ts`                         |
| Orchestration, parallelism, timeout, fail-open               | `src/frontend/src/sol/services/sol-simulation.services.ts`                   |
| Preview shape                                                | `src/frontend/src/sol/types/sol-simulation.ts`                               |
| Wiring into the decode step                                  | `src/frontend/src/sol/services/wallet-connect.services.ts` (`decode`)        |
| Rendering                                                    | `src/frontend/src/sol/components/wallet-connect/` (review + a preview child) |
| Bounds and timeout                                           | `src/frontend/src/sol/constants/sol.constants.ts`                            |

`decode` already parses the message once and already performs best-effort async lookups that
swallow their own failures (the prioritisation-fee estimate, the SPL mint recovery). The
preview follows that established shape exactly: it reuses the message `decode` has already
parsed, and it returns `undefined` rather than throwing.

---

## 6. Acceptance criteria

1. A Solana WalletConnect transaction review shows, when the simulation succeeds, the user's
   own simulated SOL delta and per-mint SPL token deltas.
2. A transaction that changes the owner, delegate, close authority, or owning program of an
   account the user owns produces a **warning**, even when no balance changes at all.
3. Token deltas produced only inside a CPI are reported, because the preview diffs account
   state rather than instructions.
4. Versioned (v0) messages are previewed correctly, with lookup-table addresses resolved.
5. The address list sent to `simulateTransaction` is bounded; above the bound the preview is
   omitted entirely rather than truncated.
6. Any simulation failure, error, or timeout leaves the review rendering exactly as it does
   today, with no preview and no new error surface.
7. The preview copy never asserts safety, and always states that execution can differ.
8. The existing fail-closed rejection of ambiguous and undisplayable messages is unchanged.
9. Quality gates pass: `format`, `lint --max-warnings 0`, `check`, and the vitest suite.

---

## 7. Follow-ups (deliberately not in the first PR)

These are named here rather than silently dropped.

- **Naming the operations from inner instructions.** Requesting `innerInstructions: true` and
  splicing CPIs into the instruction list — the way
  `fetchSolTransactionsForSignature` does at
  `src/frontend/src/sol/services/sol-transactions.services.ts` around line 241, with a comment
  describing exactly this intent — would let the preview say _what happened_ ("swapped via
  program X"), not only _what changed_. It is deferred because the two instruction lists are
  not the same shape: in the history path both the top-level and the inner instructions come
  back `jsonParsed` from `getTransaction`, so they splice into one homogeneous array, whereas
  here the top-level instructions are decoded `@solana/kit` `Instruction` objects from the
  message while the simulation's inner instructions come back as RPC JSON. Reusing that splice
  requires first reconciling the two representations, which is its own change. The three
  deltas in scope do **not** need it: state diffing already sees CPI effects, because the
  post-state includes them.
- **A destination for movements seen only as a diff.** Deriving "to whom" for a token delta
  that no top-level instruction decoded depends on the item above.
- **Reporting the simulation's own failure reason.** When simulation returns an execution
  error, telling the user the transaction is expected to fail is useful in its own right, but
  it is a different message with different copy and its own false-positive risk (a
  transaction can simulate as failing and succeed at execution).
- **Reusing the preview outside WalletConnect**, e.g. in the in-wallet Solana send flow.

---

## 8. Open questions (facts to confirm)

- _Resolved:_ does `simulateTransaction` return token balance meta the way `getTransaction`
  does? **Not dependably.** The kit 6.9 typings declare `pre`/`postTokenBalances` on the
  simulate response, but nullable and only populated by newer validators. The implementation
  therefore diffs account state instead. See [5.2](#52-pre-state-and-post-state).
- _Resolved:_ must the SPL token account layout be decoded by hand? **No.**
  `encoding: 'jsonParsed'` is accepted for the simulation's `accounts` config as well as for
  `getMultipleAccounts`, and the RPC returns the parsed token account fields directly.
- _Resolved:_ do versioned messages need lookup tables resolved separately? **No** — the
  existing `parseSolBase64TransactionMessage` already decompiles with lookup-table fetching.
- _To confirm in QA against a live cluster:_ whether the fee payer's simulated lamport delta
  includes the transaction fee on every provider OISY uses. The review shows the base and
  prioritisation fees separately regardless, so the user is not left without a fee figure
  either way.

## 9. Pending decisions (facts are clear — we just need to decide)

- **How hard the authority-change warning should be.** It is a warning here. Given that the
  work on `av/sol-wc-reject-authority-and-burn` already refuses to sign a _decoded_
  `SetAuthority`, an authority change that only a simulation can see is arguably also a
  candidate for fail-closed rejection. That would be a behaviour change well beyond a
  preview, and it should be decided on its own rather than smuggled in here.
- **What to do with a simulation that reports the transaction would fail.** This spec treats
  it as no preview at all: a failed run rolls its changes back, so its post-state describes
  nothing the user would actually get, and presenting those deltas would be worse than
  presenting none. Telling the user "this is expected to fail" is a separate, useful message
  and is listed as a follow-up above.
