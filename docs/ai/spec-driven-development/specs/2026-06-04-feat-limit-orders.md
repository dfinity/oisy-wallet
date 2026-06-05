# Spec: Limit Orders via dfinity/dex

## What we're building

Let users place and manage limit orders on the `dfinity/dex` on-chain order book DEX, directly from the oisy wallet. This is an integration — order matching runs inside the DEX canister. Oisy provides the UX.

---

## Scope (v1)

- Deposit tokens to the DEX
- Place a limit order
- View all active orders (Pending + Open) with live status
- Cancel an open order
- Withdraw tokens from the DEX
- DEX-held balances count toward the user's total net worth in the hero element

Not in v1: order expiry, market orders, order book depth view, multiple DEX integrations.

---

## DEX integration

### Canister

| | |
| ---------------- | ----------------------------- |
| Display name | OISY DEX |
| Repo | `dfinity/dex` (private) |
| Staging canister | `proc5-daaaa-aaaar-qb5va-cai` |
| Mainnet canister | TBD — update when deployed |

The full Candid interface is at `canister/dex.did` in the `dfinity/dex` repo.

### Key concepts

**Deposit-first model.** Users must deposit tokens to the DEX before trading. The DEX tracks internal balances per user and token: `free` (available to trade or withdraw) and `reserved` (locked by open orders).

Depositing requires two steps: first `icrc2_approve` on the token's ledger (authorising the DEX to pull funds), then `deposit` on the DEX. Both steps charge a ledger fee, so the approval must cover `amount + ledger_fee`.

**Asynchronous matching.** `add_limit_order` returns an `OrderId` immediately. The matching engine processes orders on the next timer tick. Clients must poll `get_order_status` to observe the lifecycle: `Pending → Open → Filled / Canceled`.

**Orders need a price and quantity.** Price is in quote-token units per base-token unit and must be a positive multiple of the pair's `tick_size`. Quantity is in base-token units and must be a positive multiple of `lot_size`. Both values come from `get_trading_pairs`.

### Relevant canister methods

```
// Discovery
get_trading_pairs() → vec TradingPairInfo // pairs, tick_size, lot_size
list_supported_tokens() → vec Token // symbol, decimals
get_order_book_ticker(pair) → { bid, ask } // best bid/ask prices

// Balances
get_balances(null) → { token, balance: { free, reserved } } for all tokens with non-zero balance
get_balances(opt filter) → same, filtered to specific tokens

// Lifecycle
deposit(token, amount) → Ok | Err (requires prior icrc2_approve)
withdraw(token, amount) → Ok | Err
add_limit_order(pair, side, price, quantity) → Ok(OrderId) | Err
cancel_limit_order(orderId) → Ok(OrderRecord) | Err
get_order_status(orderId) → Pending | Open | Filled | Canceled | NotFound
```

### Listing user orders (v1 fallback)

There is currently no canister method that returns all orders for a user — `get_order_status` requires a known `OrderId`. A paginated `get_user_orders` query is being added to `dfinity/dex` over two PRs:

- [`dfinity/dex#111`](https://github.com/dfinity/dex/pull/111) — adds the per-user order index (PR 2 of 3).
- A follow-up PR will expose the paginated query (PR 3 of 3).

**v1 does not depend on the new endpoint.** When the user places an order, oisy persists the returned `OrderId` locally and polls each known order via `get_order_status`. The paginated query will be adopted as a follow-up once shipped, replacing the local-only listing.

---

## Navigation context

The top-level navigation stays unchanged: **Assets · Activity · Earn · Explore** (Settings moves to the user menu). There is no new top-level Trade page.

This feature adds one new surface:

| Surface | Type | Purpose |
| ------------------------------- | ----------- | ----------------------------------------------------------------- |
| **Trading tab** (inside Assets) | Status view | "Where is my money?" — DEX deposits and active orders at a glance |

The existing **"Swap" hero button** opens a combined Trade modal with two tabs: **Swap** (default) and **Limit order**. This is the primary entry point for all trading actions. The modal is the same component regardless of which tab is selected — switching tabs preserves token context and updates amounts accordingly.

Lend & Borrow (coming later) follows the Earn pattern, not Trade.

---

## Where it lives

### Trading tab (Assets)

A new **Trading** tab on the Assets view, alongside Tokens, NFTs, and Earning. Gated by a feature flag, disabled in production until ready.

There is no separate top-level Trade page. The Trading tab is the single home for all trading status and management. The "Swap" hero button opens the combined Trade modal (see Order placement form section).

The tab begins with a one-line description and a "Learn more" link.

It contains two sections:

**My assets**
Shows tokens deposited on trading providers, with free balance, reserved balance, and fiat equivalent per row. The provider name is shown as a subtitle on each row. A "+ Deposit" link in the section header opens the Deposit flow. Each row has a "Withdraw" inline link.

**Orders**
Tabbed: **Active** (Pending + Open) and **History** (Filled + Cancelled). Each row shows pair (e.g. ICP → ckUSDC), provider, price, amount, and status. A "+ Limit order" link in the section header opens the Trade modal with the Limit Order tab selected. No filter in v1.

**Three states:**

_New user_ — no assets, no orders:

- My assets: empty row with a prominent "Deposit" button.
- Orders header: "+ Limit order" is greyed out (disabled — requires assets first).
- Active tab: "No active orders" with no CTA.

_Has assets, no orders:_

- My assets: token rows with Withdraw actions.
- Orders header: "+ Limit order" becomes active (link).
- Active tab: "No active orders" with a "Limit order" button.

_Has assets and orders:_

- My assets: token rows with Withdraw actions.
- Active tab: order rows with status pills.
- History tab: filled and cancelled orders.

### Hero net-worth total

DEX balances (`free + reserved`) are included in the total net worth in the hero element. Tokens deposited to the DEX do **not** appear in the Tokens tab list — they are visible only in the Trading tab. The hero total must remain accurate.

---

## Order placement form

A single form used from multiple entry points. Always modal.

Layout follows oisy's existing swap form: amount on the left (left-aligned), token selector pill on the right.

### Fields (in order, top to bottom)

1. **You pay** — amount input on the left, token selector on the right. Shows DEX free balance and wallet balance for the selected token, plus fiat equivalent of the entered amount.

2. **You receive** — same layout. Amount and fiat equivalent shown. Token selector on the right.

3. **Price section** — a separate block below the two token fields. Contains:
   - **Dynamic label**: see label logic below.
   - **Quick-set text links**: Spot · +1% · +5% — sets the price relative to current market. Active selection shown in bold without underline.
   - **Reciprocal toggle** (icon button): flips the price display between pay-token-per-receive-token and receive-token-per-pay-token (i.e. the reciprocal value). Same underlying price, different display direction.
   - **Lock toggle** (icon button): when locked, changing "You receive" adjusts "You pay" while keeping the price fixed. When unlocked (default), changing "You receive" adjusts the price while keeping "You pay" fixed. Changing "You pay" always updates "You receive" regardless of lock state. When locked, the price section shows a subtle highlight and a hint line: "Price pinned — changing receive amount updates what you pay."
   - **Price input** — large editable number. Changing it always updates "You receive" and keeps "You pay" fixed.
   - **Price unit** — e.g. "ckUSDC / ICP" or "ICP / ckUSDC" depending on reciprocal state.
   - **Value difference** — shown inline on the right of the price value: `(fiat value of receive − fiat value of pay) / fiat value of pay` as a percentage with colour coding (green positive, amber negative, red below −5%).
   - **Market reference** — small text below price: "market 2.69 ckUSDC / ICP".
   - **Below-market warning** — shown instead of market reference when the order will fill immediately (see label logic).

4. **DEX selector** — enabled only after both tokens are chosen. Shows available DEXes for the pair with current ask price per DEX.

A flip button between "You pay" and "You receive" lets the user reverse direction.

### Price label logic

The dynamic label and warning depend on two factors: which token is currently shown in the price display, and whether the limit price is above or below market in that display direction.

| Price display | vs market | Label | Warning |
| ------------- | ------------ | --------------------------------------- | --------------------------------------------------------------------------- |
| Pay token | above market | "When 1 [pay token] reaches" | none |
| Pay token | below market | "When 1 [pay token] is at least" | "This price is below market — your order will fill almost immediately. You'll receive approximately $X less than at market price." |
| Receive token | above market | "When 1 [receive token] is at most" | "This price is below market — your order will fill almost immediately. You'll receive approximately $X less than at market price." |
| Receive token | below market | "When 1 [receive token] dropped to" | none |

Notes on the label choice:
- "reaches" implies waiting for the price to rise to the target — correct when the limit is above market.
- "is at least" and "is at most" reflect a condition that is already met (>= / <=) — correct when the limit is below market and the order will fill immediately.
- "dropped to" implies waiting for the price to fall to the target — correct when the receive-token price needs to decrease.

The warning replaces the market reference line when shown. It includes the approximate fiat loss (e.g. "$5.38 less") so the user understands the cost of the decision. The warning is amber when value difference is between −5% and 0%, and red when below −5%.

### Below-market confirmation

- **Value difference < 0%**: warning shown on form and review steps. No checkbox required — the user can still proceed.
- **Value difference < −5%**: warning shown on form and review steps. On the review step, a confirmation checkbox is required before "Place order" is enabled. The checkbox and warning are combined into a single box. This matches the existing swap behaviour for significant value differences.

On the form step the warning text reads: **"This price is below market — your order will fill almost immediately. You'll receive approximately $X less than at market price."**

On the review step the warning text reads: **"The specified price is below market — your order will fill almost immediately. You'll receive approximately $X less than at market price."** (refers to the limit price row visible directly above it).

### Pay / receive / price linkage

Three values are always linked: pay amount, receive amount, price. Editing any one recomputes one of the others:

- **Change pay amount** → receive updates (price stays). Always, regardless of lock.
- **Change price** → receive updates (pay stays). Always, regardless of lock.
- **Change receive amount, lock off** → price updates (pay stays).
- **Change receive amount, lock on** → pay updates (price stays).

**Lot size rounding.** `lot_size` constrains the base token quantity (e.g. ICP in an ICP/ckUSDC pair). The rounding always applies to the base token amount regardless of which field the user typed into. When the user enters a quote token amount that produces a non-integer base amount, the base is rounded down to the nearest valid lot size multiple and both fields update to reflect the rounded values. The user always sees the final rounded amounts before confirming.

### Language

Use "You pay" and "You receive" — matching oisy's existing swap UI labels exactly. Avoid "Buy/Sell" and "Base/Quote".

### Constraint rules

The form flows strictly top to bottom. No field affects fields above it.

The "You pay" field always shows both balances: DEX free balance and wallet balance. Both are shown at all times — the wallet balance is context for how much more the user could deposit if needed.

**Fiat values** are shown in the user's selected currency throughout the form: pay amount, receive amount, price, and market reference all show fiat equivalents. Fiat conversion uses the same price feeds and currency setting as the rest of oisy.

- **"You pay" token selected** → "You receive" selector shows only tokens that form a valid pair across all integrated DEXes. DEX selector remains disabled.
- **"You receive" token selected** → DEX selector becomes enabled, showing only DEXes that have the pair, with best ask price per DEX.
- **DEX selected** → Price section becomes active.

**When "You pay" token changes after "You receive" and/or DEX are already filled:**

- Keep "You receive" if it still forms a valid pair with the new token. Clear it otherwise.
- Keep DEX if the new pair is still available on it. Clear it otherwise.
- Always show cleared fields visually in their empty/placeholder state. Never silently retain an invalid value.

The same cascading rule applies when "You receive" changes: clear DEX if the new pair is not available on it.

### Entry points

**Flow A — no pre-fill.** User opens the form without a specific position in mind (e.g. from a global "Trade" button). All three selectors start empty. User fills them top to bottom.

**Flow B — position pre-fill.** User clicks "+ Limit order" from the Trading tab with a specific token in context. "You pay" token and DEX arrive pre-filled and locked. "You receive" selector is the only one the user needs to choose, constrained to pairs available on that DEX. The flip button is still available to switch direction.

Both entry points use the same form. The only difference is which fields arrive pre-filled and locked.

### Insufficient balance

If the user's DEX free balance for the "You pay" token is less than the order requires, show the shortfall clearly and offer an inline deposit step before confirming. The user sees the deposit as an explicit action, not a hidden side effect.

### Wizard steps

The Limit Order tab follows the same wizard pattern as the existing swap flow: **Form → Review → Progress**.

**Form step** — the full form described above. Button label: "Review".

**Review step** — mirrors `SwapReview`. Shows:

- Token amounts: "You pay X ICP / You receive Y ckUSDC" (same `TokensReview` component as swap).
- Limit price row: "When 1 ICP reaches 2.75 ckUSDC" with market reference.
- Value difference (same `SwapValueDifference` component).
- DEX row: "OISY DEX".
- If value difference is below 0%: warning box shown (amber or red depending on severity). If below −5%, a confirmation checkbox is required inside the same box before "Place order" is enabled.
- Back + "Place order" buttons.

**Progress step** — single step: submitting the order to the DEX. On success, closes the modal and the order appears in the Trading tab Active Orders with status Pending. Status updates via polling.

---

## Deposit flow

Triggered from: "+ Deposit" link in the Trading tab, or inline when placing an order with insufficient balance.

The flow mirrors the Harvest Autopilot stake wizard pattern: Form → Review → Progress.

**Form step:**

- Token selector (only tokens the DEX supports that the user holds in their wallet).
- Amount input with wallet balance shown below and fiat equivalent.
- Transaction fee row (collapsible, same pattern as swap fees): collapsed header shows total in fiat ("Transaction fee · <$0.01"), expands to show individual lines ("Approval fee · 0.0001 ICP" and "Transfer fee · 0.0001 ICP").
- Agreement checkbox: "I understand my tokens will be held by the OISY DEX canister and are subject to on-chain smart contract risk." Review button is disabled until checked.

**Review step:**

- Hero: token amount and fiat equivalent.
- "To: OISY DEX" row.
- Transaction fee (collapsible, same as form).
- No "You deposit" summary row — the hero already shows the deposited amount and the fee is charged on top, not deducted from it.
- Back + Deposit buttons.

**Progress step:**

- Step 1: Approving (ICRC-2 approve on the token ledger).
- Step 2: Depositing (DEX deposit call).
- Done.

---

## Withdraw flow

Triggered from: "Withdraw" link on a token balance row in the Trading tab.

The flow mirrors deposit: Form → Review → Progress.

**Form step:**

- Token pre-selected from context (no selector shown).
- Amount input with fiat equivalent.
- Free balance shown as a clickable shortcut that fills the input with the free amount. This is the maximum withdrawable amount — the user cannot withdraw more than their free balance.
- Reserved balance shown below as context (e.g. "100 ICP reserved") with a tooltip: "Locked by open orders. Cancel orders to free this balance."
- Transaction fee row (collapsible): single "Transfer fee · 0.0001 ICP".

**Review step:**

- Hero: amount and fiat.
- "From: OISY DEX" row.
- Transaction fee (collapsible).
- "You receive" row: amount − transfer fee, with fiat equivalent. Unlike deposit, the fee is deducted from the withdrawal amount, so the received amount is less than entered.
- Back + Withdraw buttons.

**Progress step:**

- Single step: Withdrawing → Done.

---

## Cancel order flow

Triggered from: Cancel action on an order row in the Active Orders section of the Trading tab.

Show a confirmation step to prevent accidental cancels. On confirm, reserved funds return to free balance and the order is removed from the active list.

---

## Active orders

Shows all orders with status Pending or Open for the connected user on a given DEX.

Each row shows: pair, direction (You pay → You receive), price, amount, status (Pending with spinner, or Open), and a Cancel button.

Status is refreshed by polling while the Trading tab is visible. When an order transitions to Filled or Canceled it moves from the Active tab to the History tab.

---

## Acceptance criteria

- [ ] Trading tab is visible (when feature flag is on) and navigates correctly.
- [ ] DEX-deposited tokens are not shown in the Tokens tab list.
- [ ] Hero net-worth total includes DEX free + reserved balances.
- [ ] Trading tab new user state: "My assets" shows empty row with Deposit button; "+ Limit order" is disabled.
- [ ] Trading tab assets-only state: "+ Limit order" becomes active; orders shows "No active orders" with Limit order button.
- [ ] Trading tab full state: asset rows with Withdraw links; order rows with status pills and History tab.
- [ ] Deposit flow completes with two visible steps (Approve → Deposit).
- [ ] "Swap" hero button opens the combined modal with Swap as the default tab.
- [ ] Switching between Swap and Limit Order tabs preserves token context and recalculates amounts.
- [ ] Form layout: amount left-aligned on the left, token selector on the right — matching oisy swap form.
- [ ] Labels are "You pay" and "You receive".
- [ ] DEX selector is disabled until both tokens are selected.
- [ ] Changing pay token clears receive token and/or DEX when no longer valid; keeps them when still valid.
- [ ] Cleared fields are visually empty — no silent stale values.
- [ ] Price section is a separate block below the two token fields.
- [ ] Quick-set text links (Spot · +1% · +5%) set the price relative to current market; active selection shown in bold without underline.
- [ ] Reciprocal toggle flips the price display between the two token directions.
- [ ] Dynamic label reflects pay/receive token perspective and above/below market correctly: "reaches" / "is at least" / "is at most" / "dropped to".
- [ ] Below-market warning (amber) shown when value difference < 0%; replaces market reference line; includes fiat loss amount.
- [ ] Below-market warning turns red when value difference < −5%.
- [ ] Value difference shown inline on the right of the price value, with colour coding (green / amber / red below −5%).
- [ ] On review, if value difference < 0%: warning box shown. If < −5%: confirmation checkbox required inside the same box before "Place order" is enabled.
- [ ] Lock toggle: when locked, changing receive updates pay (price stays); when unlocked, changing receive updates price (pay stays).
- [ ] Changing pay always updates receive regardless of lock state.
- [ ] Changing price always updates receive regardless of lock state.
- [ ] "You pay" field shows both DEX free balance and wallet balance at all times.
- [ ] Fiat equivalents shown for pay amount, receive amount, and price.
- [ ] Base token amount is always rounded down to the nearest lot size multiple after any input change.
- [ ] Both pay and receive fields update to reflect rounded values before the user confirms.
- [ ] Confirm is blocked when DEX free balance is insufficient; inline deposit is offered instead.
- [ ] Limit Order tab follows Form → Review → Progress wizard steps.
- [ ] Review step shows token amounts, limit price, value difference, DEX, and warning/checkbox when applicable.
- [ ] Placed order appears immediately in Trading tab Active Orders with status Pending.
- [ ] Active orders update via polling without requiring a page reload.
- [ ] Cancel returns reserved funds to free balance.
- [ ] Flow B pre-fills DEX and "You pay" token from the position context.

---

## Open questions

1. **Mainnet canister ID** — fill in once the DEX is deployed to mainnet.
2. **Token logos** — `list_supported_tokens` returns symbol and decimals but no logo URL. Confirm whether the existing oisy token registry covers all DEX-listed tokens, or whether a fallback is needed.
3. **USD price feeds** — confirm that all DEX-listed tokens already have USD price data in the existing price store (needed for the hero total).
