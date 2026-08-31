This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec — Transaction priority for EVM sends

- **Feature:** Let the user choose Slow / Normal / Fast for an ETH or ERC-20 send, and show a fee that reflects the choice
- **Design:** Figma `duPCw1leqer7ES0sBb6Uua` ("7. OISY UI"), page _Priority, nonce, memo_, section **Priority fees** (`22675:343661`)
- **Status:** Draft for implementation in Claude Code

> **This page carries two generations of the design. This ticket is the first one.**
> The frames below sit under the **Priority fees** section (`22675:343661`) and belong to the
> **Pro mode v1** flow. The same page also holds a **Pro mode v2** flow (section **TXN prio**,
> `15344:65527`) where Priority is a row inside a `Details` section behind an `Expert mode`
> toggle, the picker is a full wizard step, and the tiers are renamed Normal / Fast / Urgent.
> **v2 is not this ticket.** The authority is the screenshot Stefan attached to OISY-3122
> (`image-20260831-071426.png`, 2026-08-31 09:14): it is a capture of the **Priority fees**
> section and its three frames, exactly the ones listed below. Do not re-derive the target from
> the Figma Flows panel; check the ticket attachment.

Exported frames:

| Frame                        | Node           | Export                                                                                              |
| ---------------------------- | -------------- | --------------------------------------------------------------------------------------------------- |
| Desktop send form, collapsed | `22647:342832` | [desktop-collapsed.png](./2026-08-31-feat-evm-send-priority-fees/designs/desktop-collapsed.png)     |
| Desktop send form, expanded  | `22647:343300` | [desktop-expanded.png](./2026-08-31-feat-evm-send-priority-fees/designs/desktop-expanded.png)       |
| Mobile bottom sheet, 375x812 | `22709:9016`   | [mobile-bottom-sheet.png](./2026-08-31-feat-evm-send-priority-fees/designs/mobile-bottom-sheet.png) |

Mock values in the expanded desktop frame are internally inconsistent (Normal reads
`0.0015 ETH / $0.64` while the fee row reads `0.0012 ETH / $0.42`). The bottom sheet is
consistent, Normal matching the fee row. Take the sheet as the intended relationship: **the fee
row reflects the selected tier**.

---

## 1. Motivation

An EVM send today gives the user no say in how fast it confirms. OISY picks one gas tier on
their behalf and shows a single fee row they cannot influence. Every mainstream EVM wallet
(MetaMask, Rabby, Rainbow, Coinbase Wallet) exposes a speed choice, because the trade-off is
genuinely the user's: a transfer that can wait an hour should not pay a priority tip, and one
racing a deadline should.

Two facts make this cheap to build and one makes it subtly wrong to build naively.

**The tiers are already fetched and thrown away.** `src/frontend/src/eth/rest/infura.rest.ts`
calls the MetaMask Gas API (`/networks/{chainId}/suggestedGasFees`). Its response type
`GasFeeEstimate` in `src/frontend/src/eth/types/infura.ts` already declares `low`, `medium`,
`high` and `estimatedBaseFee`, each level carrying `suggestedMaxPriorityFeePerGas`,
`suggestedMaxFeePerGas`, `minWaitTimeEstimate` and `maxWaitTimeEstimate`. `getSuggestedFeeData`
destructures **only `medium`** and discards the rest. Slow / Normal / Fast maps 1:1 onto
low / medium / high with no new API integration.

**The per-send-setting precedent exists.** `src/frontend/src/lib/stores/send.store.ts` already
carries `sendEthCustomNonce: Writable<number | undefined>` in `SendContext`, read by
`EthSendTokenWizard.svelte` and forwarded to `send.services.ts`, with no UI setting it. Its
comment records why it lives in a context rather than a prop: `WizardModal` re-renders content
on step change, so a `$bindable` is reset between the form and review steps. Priority is
subject to the identical constraint.

**But the fee OISY displays today cannot price the tiers.** See section 3.1. Fixing that is a
prerequisite, not a nicety, which is why this spec ships in two PRs.

Scope note from the ticket: this covers the OISY send flow only. WalletConnect send requests
need the same choice and are a separate follow-up ticket.

## 2. Scope

| Layer        | Change                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------- |
| Feature flag | Whole feature behind a `LOCAL \|\| STAGING` flag                                                  |
| Gas API      | Return all three tiers plus `estimatedBaseFee` instead of only `medium`                           |
| Fee maths    | Add an estimated-cost derivation alongside the existing max-fee ceiling                           |
| Fee display  | Send flow shows the estimate, labelled "Estimated fee"                                            |
| Fee state    | Selected tier lives in `SendContext`, defaults to Normal                                          |
| UI           | Desktop: collapsible `Priority` row with three options. Mobile: bottom sheet with a `Done` button |
| Signing      | The selected tier's `maxFeePerGas` / `maxPriorityFeePerGas` are what get signed                   |
| Networks     | All EVM networks                                                                                  |
| i18n         | New keys for the row, the three tiers, and the tooltip                                            |
| Tests        | Unit tests for the tier mapping, the estimate util, the store, and the two UI surfaces            |
| `PRODUCT.md` | Extend the "Transaction fees" section under `## Ethereum`                                         |

### Feature flag

Everything in this spec ships behind one flag, on in local and staging only, off in beta and
production. Follow the existing pattern, e.g. `src/frontend/src/env/exchange.env.ts`:

```ts
import { LOCAL, STAGING } from '$lib/constants/app.constants';

export const SEND_TRANSACTION_PRIORITY_ENABLED = LOCAL || STAGING;
```

The flag gates the **whole** user-visible change, the estimated-fee relabelling included. With
the flag off the send flow keeps today's "Max fee" row and no Priority row, so beta and
production see no difference at all. That means the fee row has two states to keep working, not
one. Do not let the flag leak past the display layer into the fee maths, which is inert until
something renders it.

### Networks

Ethereum `1n` / Sepolia `11155111n`, Arbitrum `42161n` / Sepolia `421614n`, Base `8453n` /
Sepolia `84532n`, BSC `56n` / testnet `97n`, Polygon `137n` / Amoy `80002n`.

Two per-network behaviours already in `getEthFeeDataWithProvider` must survive: the
`maxBigInt` merge against ethers' own `provider.getFeeData()`, and the BSC-only floor from
`getGasFeeFloor` (`BSC_MIN_MAX_FEE_PER_GAS`, `BSC_MIN_MAX_PRIORITY_FEE_PER_GAS`). Both apply
per tier, not once.

See [Open questions](#7-open-questions-facts-to-confirm) for Gas API coverage on testnets and
for whether tiers separate meaningfully on Arbitrum and Base.

### Out of scope

- **WalletConnect.** `EthWalletConnectSendReview.svelte` keeps today's behaviour. Its own ticket.
- **Expert mode.** The Figma frames beside these (raw `maxFeePerGas` / `maxPriorityFeePerGas` /
  nonce editing) are a separate ticket, as is the nonce UI that would finally set
  `sendEthCustomNonce`.
- **Non-send EVM flows.** Swap, convert, stake and Liquidium keep the max-fee display. See
  [Pending decision 1](#8-pending-decisions-facts-are-clear-someone-needs-to-decide).
- **Non-EVM chains.** BTC and SOL fee models are unrelated.

## 3. Approach

### 3.1 Why the displayed fee has to change first

`maxGasFee` in `src/frontend/src/eth/utils/fee.utils.ts` is `maxFeePerGas * gas`. That is a
ceiling inflated twice over:

1. `maxFeePerGas` is a cap, not a price. EIP-1559 charges
   `(baseFee + min(tip, maxFeePerGas - baseFee)) * gasUsed` and never takes the remainder.
2. `gas` is the gas **limit**, and `getErc20FeeData` in
   `src/frontend/src/eth/services/fee.services.ts` deliberately pads it by **+50%** (150% for
   RSC, see the comment there). Unused gas is refunded.

The number on screen therefore runs well above what users pay, often close to 2x for an ERC-20
transfer.

This matters for the selector, not just for honesty. **Max fee is dominated by the base fee,
which is common to all three tiers**, so pricing tiers by max fee compresses them into
near-identical amounts and makes the choice look pointless. The tier difference lives almost
entirely in the priority tip. The design's own numbers confirm the intent: a 20x spread from
Slow (`0.0001 ETH`) to Fast (`0.002 ETH`) is impossible under max-fee pricing.

Target: `estimated = (estimatedBaseFee + tierTip) * gas` as the displayed value, with
`maxGasFee` retained unchanged for every solvency check.

### 3.2 Gas API: return all tiers

In `src/frontend/src/eth/rest/infura.rest.ts`, change `getSuggestedFeeData` to return the three
levels plus `estimatedBaseFee` rather than collapsing to `medium`. Keep the existing
`parseToken({ unitName: 'gwei' })` conversion per value. The `GasFeeEstimate` type already
describes the payload, so no type work beyond a new return shape.

Introduce the tier as a typed enum in `src/frontend/src/eth/types/` (name at the implementer's
discretion, e.g. `EthFeePriority` with `SLOW` / `NORMAL` / `FAST`) and keep the Gas API's
`low` / `medium` / `high` naming confined to the REST layer. The rest of the app should not know
the vendor's vocabulary.

### 3.3 Fee data flow

`getEthFeeDataWithProvider` in `fee.services.ts` gains the selected tier as an input and returns
fee data for that tier, still merged with ethers' `getFeeData()` via `maxBigInt` and still
floored on BSC.

`EthFeeContext.svelte` already owns fetching, debouncing, the mined-transaction websocket
listener, exponential-backoff retry and visibility-change recovery. Do not build a second fetch
path.

The selected tier reaches it as a **prop**, not from `SendContext`: swap, convert, stake and
Liquidium mount `EthFeeContext` too and have no send context to read. Flows that offer no choice
leave it at the default.

The provider's own quote (`maxBigInt` against ethers) and the BSC floor are lower bounds on what
the chain will relay, so they apply to **every** tier. Applying them once after selection would
let a Slow choice fall below the floor.

The three tiers' prices must be displayed **simultaneously** in the expanded list, so the store
needs all three, not just the selected one. Keep the full per-tier set beside the fee store and
re-price locally on selection rather than refetching, which removes the network round trip from
the interaction.

The re-pricing effect must track **the choice alone**. Tracking the fetched sample as well makes
every fetch set the fee twice, once from the fetch and once from the effect, since a fresh fetch
already applies the current tier itself.

### 3.4 Estimate vs ceiling

Add an estimated-cost derivation next to `maxGasFee` / `minGasFee` in `fee.utils.ts`, and expose
it through `ETH_FEE_CONTEXT_KEY` in `src/frontend/src/eth/stores/eth-fee.store.ts` alongside the
existing `maxGasFee` and `minGasFee`.

**`maxGasFee` keeps its current meaning and all its current callers.** These are solvency and
max-amount computations and must stay on the ceiling:

- `eth/components/send/EthSendAmount.svelte` `customValidate`: native ETH checks
  `userAmount + minGasFee`, ERC-20 checks `ethBalance < maxGasFee`
- `eth/components/send/EthSendAmount.svelte`, `fee={$maxGasFee}` passed to `MaxBalanceButton`
- the same pattern in `SwapEthForm.svelte`, `HarvestStakeForm.svelte`,
  `HarvestUnstakeForm.svelte`, `AiAssistantReviewSendEthToken.svelte`

Changing any of those to the estimate would let a user start a send they cannot afford to
complete.

### 3.5 Display blast radius

`EthFeeDisplay.svelte` renders `maxGasFee` and has **11 call sites**:
`EthSendForm`, `EthSendReview`, `EthWalletConnectSendReview`, `EthConvertForm`,
`EthConvertReview`, `SwapEthForm`, `SwapEthWizard`, `HarvestStakeFees`,
`LiquidiumSupplyEthWizard`, `LiquidiumRepayEthWizard`, `AiAssistantReviewSendEthToken`.

The **label** is a per-call-site snippet, so copy is narrower: only `EthSendForm`,
`EthSendReview` and `EthWalletConnectSendReview` use `$i18n.fee.text.max_fee_eth`.

Given the out-of-scope list, prefer an opt-in prop on `EthFeeDisplay` over changing its default,
so the other eight call sites are untouched by construction rather than by review diligence.

### 3.6 UI

**Reuse `src/frontend/src/lib/components/ui/CollapsibleBottomSheet.svelte`.** It is already
desktop-collapsible / mobile-bottom-sheet, with a `contentFooter` snippet receiving a `closeFn`
that renders a `Done` button. `lib/components/swap/SwapProvider.svelte` is a working example of
the same shape.

Two gaps versus the design, both additive props rather than a fork:

- its mobile trigger is an `IconInfo` button; the design wants the blue selected value plus a
  chevron
- its bottom sheet header has only a close X; the design wants a `Priority` title beside it

Extending it also serves the nonce and memo tickets on the same Figma page.

**The option list is new.** There is no `type="radio"` anywhere in `src/frontend/src` today.
Build it as a keyboard-accessible radio group; `lib/components/ui/Checkbox.svelte` is the local
precedent for input semantics (note its deliberate one-way `checked` mirroring), and
`docs/ai/frontend/i18n-and-a11y.md` governs. No bare clickable `<div>`s.

Per the design, each row carries a name, an emoji, a secondary descriptor, and the tier's fee in
both native and fiat:

| Tier      | Descriptor     |
| --------- | -------------- |
| Slow 🐢   | May take hours |
| Normal ⚡ | Recommended    |
| Fast 🔥   | Prioritized    |

The `Priority` row sits between the destination and the fee row, which in
`lib/components/send/SendForm.svelte` means between the `SendDestination` component and the
`fee` snippet. Adding a snippet slot there is preferable to hardcoding an EVM concern into the
shared form.

`minWaitTimeEstimate` / `maxWaitTimeEstimate` come back from the Gas API per tier. The design
uses static descriptors ("May take hours"), so do **not** render live wait times; note them as
available if the descriptors later need to become dynamic.

### 3.7 Signing

`EthSendTokenWizard.svelte` reads `maxFeePerGas`, `maxPriorityFeePerGas` and `gas` off
`$feeStore` and passes them to `executeSend` / `sendNft`. Once the store holds the selected
tier's values this needs no change beyond confirming the selected tier is what the store
exposes. The existing null-guard that raises
`$i18n.send.assertion.max_gas_fee_per_gas_undefined` stays.

`sendTrackingEventMetadata` in the same file already reports `maxFeePerGas`,
`maxPriorityFeePerGas` and `gas` for `TRACK_COUNT_ETH_SEND_SUCCESS` / `_ERROR`. Add the selected
tier so the choice is measurable; see `docs/ai/frontend/analytics.md`.

### 3.8 i18n

Follow `docs/ai/frontend/workflows/add-i18n-key.md`: add to `en.json` only, then run
`npm run i18n` to regenerate `lib/types/i18n.d.ts` and the key helpers, and commit them
together. Never hand-edit the generated `.d.ts`.

Needed: the `Priority` row label, the three tier names and descriptors, the bottom sheet title,
and the tooltip. Tooltip copy is given by the designer, verbatim:

> Priority affects speed and fees. Higher priority usually means faster processing.

The fee row becomes "Estimated fee". Drop the "(likely in < 30 seconds)" hint from the send
label, which the priority row now supersedes. `fee.text.max_fee_eth` is present in 17 locale
files and is still used by `EthWalletConnectSendReview`, so it must not be deleted; add a new
key rather than repurposing it.

Beware `fee.text.prioritization_fee` ("Priority fee") already exists and means something else.
Pick key names that will not be confused with it.

## 4. PR split

Two PRs. Atomic per `AGENTS.md` commandments 2 and 3.

**PR1 `feat(frontend): show the estimated fee for EVM sends`**

- `getSuggestedFeeData` returns `estimatedBaseFee` alongside the medium tier
- estimated-cost derivation in `fee.utils.ts`, exposed via `eth-fee.store.ts`
- send flow renders the estimate, row relabelled "Estimated fee"
- every solvency check stays on `maxGasFee`
- no tier UI yet; still pinned to Normal
- `PRODUCT.md` updated in this PR

> **Adjusted during implementation.** PR1 was originally specified to return all three tiers.
> It returns only `estimatedBaseFee`, because nothing in PR1 consumes the other two and unused
> surface is what commandment 10 forbids. The full tier set moved to PR2, which needs it.

**PR2 `feat(frontend): let the user choose the priority for EVM sends`**

- all three tiers returned from the Gas API, with the vendor's low / medium / high naming
  confined to the REST layer
- tier state in `SendContext`, default Normal
- desktop collapsible row plus mobile bottom sheet, all three tiers priced
- selection drives the fee data and therefore what gets signed
- tier added to send analytics metadata
- `PRODUCT.md` updated in this PR

## 5. `PRODUCT.md`

Extend "### Transaction fees" under "## Ethereum" (currently two paragraphs about fee
resilience and the never-submit-without-a-fee guarantee). Both PRs update it in the same PR as
the behaviour change, not afterwards.

PR1 should state that the fee shown is the expected cost rather than the ceiling, and that the
ceiling still governs whether a send is affordable. PR2 should state the choice, the default,
that it is per-send, and which chains offer it. Keep the deliberate negative statements: the
choice does **not** apply to WalletConnect requests, nor to swap, convert or stake flows.

## 6. Tests

See `docs/ai/frontend/testing.md`. Existing specs that will need updating rather than replacing:
`tests/eth/services/fee.services.spec.ts`, `tests/eth/rest/infura.rest.spec.ts`,
`tests/eth/components/fee/EthFeeContext.spec.ts`,
`tests/eth/components/fee/EthFeeDisplay.spec.ts`,
`tests/eth/components/send/EthSendForm.spec.ts`,
`tests/eth/components/send/EthSendTokenWizard.spec.ts`.

Note `EthSendForm.spec.ts` and `EthSendReview.spec.ts` both assert on a hardcoded substring of
`max_fee_eth` because the key contains HTML; those assertions break by design when the label
changes.

New coverage worth having:

- tier to `low`/`medium`/`high` mapping, including that the app-level enum does not leak the
  vendor names
- the estimate util, particularly that it is strictly below `maxGasFee` for the same input
- BSC floor and the ethers `maxBigInt` merge applied per tier, not once
- selecting a tier changes what `EthSendTokenWizard` passes to `executeSend`
- the default is Normal on open
- the bottom sheet's `Done` closes without discarding the selection
- keyboard operability of the radio group

Also add a case per flag state: with the flag off, no Priority row and the old "Max fee" label;
with it on, the row and the "Estimated fee" label.

Do not add Playwright specs: `e2e/` is maintenance-only per `AGENTS.md`.

> `npm run test` currently exits non-zero locally with `Worker exited unexpectedly` even when
> every test passes. This is **pre-existing**, reproducible on a docs-only branch off `main`.
> Confirm with `--reporter=json --outputFile` and check `numFailedTests` before treating a red
> run as a real failure.

Run `npm run format`, `npm run lint -- --max-warnings 0`, `npm run check`, `npm run test`, and
`npm run check:tests` before pushing. No Rust changes in either PR.

## 7. Open questions (facts to confirm)

1. **Gas API coverage per chain.** Does `suggestedGasFees` answer for all ten chain IDs in
   section 2, in particular the testnets (Sepolia, Base Sepolia, Arbitrum Sepolia, Amoy, BSC
   testnet)? Today a non-OK response throws, is caught in `EthFeeContext.updateFeeData`, and
   produces a `fee.error.cannot_fetch_gas_fee` toast plus backoff retry. If some chains 404, the
   tier UI needs a defined fallback (most likely: hide the row, keep today's single-tier
   behaviour) rather than an error toast on every send.
2. **Do the tiers separate on L2s?** On Arbitrum and Base the priority fee is negligible and
   cost is dominated by L1 data availability. If `low` / `medium` / `high` come back
   near-identical there, a three-way selector showing three identical amounts is worse than no
   selector. Needs a real API sample per chain before PR2 commits to showing the row everywhere.
3. **Tooltip copy for `Estimated fee`.** The designer supplied copy for `Priority` only.
4. **The designer's own open question**, verbatim: _"Shall we put the message that 'Fee will be
   paid in ETH' here?"_ Relevant existing behaviour:
   `lib/components/send/SendFeeInfo.svelte` already renders a `MessageBox` when the fee symbol
   differs from the send-token symbol, using `send.info.fee_info`. A version of this message
   therefore already ships for ERC-20 sends; the question is only whether it moves next to the
   fee row.

## 8. Pending decisions (facts are clear, someone needs to decide)

1. **Blast radius of the estimate.** Send flow only (3 label call sites), or all 11
   `EthFeeDisplay` consumers? Send-only is smaller and matches the ticket, but leaves swap,
   convert, stake and Liquidium showing a ceiling under a differently worded label. This spec
   assumes send-only; revisit if the inconsistency is judged worse than the wider diff.
2. **`minGasFee` is arguably wrong today.** It is `maxPriorityFeePerGas * gas`, which omits the
   base fee entirely, so it is not a meaningful lower bound, yet it gates the native-ETH
   insufficient-funds check in `EthSendAmount.customValidate`. The estimate PR1 introduces is
   precisely the correct version of what `minGasFee` was reaching for. Fold the repair into PR1,
   split it into its own `fix` PR, or leave it? Note it is a real user-facing bug: a native ETH
   send can pass validation and then fail to cover its own base fee.
3. **Which `gas` prices the displayed estimate** for ERC-20: the padded limit that gets signed,
   or an unpadded estimate? The padded one keeps display and signing consistent but inflates the
   estimate by 50%, which partly defeats the point of PR1. The unpadded one is more honest but
   means two gas numbers in flight.
4. **Where the tier lives**: `SendContext` (mirroring `sendEthCustomNonce`, same `WizardModal`
   remount constraint) or `EthFeeContext` (closer to the data it drives). This spec assumes
   `SendContext` for consistency with the established precedent.
5. **Persistence.** Does the choice reset to Normal on every send, or persist for the session or
   across sessions? The ticket states only that the default is Normal. This spec assumes
   per-send with no persistence.
