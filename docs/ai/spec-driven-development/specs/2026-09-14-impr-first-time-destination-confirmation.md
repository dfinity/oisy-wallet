# Spec: Confirm every first-time send destination on the review step

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Make the user confirm, explicitly, before an asset leaves the wallet towards an address they
have never sent to.

Today the send flow mentions an unfamiliar destination once, on the address-entry step, in
wording soft enough to scroll past ("You haven't interacted with this address before"), and
the review step — the last screen before an irreversible transfer — says nothing at all. The
mention is also suppressed when the address is a saved contact, although saving an address is
not the same as having used it.

This improvement:

1. sharpens the warning on the address-entry step, and
2. repeats it on the review step as a **confirmation the user has to tick** before the Send
   button becomes active,

for **every first-time destination**, contact or not.

Source: user request.

---

## Background

### "Used before", not "known"

The only thing that makes a destination familiar is that the user has **sent to it before**.
`getKnownDestinations` (`src/frontend/src/lib/utils/transactions.utils.ts:408`) builds that
set from the transactions loaded for the chain, keeping entries where `type === 'send'`, `to`
is set and `value > 0`. It is the same set the **Recently Used** tab of the address step lists
(`src/frontend/src/lib/components/send/KnownDestinations.svelte`), so the warning and that
list agree by construction: an address in the list never asks for a confirmation, an address
missing from it always does.

Two consequences are deliberate:

- **Zero-amount sends do not count.** Anyone can push a zero-value transfer into the user's
  history, so counting them would let an attacker make a lookalike address vouch for itself.
- **A saved contact does not count.** A contact can be saved, or received from, without ever
  having been sent to; today's suppression let an address that was merely saved pass silently.

Coverage of "the chain": ETH/EVM = all tokens of the same network; IC = ICP transactions for
ICP, the ck/ICRC ones otherwise; BTC = all BTC; SOL = all SOL/SPL. Address matching is
case-insensitive where the network's addresses are (`getRecordValueByCaseSensitivity`).

### Where the two steps live

The address step renders `src/frontend/src/lib/components/send/SendInputDestination.svelte`
via one wrapper per chain; its warning conditions live there. The review step is the shared
`src/frontend/src/lib/components/send/SendReview.svelte`, used by ETH/EVM, ICP/ICRC, BTC and
SOL (tokens and collectibles alike); it owns the Send button and a `disabled` prop each chain
computes, and reads the send token from the send context, so it can resolve the network — and
therefore the right per-chain destinations store — itself.

### The confirmation pattern already exists

`SwapReview.svelte:171-189` gates a swap that would lose significant value behind exactly this
shape: a `MessageBox` whose `icon` snippet is a `Checkbox`, the copy as the checkbox's
`<label>`, and the action button disabled until it is ticked. The first-time destination
confirmation reuses that layout rather than inventing a second one, but stays at the
`warning` level: a swap losing half its value is an error, a first send to a new recipient is
routine, and red spent on the routine case stops being read.

---

## Behaviour

### Address-entry step

Trigger: a valid destination longer than `MIN_DESTINATION_LENGTH_FOR_ERROR_STATE` with no
previous send on record. **Saved contacts no longer suppress it.**

It is the same red box as the review step, without the checkbox: it states that this is the
first send to the address and that a transfer cannot be reversed. **Next stays enabled** — the
user is stopped once, at the last moment, not twice.

### Review step

When the destination has no previous send on record, the review step shows the box **with the
confirmation checkbox**, and the **Send button stays disabled until it is ticked**, on top of
each chain's existing `disabled` conditions. It renders directly above the toolbar, after the
network / fee / info blocks.

Ticking is per address and per visit: going back to edit the destination and returning re-arms
the gate.

When the destination has a previous send on record, nothing changes — no box, no extra click.

### Burning and minting

**Burning is not exempt.** Sending to a minter account by mistake destroys the assets, which
is the worst outcome the confirmation exists to prevent, so a first-time minter address is
warned about and gated like any other.

**Minting is exempt** (`isIcMintingAccount`): there the user _is_ the minter and the
destination is an ordinary recipient, so a history of previous sends says nothing useful.
`SendReview` already relabels its button in that state.

### Negative guarantees (what it does _not_ do)

- It does **not** gate the address-entry step's Next button.
- It does **not** change how the set of used destinations is computed, or which transactions
  count as a previous send.
- It does **not** treat a saved contact, a received transfer, a zero-amount send, or the
  user's own wallet addresses as a previous send.
- It does **not** exempt burning, only minting.
- It does **not** touch the convert flows, the WalletConnect send review, or the AI assistant
  send review — those use their own review components.
- It does **not** persist the confirmation. There is no "don't warn me again for this
  address"; the only thing that retires the warning is a real send.

---

## Implementation

### 1. Shared predicate — `src/frontend/src/lib/utils/known-destinations.utils.ts`

`isFirstTimeDestination({ destination, networkId, knownDestinations })`, extracted from the
`$derived` blocks in `SendInputDestination.svelte`. It fails open — no warning — when the
destinations or the network are nullish, so an unsupported network behaves as before.

The contact lookup those blocks did is dropped, which makes `networkContacts` unused in
`SendInputDestination.svelte`; the prop is removed there and in the four chain wrappers
(`{Btc,Eth,Ic,Sol}SendDestination.svelte`) and at the call sites in
`SendDestinationWizardStep.svelte`. `SendDestinationTabs` keeps its own `networkContacts`,
which it needs for the contacts tab.

### 2. Shared presentation — `src/frontend/src/lib/components/send/FirstTimeDestinationWarning.svelte`

A `MessageBox level="warning"` following the `SwapReview` confirmation layout: with an
`onConfirm` callback it renders the `Checkbox` as the box's `icon` and the copy as its
`<label>`, plus the confirmation sentence; without one it renders the same copy as plain text.
The consumer owns the checked state (`Checkbox.svelte` is one-way).

- `SendInputDestination.svelte` renders it without `onConfirm`, keeping its existing `{#if}`
  and slide transition.
- `SendReview.svelte` renders it with `onConfirm`.

### 3. Gate — `src/frontend/src/lib/components/send/SendReview.svelte`

Resolve `knownDestinations` from the send token's network id with the same `isNetworkId*`
helpers `SendDestinationWizardStep.svelte` uses, written as a ternary chain so only the
matching chain's store is subscribed. Then

```
disabled={disabled || (firstTimeDestination && !firstTimeDestinationConfirmed)}
```

with the confirmation reset on a destination change, as `SwapReview` does. The
`replaceToolbar` variant is left as-is (no send button of its own to gate).

### 4. i18n

Under `send.info`, replacing `unknown_destination`: `first_time_destination` ("You have never
sent tokens to this address before, so verify the address carefully.") and
`first_time_destination_confirm` ("Confirm that this is a first time send."), the latter
appended only where the checkbox is. Regenerate types with
`npm run i18n`, and translate every locale of the `Languages` enum (`ar.json` is not in it and
only receives the empty keys the generator adds).

### 5. Tests

- `known-destinations.utils.spec.ts` — the predicate, including casing and the fail-open cases.
- `FirstTimeDestinationWarning.spec.ts` — copy, checkbox only with `onConfirm`, tick callback.
- `SendReview.spec.ts` — gated while unconfirmed, released once ticked, still gated for a
  saved contact, and exempt for an empty destination and for minting.
- `SendInputDestination.spec.ts` — warns for a saved contact, never asks for a confirmation.
- `EthSendReview.spec.ts` / `BtcSendReview.spec.ts` — existing assertions that the Send button
  is enabled now confirm the first-time destination first, so they keep testing the fee.

### 6. `PRODUCT.md`

New "Send" section describing the two steps and the gate, including the negative guarantees
above.

---

## Acceptance criteria

1. A destination with no previous send shows the warning on the address step — including one
   saved as a contact — and Next stays enabled.
2. The review step for ETH/EVM, ICP/ICRC, BTC and SOL (tokens and collectibles) shows the
   warning with a checkbox, and Send is disabled until it is ticked.
3. A destination listed under Recently Used shows neither box and needs no extra click.
4. A zero-amount send to an address does not retire the warning for it.
5. Going back from review, changing the destination, and returning requires ticking again.
6. A first-time burn address is warned about and gated; minting shows neither.
