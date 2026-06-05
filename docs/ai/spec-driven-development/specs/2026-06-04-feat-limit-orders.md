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

|                  |                               |
| ---------------- | ----------------------------- |
| Display name     | OISY DEX                      |
| Repo             | `dfinity/dex` (private)       |
| Staging canister | `proc5-daaaa-aaaar-qb5va-cai` |
| Mainnet canister | TBD — update when deployed    |

The full Candid interface is at `canister/dex.did` in the `dfinity/dex` repo.

### Key concepts

**Deposit-first model.** Users must deposit tokens to the DEX before trading. The DEX tracks internal balances per user and token: `free` (available to trade or withdraw) and `reserved` (locked by open orders).

Depositing requires two steps: first `icrc2_approve` on the token's ledger (authorising the DEX to pull funds), then `deposit` on the DEX. Both steps charge a ledger fee, so the approval must cover `amount + ledger_fee`.

**Asynchronous matching.** `add_limit_order` returns an `OrderId` immediately. The matching engine processes orders on the next timer tick. Clients must poll `get_order_status` to observe the lifecycle: `Pending → Open → Filled / Canceled`.

**Orders need a price and quantity.** Price is in quote-token units per base-token unit and must be a positive multiple of the pair's `tick_size`. Quantity is in base-token units and must be a positive multiple of `lot_size`. Both values come from `get_trading_pairs`.

**Maker/taker fee model.** Each trading pair has a maker fee and a taker fee, both in basis points (1 bps = 0.01%). The fee is deducted from the proceeds at fill time, in the asset the side receives. For a sell order (receiving quote tokens), the fee is deducted from the quote amount received:

- **Maker** (order rests in the book, fills later): `proceeds × maker_fee_bps / 10_000` deducted from received amount.
- **Taker** (order crosses an existing order immediately): `proceeds × taker_fee_bps / 10_000` deducted. Taker fee is typically higher.

At order placement time, oisy cannot know whether the order will fill as maker or taker. The "You receive" amount shown in the form and review is therefore the **gross amount before fees**. The actual received amount will be slightly less.

**Important gap**: `TradingPairInfo` (returned by `get_trading_pairs`) does not currently include `maker_fee_bps` or `taker_fee_bps`. These must be added by the DEX team before oisy can display specific fee rates. See Open questions.

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

| Surface                         | Type        | Purpose                                                           |
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

The hero shows only the total balance figure — no breakdown label, no "includes DEX deposits" annotation. The total speaks for itself.

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

| Price display | vs market    | Label                               | Warning                                                                                                                            |
| ------------- | ------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Pay token     | above market | "When 1 [pay token] reaches"        | none                                                                                                                               |
| Pay token     | below market | "When 1 [pay token] is at least"    | "This price is below market — your order will fill almost immediately. You'll receive approximately $X less than at market price." |
| Receive token | above market | "When 1 [receive token] is at most" | "This price is below market — your order will fill almost immediately. You'll receive approximately $X less than at market price." |
| Receive token | below market | "When 1 [receive token] dropped to" | none                                                                                                                               |

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

### Field linkage and rounding rules

Three values are always linked: "You sell", "You buy", and price. The relationship is always `quote = base × price`, where the base token may be in either "You sell" or "You buy" depending on the trade direction (flip).

**Two constraints apply:**

- The **base token amount** must be a positive multiple of `lot_size` — always rounded down.
- The **price** must be a positive multiple of `tick_size` — always rounded down.
- The **quote token amount** is always derived and has no constraint of its own.

**Rules by edited field:**

The base token field and price field are the two primary inputs. The quote token field is always the output — it is recomputed last after all rounding is applied.

| What user edits   | Base direction | Lock   | What happens                                                                                   |
| ----------------- | -------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Base token field  | either         | either | Round base to lot_size. Recompute quote = rounded_base × price.                                |
| Price field       | either         | either | Round price to tick_size. Recompute quote = base × rounded_price.                              |
| Quote token field | either         | off    | Derive price = quote ÷ base. Round price to tick_size. Recompute quote = base × rounded_price. |
| Quote token field | either         | on     | Derive base = quote ÷ price. Round base to lot_size. Recompute quote = rounded_base × price.   |

**Decorations** — shown inline below the relevant field when rounding causes a visible difference:

- Base token field: "→ Order quantity: X [token]" (amber) when the entered value is not a valid lot_size multiple.
- Price field: "→ Rounded to: X" (amber) when the entered or derived price is not a valid tick_size multiple.
- Quote token field: "→ Actual: X [token]" (blue) when the final computed quote differs from what the user typed, due to rounding of base or price.

All downstream calculations (value difference, fiat equivalents, review step values) always use the rounded values, not the raw input.

**Interaction timing — live vs. blur:**

- **On input** (as the user types): fields recalculate live. The derived field updates immediately. No rounding is applied yet — the user may still be mid-entry.
- **On blur** (when the user leaves a field): rounding constraints are checked. If any value violates lot_size or tick_size, or the derived field no longer matches:
  1. The **Review button is disabled**.
  2. An **apply box** appears listing all the changes that will be made (e.g. "You sell: 10.15 → 10.1 ICP (lot size 0.1)").
  3. A **"Use these values"** button in the box, when clicked, updates all fields to the rounded values, hides the box, and re-enables Review.

The apply box is dismissed and Review re-enabled only after the user explicitly confirms the rounded values. This prevents accidentally submitting an order with values that don't match what the DEX will accept.

Note: when the user clicks Review while a field is focused, the browser fires blur before the click. The blur triggers the apply box and disables Review, so the click lands on a disabled button. The user sees the apply box and must confirm before proceeding. This is the correct outcome.

See the interactive HTML wireframe [`2026-06-04-feat-limit-orders/wireframes/rounding-demo.html`](./2026-06-04-feat-limit-orders/wireframes/rounding-demo.html) for a live demonstration of all 8 cases (4 edit scenarios × 2 base directions).

**Lot size rounding.** `lot_size` constrains the base token quantity (e.g. ICP in an ICP/ckUSDC pair). The rounding always applies to the base token amount regardless of which field the user typed into. When the user enters a quote token amount that produces a non-integer base amount, the base is rounded down to the nearest valid lot size multiple and both fields update to reflect the rounded values. The user always sees the final rounded amounts before confirming.

**Tick size rounding.** `tick_size` constrains the price in quote-per-base terms (e.g. ckUSDC per ICP). The DEX always stores and validates price in this canonical direction. When the user enters a price via the reciprocal display (e.g. ICP per ckUSDC), the value must be converted back to quote-per-base and rounded to the nearest valid `tick_size` multiple before submission. Both the reciprocal display and the canonical price update to reflect the rounded value. The user always sees the rounded price before confirming.

### Language

The Limit Order tab uses **"You sell"** and **"You buy"** — not "You pay" / "You receive". This distinction matters because "You receive" is reserved for the net post-fee amount, which cannot be shown as a single value at placement time (maker vs taker is unknown until fill). "You buy" clearly expresses the gross target amount the order is priced to achieve.

The Swap tab continues to use "You pay" / "You receive" (existing behaviour unchanged).

### Token selection and pairing rules

Both "You sell" and "You buy" token selectors open a token selector modal. The selection is symmetrical — either token can be chosen first.

**Default filter.** When neither token is selected, both selectors show only tokens that appear in at least one CLOB pair on the integrated DEXes.

**After one token is selected.** The other selector is further filtered to tokens that form a valid pair with the already-selected token.

**"Show all tokens" toggle.** Inside the token selector modal (not on the main form), a "Show all tokens" toggle removes the pairing filter and shows the full DEX-supported token list. If the user picks a token that has no valid pair with the already-selected token, the other token field and its amount are both cleared. The main form always shows the filtered view — "show all tokens" is only visible inside the modal.

**Cascade clear on change.** When either token changes and the other no longer forms a valid pair, the other token and its entered amount are cleared. Cleared fields are shown in their empty/placeholder state — no silent stale values.

**DEX selector.** Enabled only after both tokens are selected. Shows only DEXes that support the chosen pair, with best ask price per DEX.

**Price section.** Becomes active after a DEX is selected.

**Fiat values** are shown in the user's selected currency throughout the form: sell amount, buy amount, price, and market reference all show fiat equivalents. Fiat conversion uses the same price feeds and currency setting as the rest of oisy.

The "You sell" field always shows both balances: DEX free balance and wallet balance. Both are shown at all times — the wallet balance is context for how much more the user could deposit if needed.

### Entry points

**Flow A — no pre-fill.** User opens the form without a specific position in mind (e.g. from a global "Trade" button). All three selectors start empty. User fills them top to bottom.

**Flow B — position pre-fill.** User clicks "+ Limit order" from the Trading tab with a specific token in context. "You pay" token and DEX arrive pre-filled and locked. "You receive" selector is the only one the user needs to choose, constrained to pairs available on that DEX. The flip button is still available to switch direction.

Both entry points use the same form. The only difference is which fields arrive pre-filled and locked.

### Fee display

The "You buy" amount always shows the **gross amount before fees**. Fees are deducted from proceeds at fill time. Whether the order fills as maker or taker is not known at placement time — it depends on the order book state at execution.

**On the form** — the DEX selector row is expandable (same pattern as swap fees). Collapsed it shows the DEX name and the CLOB best ask (labelled "best ask", clearly distinct from the oisy price feed market reference shown in the price section). Expanded it shows two lines:

- "Maker fee · 0% (No fee)" — shown in green when 0 bps
- "Taker fee · 0.05% (5 bps)"

Fee rates come from `maker_fee_bps` / `taker_fee_bps` in `TradingPairInfo` once available (see Open questions). Until then, show a static note in the expanded section.

**Market reference vs CLOB price** — the price section shows "market X (oisy price feed)" based on oisy's own price feeds, used for value difference and label logic. The DEX expanded row separately shows "best ask Y" from the CLOB order book. These are two distinct data sources and must be labelled differently.

**On the review step** — a single "Fee (maker / taker)" row shows both rates (e.g. "0% / 0.05%"). A (?) next to the label expands a short explanation: "Fees are deducted from your proceeds at fill time. Whether your order fills as maker or taker depends on the order book state at execution and cannot be predicted." with a Learn more link. There is no "You receive" row on the review — the gross "You buy" amount is shown in the hero, and the fee row gives the context needed.

### Insufficient balance

If the user's DEX free balance for the "You pay" token is less than the order requires, show the shortfall clearly and offer an inline deposit step before confirming. The user sees the deposit as an explicit action, not a hidden side effect.

### Wizard steps

The Limit Order tab follows the same wizard pattern as the existing swap flow: **Form → Review → Progress**.

**Form step** — the full form described above. Button label: "Review".

**Review step** — title: "Review limit order". Shows:

- Hero: "You sell X ICP" and "You buy Y ckUSDC" (gross, pre-fee) with fiat equivalents.
- Limit price row with market reference: "market 2.69 (oisy price feed)".
- Value difference.
- DEX row: "OISY DEX".
- Fee row: "Fee (maker / taker) · 0% / 0.05%" with a (?) that expands an explanation and Learn more link.
- If value difference is below 0%: warning box shown (amber or red). If below −5%, a confirmation checkbox is required before "Place order" is enabled.
- Back + "Place order" buttons.

**Progress step** — single step: submitting the order to the DEX. On success, closes the modal and the order appears in the Trading tab Active Orders with status Pending. Status updates via polling.

---

## Deposit flow

Triggered from two entry points:

- **"+ Deposit" link in the Trading tab** (section header) — no token context. The token selector starts empty; the user picks any token the DEX supports that they hold in their wallet. If the user holds no DEX-supported tokens, the selector shows no options and a hint: "You don't hold any tokens supported by OISY DEX."
- **Inline from the order form** (when DEX free balance is insufficient for the order being placed) — the "You sell" token and the exact shortfall amount (required − free) are pre-filled. The deposit flow opens **directly at the Review step**, skipping the form. Note: lot_size does not apply to deposits — any transfer amount is valid; the shortfall is deposited as-is.

The flow mirrors the Harvest Autopilot stake wizard pattern: Form → Review → Progress. The inline entry point bypasses the Form step.

**Form step** (not shown for inline entry):

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
4. **Fee rates in `TradingPairInfo`** — `maker_fee_bps` and `taker_fee_bps` are currently only on `AddTradingPairRequest` (admin write endpoint) and are not queryable by clients. Request the DEX team add them to `TradingPairInfo` so oisy can display them. Until this is done, show a static fee notice instead of specific rates.
