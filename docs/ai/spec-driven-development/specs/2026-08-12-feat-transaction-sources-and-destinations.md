> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Sources and Destinations for a transaction, instead of a single Destination

- **Type:** `feat`
- **Area:** Frontend, Solana WalletConnect review and Solana activity
- **Status:** Draft for implementation in Claude Code

---

## 1. Motivation

A transaction review today answers "where is this going?" with **one** address. The Solana
WalletConnect review takes a `destination: string` prop
(`src/frontend/src/sol/components/wallet-connect/SolWalletConnectSignReview.svelte`) and renders
it through `SendData`, and the summary feeding it is collapsed to a single
amount / source / destination triple by `mapSolTransactionMessage`
(`src/frontend/src/sol/utils/sol-transactions.utils.ts`).

One field is enough for a plain send and wrong for everything else. A swap moves value in at
least two directions at once, so a single destination has to pick a winner, and the mapper knows
it: when instructions disagree on source or destination it sets `ambiguous` and the signing flow
refuses the request rather than show a summary it cannot make honest. The user gets a refusal
where they wanted a description.

This spec replaces the one field with two lists, **Sources** and **Destinations**, derived from
the transfer instructions the transaction actually contains. A swap then reads as what it is:
value leaving one of our accounts, value arriving in another, and the counterparties named on
both sides.

---

## 2. The lists

### 2.1 Derivation rules

Product gave the rules precisely. They are asymmetric on purpose.

| List             | Rule                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| **Sources**      | the sources of transfer instructions where **our address is the source**                                |
| **Destinations** | the destinations of transfer instructions where our address is **either the source or the destination** |

Four consequences follow, and all four are intended. They are the acceptance criteria of the
derivation, not side effects of it:

1. **A counterparty never appears as a Source.** Sources answers "what of ours is being spent",
   not "who else is involved". Someone else's account paying into a pool is not our source.
2. **We appear as a Source only when we genuinely transfer out.** Receiving value never puts us
   in Sources.
3. **A plain send yields exactly one entry in each list.** One transfer, our address as source,
   the recipient as destination.
4. **A swap yields several.** Every leg we are on one side of contributes its destination.

Non-transfer instructions contribute nothing at all. There is no leg, so there is no source and
no destination. The concrete case product named: creating an associated token account is not a
transfer, so the created account does not appear in either list. The same holds for compute
budget directives and for authority changes.

### 2.2 Worked example: a routed swap

Four token transfers inside a Raydium-routed swap, from our point of view:

| Leg | Source           | Destination          | Sources gets     | Destinations gets |
| --- | ---------------- | -------------------- | ---------------- | ----------------- |
| 1   | our WSOL account | pool vault A         | our WSOL account | pool vault A      |
| 2   | pool vault B     | our USDC account     | nothing          | our USDC account  |
| 3   | pool vault A     | protocol fee account | nothing          | nothing           |
| 4   | pool vault B     | pool vault A         | nothing          | nothing           |

Result: **Sources** = our WSOL account. **Destinations** = pool vault A, our USDC account.

Note what leg 2 does: it puts one of **our own** accounts in Destinations. That is the rule
working as written, and it is the reason a swap can show what we receive rather than only what
we spend. It also reads oddly. See [8. Pending decisions](#8-pending-decisions-facts-are-clear-we-just-need-to-decide).

### 2.3 What "our address" means

The rules say "our address", but SPL transfers name **token accounts**, not wallets. Our USDC
account is not our Solana address, and a rule matched against the wallet address alone would put
every token transfer in neither list.

So "ours" is a **set of owned addresses**: the user's Solana address, plus every token account
owned by it. Both surfaces can already build that set:

- The activity path derives owners from `pre`/`postTokenBalances` into `addressToOwner`, with a
  `getAccountOwner` lookup as fallback, in
  `src/frontend/src/sol/services/sol-transactions.services.ts`. It also resolves the user's
  associated token account through `findAssociatedTokenPda`.
- The review path can read the same `owner` field from the `jsonParsed` account states that the
  simulation preview already fetches (`src/frontend/src/sol/utils/sol-simulation.utils.ts`, on
  `av/sol-wc-simulation-preview`), and can derive the associated token account the same way.

Display follows the convention the activity list already uses, which is to show the **owner**
where it is known and the raw account otherwise (`fromOwner ?? from` in
`src/frontend/src/sol/components/transactions/SolTransaction.svelte`). A user recognises a wallet
address; nobody recognises their own associated token account.

---

## 3. Where the lists appear

The same two lists, from the same derivation, in two places.

| Surface                        | Where the legs come from                                        |
| ------------------------------ | --------------------------------------------------------------- |
| WalletConnect sign review      | **simulation** of the unsigned message, before signing          |
| Activity, executed transaction | **transaction metadata** from `getTransaction`, after execution |

The rule must not fork per surface. A user who reviews a swap and then opens it in their activity
must see the same two lists, or the review taught them nothing about what they signed. That
constraint is what makes [section 4](#4-the-hard-part-two-instruction-representations) the
substance of this feature rather than an implementation footnote.

**Shipping order.** The review surface ships first, in full, together with the shared derivation
that both surfaces call. The activity surface is a follow-up: it renders the same
`deriveSolTransferParties` over legs adapted from `getTransaction` metadata, which the RPC-side
adapter already covers, so the follow-up is presentation and wiring rather than a second rule. The
constraint above still binds it, and it is the reason the derivation was built shared from the
start rather than inlined into the review.

---

## 4. The hard part: two instruction representations

### 4.1 The transfers we need are inner instructions

In a Raydium-routed swap the four token transfers above are cross-program invocations made by the
routing program. They are **not in the message's instruction list at all**. A decoder reading
top-level instructions sees one opaque call to a program it does not know, and derives two empty
lists from a transaction that moved four amounts.

So Sources and Destinations are only worth building if inner instructions are in scope. On the
activity side they already are. On the review side they are not, and PR #13695
(`av/sol-wc-simulation-preview`) deferred `innerInstructions: true` with a stated reason that this
spec has to answer rather than repeat.

### 4.2 The two shapes, as verified

The deferral reason is real, and it is narrower than it first looks.

**Activity path.** `getTransaction` with `encoding: 'jsonParsed'` returns top-level instructions
at `transaction.message.instructions` and CPIs at `meta.innerInstructions[].instructions`. Both
are the same union (`ParsedTransactionInstruction | PartiallyDecodedTransactionInstruction`), so
they splice into one homogeneous array. That splice is
`src/frontend/src/sol/services/sol-transactions.services.ts` around line 241: inner instructions
are sorted by `index` and inserted after the top-level instruction that produced them, with a
running offset. Every element then goes through `mapSolParsedInstruction`
(`src/frontend/src/sol/utils/sol-instructions.utils.ts`), which returns
`SolMappedTransaction { value, from, to, tokenAddress? }`.

**Review path.** `parseSolBase64TransactionMessage` gives decoded `@solana/kit` `Instruction`
objects, which `mapSolInstruction` maps to `MappedSolTransaction { amount, source, destination, tokenAddress?, isApproval? }`.
Adding `innerInstructions: true` to `simulateTransaction` returns
`TransactionForFullMetaInnerInstructionsParsed`, which is **the same union as the activity path's
inner instructions** (verified in `@solana/rpc-api` `simulateTransaction.d.ts` and
`@solana/rpc-types` `transaction.d.ts`, where the option is documented as "`jsonParsed` where
possible, otherwise `json`").

The asymmetry is therefore one-sided. Three of the four instruction sources are already RPC JSON.
Only the review's **top-level** list is kit objects. That is the whole of the mismatch.

### 4.3 Options

**Option A: normalise up, to RPC JSON.** Re-serialise the kit `Instruction`s into
`{ program, programId, parsed: { type, info } }` so a single splice and a single mapper serve
both surfaces.

Rejected. This reimplements the validator's own `jsonParsed` parser in the client, and it has to
match field for field (`lamports` against `amount`, `newAccount` against `destination`, and so on
for every instruction variant). A mismatch does not throw; it produces a leg that silently fails
to match and a transfer that silently vanishes from the lists. Wrong in the direction that hurts.

**Option B: normalise down, to kit `Instruction`s.** Re-decode the simulation's inner
instructions back into kit objects using each program's `identify*` / `parse*` helpers.

Rejected, and not merely on cost: it is not possible for the whole list. Only the
`PartiallyDecodedTransactionInstruction` arm carries the raw base58 `data` needed to decode. The
`ParsedTransactionInstruction` arm carries no raw data at all, because the RPC already parsed it.
The RPC chooses the arm per instruction, so this option covers an unpredictable subset.

**Option C (recommended): do not unify the instruction lists. Unify their outputs.**

The two representations never have to meet as instructions. They only have to meet as **transfer
legs**, and both mappers already produce something very close to one:

- `mapSolInstruction(instruction)` gives `{ amount, source, destination, tokenAddress?, isApproval? }`
- `mapSolParsedInstruction({ instruction, ... })` gives `{ value, from, to, tokenAddress? }`

Introduce one shared record, a transfer leg `{ source, destination, amount, tokenAddress? }`, and
two thin adapters onto the mappers that already exist. Then the derivation is a **single pure
function** over a leg list plus the owned-address set, used unchanged by both surfaces:

```
deriveTransferParties({ legs, ownedAddresses }) -> { sources, destinations }
```

The two representations meet at the narrowest and best-tested boundary in the system, neither
instruction list has to be reshaped, and the rule from
[section 2.1](#21-derivation-rules) exists in exactly one place, which is what
[section 3](#3-where-the-lists-appear) requires.

### 4.4 What Option C costs, stated plainly

- **The two mappers stay two mappers.** They are near-duplicates with different field names, and
  Option C does not merge them. It agrees they are two adapters onto one shape. Merging them is a
  separate refactor and is not in scope here.
- **The adapters differ in async posture.** `mapSolParsedInstruction` is async: it performs
  `getAccountInfo` lookups to recover the mint for unchecked transfers. `mapSolInstruction` is
  sync, and mint recovery happens once at message level in `decode`
  (`src/frontend/src/sol/services/wallet-connect.services.ts`). So the RPC-side leg extraction is
  async and the kit-side is sync. `deriveTransferParties` itself stays pure and sync, which is the
  part that must be identical.
- **Legs must be kept per instruction, not folded.** `mapSolTransactionMessage` exists to collapse
  the message into one summary. The lists are precisely the repair of that collapse, so the leg
  list has to survive to the derivation.
- **This does not by itself retire `ambiguous`.** That flag still guards the single amount and
  single token figure the review shows next to the lists. Two lists fix "who", not "how much".
  Whether a transaction that is ambiguous only in its **addresses** can now be shown rather than
  refused is a real consequence of this feature and is listed as a pending decision.
- **Approvals are not transfers.** `Approve` / `ApproveChecked` currently produce a
  `destination` that is a **delegate**, flagged `isApproval`. A delegate is not a transfer
  destination, so an approval yields no leg and keeps its existing dedicated spender display
  (`SendDataSpender`). Preserve that.
- **An unparsed inner instruction yields no leg.** When the RPC returns the partially decoded arm
  for a program it cannot parse, that CPI contributes nothing, and the lists are quietly
  incomplete. This is the same failure mode the existing `unreviewed` warning already exists for,
  and it must keep firing.

---

## 5. Behaviour

- The lists are **derived, never assembled by hand per surface**. One function, two callers.
- **Order is the instruction order**, deduplicated on first appearance. No sorting by amount, no
  sorting by name; the transaction has an order and the lists keep it.
- **An address appears at most once per list**, even when several legs touch it.
- The review keeps everything it shows today alongside the lists: amount, token, fees, the
  prioritisation-fee comparison, the `unreviewed` warning, and the spender row for approvals.
- The lists never claim completeness. When any instruction in the transaction produced no leg and
  was not recognised as a non-transfer, the existing incomplete-review warning stands.

---

## 6. Non-goals

- **Per-leg amounts in the lists.** The lists answer "who", and adding a figure per row invites
  the reader to add them up across legs that net out. The amount stays where it is today.
- **Naming the operation.** "Swapped via program X" is a different feature and needs program
  identification, not party derivation.
- **Chains other than Solana.** The rule is chain-agnostic and the Ethereum and Bitcoin reviews
  may well want it later, but this spec covers the Solana review and Solana activity only.
- **Retiring the single-summary collapse.** See the pending decision on `ambiguous`.

---

## 7. Open questions (answered during implementation)

All four were checked against Solana mainnet during the build, using a real Raydium-routed swap
(`62CoPSXsWtTK6iSXshkhmKT4hDYokc4UskKKRyU2GgToH4Ku8ezd9u95sxm2fDdPtC3acZGzkAXdeoo1Zn57WEjG`)
replayed through `simulateTransaction` with `replaceRecentBlockhash: true`. None of them
invalidated the design; the fourth reshaped it slightly, as noted.

- **Does every RPC provider OISY uses honour `innerInstructions: true` on `simulateTransaction`?**
  **Yes.** OISY's only Solana HTTP provider is Alchemy (mainnet and devnet, plus a local test
  validator), and Alchemy documents the option. It was exercised live against a stock Agave RPC,
  which is what the local validator runs, and returned the inner instructions as expected.
  `@solana/kit` types the option and its response, so the request is checked at compile time. The
  degraded state is not silent regardless: a provider that refused the option would fail the whole
  simulation, and the review then says the lists are partial
  ([8.2](#82-when-simulation-is-unavailable-fall-back-to-top-level-instructions-and-say-the-lists-are-partial)).
- **For a Raydium-style swap, do the SPL Token and Token-2022 CPIs come back on the
  `ParsedTransactionInstruction` arm or the partially decoded one?** **The parsed arm.** In the
  swap above, all twenty inner instructions came back parsed except the three that are calls into
  the routing and pool programs themselves. Every SPL Token instruction, including the eight
  `transfer` and `transferChecked` calls the legs are made of, was parsed. So a real routed swap
  yields its legs in full, and the partially decoded arm is confined to programs that are not
  transfers anyway.
- **Are the simulation's `innerInstructions` indexed against top-level instructions the same way
  `getTransaction`'s are?** **Yes, identically.** The same transaction returns the same single
  group at `index: 2`, with the same twenty instructions in the same order and on the same arms,
  from both methods. The implementation relies on the grouping (it appends each top-level
  instruction's invocations after it) but still performs no splice.
- **Can the owned-address set be built without extra round trips on the review path?** **Yes, and
  it also removes round trips the mapper would otherwise make.** The `jsonParsed` account states
  the preview already fetches carry `owner` and `mint` for every token account, and the accounts it
  asks about are the message's writable ones, which is necessarily a superset of the accounts a
  transfer names. Handing those mints to `mapSolParsedInstruction` as `addressToToken` is what stops
  it looking up the mint of each unchecked transfer. The one case not covered is the fallback path,
  where there is no simulation at all: there the user's associated token account is derived locally
  with `findAssociatedTokenPda`, for both token programs, which costs no round trip either.

---

## 8. Pending decisions (facts are clear, we just need to decide)

### 8.1 Do we list ourselves among our own Destinations?

**This one is for product, and this spec deliberately does not settle it.**

By the rule as written, a swap puts one of **our own** accounts in Destinations, because we are
the destination of the leg that pays us out (leg 2 in
[section 2.2](#22-worked-example-a-routed-swap)). Product expanded the rule on purpose, so that a
swap shows what we receive and not only what we spend. The expansion is what makes the feature
worth having. It also reads oddly to see your own wallet listed under your own destinations.

| Option                                          | Effect                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1. Show it, unmodified                          | One rule, no special cases, and the received leg is visible. Reads oddly.                        |
| 2. Filter our own addresses out of Destinations | Reads naturally, but the received leg disappears, which undoes the reason the rule was expanded. |
| 3. Show it, labelled as ours                    | Rule stays one line; the oddity is solved where it actually lives, in presentation.              |

**Recommendation: option 3.** The rule is correct and the derivation should not learn an
exception; what reads oddly is an unlabelled address, not the entry itself. Marking our own entry
(for example as the user's own wallet or account) keeps the information and removes the confusion,
and it costs nothing in the derivation, which already knows which addresses are ours.

### 8.2 What do the lists show when simulation fails or is unavailable?

The review's legs come from simulation, and simulation is best effort by design: PR #13695 fails
open, so a failure, timeout, unsupported option, or rate limit leaves the review exactly as it is
today.

| Option                                                   | Effect                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1. Hide both lists entirely                              | Honest, but the review loses the destination field it has today, which is a regression.                |
| 2. Fall back to top-level instructions only              | Keeps a plain send fully correct; a routed swap shows two empty lists, which reads as "nothing moves". |
| 3. Fall back to top-level, and say the lists are partial | Same coverage as option 2, without the false negative.                                                 |

**Recommendation: option 3**, on the condition that "partial" is stated whenever the lists were
built without inner instructions, not only when something visibly failed. Empty lists on a
transaction that clearly does something are the single most dangerous thing this feature can show,
and they are exactly what a swap produces from top-level instructions alone. Note also that a plain
send degrades perfectly under option 3, so the common case loses nothing.

### 8.3 Should Sources be hidden when it contains only our own address?

For every plain send, Sources is exactly one entry: us. That duplicates the wallet identity the
review already displays.

| Option                                         | Effect                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| 1. Always show                                 | Predictable; the section is redundant in the most common case.                    |
| 2. Hide when it holds only our own address(es) | Cleaner default; a section that appears and disappears is harder to reason about. |
| 3. Always show, collapsed to a compact form    | Predictable and quiet, at the cost of another display state.                      |

**Recommendation: option 2**, with one guard: hiding must be distinguishable from having nothing
to show. "We spend nothing here" and "we did not compute the sources" must not render identically.
If option 3 in [8.2](#82-what-do-the-lists-show-when-simulation-fails-or-is-unavailable) is taken,
that guard is already present and option 2 is safe.

### 8.4 Does `ambiguous` still refuse address disagreements?

`mapSolTransactionMessage` sets `ambiguous` (which refuses signing) when instructions disagree on
source or destination, precisely because the single-field summary could not show them. With two
lists, address disagreement is no longer unshowable. Whether the refusal narrows to disagreements
about **amount and token** only is a decision with a real safety surface, and it should be made on
its own rather than folded into this change. Until it is decided, this spec assumes `ambiguous`
behaves exactly as it does today.

---

## 9. Acceptance criteria

1. The Solana WalletConnect review shows **Sources** and **Destinations** lists in place of the
   single destination field, derived from the transaction's transfer instructions.
2. The Solana activity shows the same two lists for an executed transaction, derived from
   transaction metadata, and matching what the review showed for the same transaction. _(Deferred
   to the follow-up described in [section 3](#3-where-the-lists-appear); the derivation and the
   RPC-side adapter it needs are in place.)_
3. Both surfaces call **one** derivation function; the rule from
   [section 2.1](#21-derivation-rules) is implemented once.
4. A plain send produces exactly one entry in each list.
5. A routed swap produces the several entries of
   [section 2.2](#22-worked-example-a-routed-swap), including the ones that only exist as inner
   instructions.
6. A counterparty never appears in Sources, and our own address appears in Sources only when a leg
   genuinely transfers out of it.
7. Creating an associated token account contributes nothing to either list, and neither does any
   other non-transfer instruction.
8. Token accounts are displayed by their owner where the owner is known.
9. An approval keeps its spender display and contributes no leg.
10. The existing fail-open posture of the simulation preview is unchanged, and a review whose
    lists were built without inner instructions says so.
11. Quality gates pass: `format`, `lint --max-warnings 0`, `check`, and the vitest suite.
