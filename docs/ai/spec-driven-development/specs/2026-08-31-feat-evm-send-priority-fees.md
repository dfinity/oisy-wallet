This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec — Transaction priority for EVM sends

- **Feature:** Let the user choose the priority of an ETH or ERC-20 send, and show a fee that reflects the choice
- **Design:** Figma `duPCw1leqer7ES0sBb6Uua` ("7. OISY UI"), page _Priority, nonce, memo_, section **TXN prio** (`15344:65527`), flow **Pro mode v2**
- **Status:** Draft for implementation in Claude Code

> **This spec targets Pro mode v2.** An earlier revision targeted the frames under the
> **Priority fees** section (`22675:343661`), which belong to the superseded **Pro mode v1** flow.
> Section 9 records what changed, because an implementation against v1 already exists and has to
> be reworked.

Exported frames:

| Frame                             | Node          | Export                                                                                                          |
| --------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| Details, expert mode on, defaults | `15267:44529` | [details-default.png](./2026-08-31-feat-evm-send-priority-fees/designs/details-default.png)                     |
| Details, values customised        | `15292:4939`  | [details-customised.png](./2026-08-31-feat-evm-send-priority-fees/designs/details-customised.png)               |
| Details, no nonce row             | `15344:65215` | [details-no-nonce.png](./2026-08-31-feat-evm-send-priority-fees/designs/details-no-nonce.png)                   |
| Transaction priority step         | `15267:42926` | [transaction-priority-step.png](./2026-08-31-feat-evm-send-priority-fees/designs/transaction-priority-step.png) |

---

## 1. Motivation

An EVM send today gives the user no say in how fast it confirms. OISY picks one gas tier on
their behalf and shows a single fee row they cannot influence. Every mainstream EVM wallet
(MetaMask, Rabby, Rainbow, Coinbase Wallet) exposes a speed choice, because the trade-off is
genuinely the user's: a transfer that can wait should not pay a priority tip, and one racing a
deadline should.

**The tiers are already fetched and thrown away.** `src/frontend/src/eth/rest/infura.rest.ts`
calls the MetaMask Gas API (`/networks/{chainId}/suggestedGasFees`). Its response type
`GasFeeEstimate` in `src/frontend/src/eth/types/infura.ts` already declares `low`, `medium`,
`high` and `estimatedBaseFee`, each level carrying `suggestedMaxPriorityFeePerGas`,
`suggestedMaxFeePerGas`, `minWaitTimeEstimate` and `maxWaitTimeEstimate`. `getSuggestedFeeData`
destructures **only `medium`** and discards the rest. No new API integration is needed, and the
wait-time fields are what the design's per-tier descriptions are made of.

**The per-send-setting precedent exists.** `src/frontend/src/lib/stores/send.store.ts` already
carries `sendEthCustomNonce: Writable<number | undefined>` in `SendContext`, read by
`EthSendTokenWizard.svelte` and forwarded to `send.services.ts`, with no UI setting it. Its
comment records why it lives in a context rather than a prop: `WizardModal` re-renders content
on step change, so a `$bindable` is reset between steps. Priority is subject to the identical
constraint, and the v2 design makes it sharper still, since choosing a priority is now its own
wizard step.

**But the fee OISY displays today cannot price the tiers.** See section 3.1.

Scope note from the ticket: this covers the OISY send flow only. WalletConnect send requests
need the same choice and are a separate follow-up ticket.

## 2. Scope

The design puts Priority inside a **Details** section alongside Memo and Nonce, gated by an
**Expert mode** toggle. Memo and Nonce are their own tickets. This spec builds the Details
section scaffolding and the **Priority** row plus its step; it deliberately leaves the Memo and
Nonce rows to those tickets, and the scaffolding is shaped so they can drop in.

| Layer        | Change                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Feature flag | Whole feature behind a `LOCAL \|\| STAGING` flag                                                                         |
| Gas API      | Return all three tiers, `estimatedBaseFee`, and the wait-time estimates                                                  |
| Fee maths    | Add an estimated-cost derivation alongside the existing max-fee ceiling                                                  |
| Fee display  | Send flow shows the estimate, labelled "Estimated fee"                                                                   |
| Fee state    | Selected tier lives in `SendContext`, defaults to Normal                                                                 |
| UI           | A `Details` section with an `Expert mode` toggle, a `Priority` row with `Edit`, and a `Transaction priority` wizard step |
| Signing      | The selected tier's `maxFeePerGas` / `maxPriorityFeePerGas` are what get signed                                          |
| Networks     | All EVM networks                                                                                                         |
| i18n         | New keys for the section, the row, the three tiers and their wait times, and the tooltips                                |
| Tests        | Unit tests for the tier mapping, the estimate util, the store, the flag, and the step                                    |
| `PRODUCT.md` | Extend the "Transaction fees" section under `## Ethereum`                                                                |

### Feature flag

Everything in this spec ships behind one flag, on in local and staging only, off in beta and
production. Follow the existing pattern exactly, e.g.
`src/frontend/src/env/exchange.env.ts`:

```ts
import { LOCAL, STAGING } from '$lib/constants/app.constants';

export const SEND_TRANSACTION_PRIORITY_ENABLED = LOCAL || STAGING;
```

The flag gates the **whole** user-visible change, the estimated-fee relabelling included. With
the flag off the send flow keeps today's "Max fee" row and no Details section, so beta and
production see no difference at all. That means the fee row has two states to keep working, not
one; do not let the flag leak past the display layer into the fee maths, which is inert until
something renders it.

### Networks

Ethereum `1n` / Sepolia `11155111n`, Arbitrum `42161n` / Sepolia `421614n`, Base `8453n` /
Sepolia `84532n`, BSC `56n` / testnet `97n`, Polygon `137n` / Amoy `80002n`.

Two per-network behaviours already in `getEthFeeDataWithProvider` must survive: the `maxBigInt`
merge against ethers' own `provider.getFeeData()`, and the BSC-only floor from `getGasFeeFloor`
(`BSC_MIN_MAX_FEE_PER_GAS`, `BSC_MIN_MAX_PRIORITY_FEE_PER_GAS`). Both are lower bounds on what
the chain will relay, so they apply **per tier**. Applying them once after selection lets the
slowest choice fall below the floor.

See [Open questions](#7-open-questions-facts-to-confirm) for Gas API coverage on testnets and
for whether the tiers separate meaningfully on Arbitrum and Base.

### Out of scope

- **Memo and Nonce rows.** Their own tickets. This spec builds the section they will live in and
  stops there. `sendEthCustomNonce` stays without a UI.
- **WalletConnect.** `EthWalletConnectSendReview.svelte` keeps today's behaviour. Its own ticket.
- **Non-send EVM flows.** Swap, convert, stake and Liquidium keep the max-fee display. See
  [Pending decision 1](#8-pending-decisions-facts-are-clear-someone-needs-to-decide).
- **Non-EVM chains.** BTC and SOL fee models are unrelated.

## 3. Approach

### 3.1 Why the displayed fee has to change too

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
entirely in the priority tip. The design's own numbers confirm the intent: a spread from Normal
(`0.0012 ETH`) to Urgent (`0.002 ETH`) is not reachable under max-fee pricing.

Target: `estimated = (estimatedBaseFee + tierTip) * gas` as the displayed value, with
`maxGasFee` retained unchanged for every solvency check.

### 3.2 Gas API: return all tiers and their wait times

In `src/frontend/src/eth/rest/infura.rest.ts`, change `getSuggestedFeeData` to return the three
levels plus `estimatedBaseFee` rather than collapsing to `medium`, and carry each level's
`minWaitTimeEstimate` / `maxWaitTimeEstimate` through. Keep the existing
`parseToken({ unitName: 'gwei' })` conversion per fee value; the wait times are milliseconds,
not gwei.

Introduce the tier as a typed enum under `src/frontend/src/lib/enums/`, and keep the Gas API's
`low` / `medium` / `high` vocabulary confined to the REST layer. Nothing above it should know
the vendor's naming.

### 3.3 Fee data flow

`getEthFeeDataWithProvider` in `fee.services.ts` takes the selected tier and returns fee data
for it, plus the full per-tier set.

`EthFeeContext.svelte` already owns fetching, debouncing, the mined-transaction websocket
listener, exponential-backoff retry and visibility-change recovery. Do not build a second fetch
path. The selected tier reaches it as a **prop**, not from `SendContext`: swap, convert, stake
and Liquidium mount `EthFeeContext` too and have no send context to read.

The step must price all three tiers at once, so keep the full per-tier set beside the fee store
and re-price locally on selection rather than refetching. The re-pricing effect must track **the
choice alone**; tracking the fetched sample as well makes every fetch set the fee twice, since a
fresh fetch already applies the current tier itself.

### 3.4 Estimate vs ceiling

Add an estimated-cost derivation next to `maxGasFee` / `minGasFee` in `fee.utils.ts` and expose
it through `ETH_FEE_CONTEXT_KEY`.

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

Prefer an opt-in prop on `EthFeeDisplay` over changing its default, so the other eight call
sites are untouched by construction rather than by review diligence.

### 3.6 UI

Two surfaces, both inside the existing send modal.

**The Details section**, rendered in the send form below the destination:

- a `Details` heading with an `Expert mode` toggle on the right
  (`lib/components/ui/Toggle.svelte`)
- `Estimated fee (i)` with the amount and its fiat value
- an info banner, "Fee will be paid in ETH. Available: 0.01 ETH", dismissible via an `x`
- a `Priority (i)` row: the current tier's name on the right, then a blue `Edit >`

Note the banner answers a question left open in v1: `lib/components/send/SendFeeInfo.svelte`
already renders a `MessageBox` when the fee symbol differs from the send-token symbol, using
`send.info.fee_info`. Reuse it here rather than adding a second component, adjusting the copy to
carry the available balance.

**The `Transaction priority` step**, a full step in the send wizard, not a popover or sheet:

- back arrow, centred `Transaction priority` title
- three radio rows, each with a name, a wait-time description, and the tier's fee in native and
  fiat
- a single full-width `Back` button in the toolbar, no `Done`: choosing a row applies it

| Tier   | Label     | Description in the design |
| ------ | --------- | ------------------------- |
| normal | Normal    | 1 minute+                 |
| fast   | Fast ⚡   | Up to 30 seconds          |
| urgent | Urgent 🔥 | Up to 15 seconds          |

The wait-time strings are static copy in the design. Do **not** derive them from the API's
`minWaitTimeEstimate` / `maxWaitTimeEstimate` without asking; see
[Pending decision 5](#8-pending-decisions-facts-are-clear-someone-needs-to-decide).

Being a wizard step, this belongs in `WizardStepsSend` (`lib/enums/wizard-steps.ts`) alongside
`SEND`, `REVIEW` and the rest, and is routed in `EthSendTokenWizard.svelte` exactly like the
existing steps. That is a better fit than the v1 approach and needs no new modal primitive.

There is no `type="radio"` anywhere in `src/frontend/src` today, so the option list is new.
Build it as a keyboard-accessible radio group; `lib/components/ui/Checkbox.svelte` is the local
precedent for input semantics (note its deliberate one-way `checked` mirroring), and
`docs/ai/frontend/i18n-and-a11y.md` governs. No bare clickable `<div>`s.

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

Needed: the `Details` heading, the `Expert mode` toggle label, the `Priority` row label, the
step title, the three tier names and their wait-time descriptions, and the tooltips.

`fee.text.max_fee_eth` is present in 17 locale files and is still used by
`EthWalletConnectSendReview` **and** by the flag-off send path, so it must not be deleted. Add a
new key rather than repurposing it.

Beware `fee.text.prioritization_fee` ("Priority fee") already exists and means something else.
Pick key names that will not be confused with it.

## 4. PR split

Three PRs, each atomic per `AGENTS.md` commandments 2 and 3.

**PR1 `feat(frontend): show the estimated fee for EVM sends`**

- `getSuggestedFeeData` returns `estimatedBaseFee` alongside the medium tier
- estimated-cost derivation in `fee.utils.ts`, exposed via `eth-fee.store.ts`
- send flow renders the estimate behind the flag, relabelled "Estimated fee"; flag off keeps
  "Max fee"
- every solvency check stays on `maxGasFee`
- no tier UI yet; still pinned to Normal

**PR2 `feat(frontend): add the details section to the EVM send form`**

- the flag itself
- `Details` heading, `Expert mode` toggle, the fee row and the ETH-fee banner moved into it
- `Priority` row rendering the current tier with a non-functional `Edit` affordance is
  acceptable here only if PR3 lands immediately after; otherwise fold the row into PR3

**PR3 `feat(frontend): let the user choose the priority for EVM sends`**

- all three tiers returned from the Gas API, vendor naming confined to the REST layer
- tier state in `SendContext`, default Normal
- the `Transaction priority` wizard step, wired to `Edit`
- selection drives the fee data and therefore what gets signed
- tier added to send analytics metadata

`PRODUCT.md` is updated in whichever PR changes the behaviour it describes, never afterwards.

## 5. `PRODUCT.md`

Extend "### Transaction fees" under "## Ethereum". State that the fee shown is the expected cost
rather than the ceiling and that the ceiling still governs affordability; that the user can
choose a priority; the default; that it is per-send; which chains offer it; and that it is
currently limited to local and staging builds. Keep the deliberate negative statements: the
choice does **not** apply to WalletConnect requests, nor to swap, convert or stake flows.

## 6. Tests

See `docs/ai/frontend/testing.md`. Existing specs that will need updating rather than replacing:
`tests/eth/services/fee.services.spec.ts`, `tests/eth/rest/infura.rest.spec.ts`,
`tests/eth/components/fee/EthFeeContext.spec.ts`,
`tests/eth/components/fee/EthFeeDisplay.spec.ts`,
`tests/eth/components/send/EthSendForm.spec.ts`,
`tests/eth/components/send/EthSendTokenWizard.spec.ts`,
`tests/eth/services/eth-open-crypto-pay.services.spec.ts`.

Note `EthSendForm.spec.ts` and `EthSendReview.spec.ts` both assert on a hardcoded substring of
`max_fee_eth` because the key contains HTML; those assertions break by design when the label
changes, and now need a case per flag state.

New coverage worth having:

- both flag states: with the flag off, no Details section and the old label; with it on, the new
  section
- tier to `low`/`medium`/`high` mapping, including that the app-level enum does not leak the
  vendor names
- the estimate util, particularly that it is strictly below `maxGasFee` for the same input
- BSC floor and the ethers `maxBigInt` merge applied per tier, not once
- selecting a tier changes what `EthSendTokenWizard` passes to `executeSend`
- the default is Normal on open, and the step's back navigation preserves the selection
- keyboard operability of the radio group

Do not add Playwright specs: `e2e/` is maintenance-only per `AGENTS.md`.

Run `npm run format`, `npm run lint -- --max-warnings 0`, `npm run check`, `npm run test` and
`npm run check:tests` before pushing. No Rust changes.

> `npm run test` currently exits non-zero locally with `Worker exited unexpectedly` even when
> every test passes. This is **pre-existing**, reproducible on a docs-only branch off `main`.
> Confirm with `--reporter=json --outputFile` and check `numFailedTests` before treating a red
> run as a real failure.

## 7. Open questions (facts to confirm)

1. **Does the Expert mode toggle gate the Priority row?** Every exported v2 frame shows the
   toggle **on**. No frame of the toggle-off state was found, so it is unknown whether Priority
   is hidden with it off, or whether the toggle only reveals Nonce. This changes who can reach
   the feature at all.
2. **Mobile.** No mobile v2 frame was found. v1 used a bottom sheet; v2's step-based shape may
   simply work on both, but this needs confirming before build.
3. **Gas API coverage per chain.** Does `suggestedGasFees` answer for all ten chain IDs in
   section 2, in particular the testnets? Today a non-OK response throws, is caught in
   `EthFeeContext.updateFeeData`, and produces a `fee.error.cannot_fetch_gas_fee` toast plus
   backoff retry. If some chains 404, the row needs a defined fallback rather than an error toast
   on every send. **Not yet verified: the check could not run from the dev sandbox (no outbound
   network).**
4. **Do the tiers separate on L2s?** On Arbitrum and Base the priority fee is negligible and cost
   is dominated by L1 data availability. If the tiers come back near-identical there, a
   three-way choice showing three identical amounts is worse than none. Needs a real API sample
   per chain. **Also blocked on the same sandbox limitation.**

## 8. Pending decisions (facts are clear, someone needs to decide)

1. **Blast radius of the estimate.** Send flow only (3 label call sites), or all 11
   `EthFeeDisplay` consumers? This spec assumes send-only.
2. **`minGasFee` is arguably wrong today.** It is `maxPriorityFeePerGas * gas`, which omits the
   base fee entirely, so it is not a meaningful lower bound, yet it gates the native-ETH
   insufficient-funds check in `EthSendAmount.customValidate`. The estimate this spec introduces
   is the correct version of what it was reaching for. Fold the repair in, split it into its own
   `fix` PR, or leave it? It is a real user-facing bug: a native ETH send can pass validation and
   then fail to cover its own base fee.
3. **Which `gas` prices the displayed estimate** for ERC-20: the padded limit that gets signed,
   or an unpadded estimate? The padded one keeps display and signing consistent but inflates the
   estimate by 50%. The unpadded one is more honest but means two gas numbers in flight.
4. **Persistence.** Does the choice reset to Normal on every send, or persist for the session or
   across sessions? The ticket says only that the default is Normal. This spec assumes per-send.
5. **Wait-time copy: static or live?** The design hardcodes "1 minute+", "Up to 30 seconds",
   "Up to 15 seconds", but the API returns real `minWaitTimeEstimate` / `maxWaitTimeEstimate` per
   tier. Static is simpler and matches the design; live is more honest and varies by chain, which
   matters given open question 4. This spec assumes static.

## 9. What changed from the v1 revision

Recorded because an implementation against v1 exists and must be reworked, not extended.

|                           | v1 (superseded)                                                      | v2 (this spec)                                                           |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Entry point               | always-visible `Priority` row in the form                            | `Priority` row inside a `Details` section behind an `Expert mode` toggle |
| Picker                    | collapsible in place on desktop, bottom sheet on mobile, with `Done` | a full `Transaction priority` wizard step with `Back`                    |
| Tier names                | Slow / Normal / Fast                                                 | **Normal / Fast / Urgent**                                               |
| Descriptions              | May take hours / Recommended / Prioritized                           | **1 minute+ / Up to 30 seconds / Up to 15 seconds**                      |
| Default                   | Normal (the middle tier)                                             | Normal (now the **slowest** tier)                                        |
| Emoji                     | 🐢 ⚡ 🔥                                                             | none, ⚡, 🔥                                                             |
| "Fee paid in ETH" message | designer's open question                                             | shipped in the design, with the available balance                        |
| Neighbours                | Memo and Nonce were separate tickets, unrelated                      | same `Details` section, same `Edit` pattern                              |
| Feature flag              | none                                                                 | `LOCAL \|\| STAGING`                                                     |

The default moving to the slowest tier is the substantive behaviour change: under v1 a user who
touched nothing got the middle tier, under v2 they get the cheapest and slowest.
