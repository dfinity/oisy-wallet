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

Not in v1: order expiry, market orders, order book depth view, multiple DEX integrations (the UX is designed to accommodate them — see _Venue-agnostic definition_ — but only one venue ships).

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

**Deposit-first model.** Users must deposit tokens to the DEX before trading. The DEX tracks internal balances per user and token: `free` (available to trade or withdraw) and `reserved` (locked by open orders). Depositing requires two steps: first `icrc2_approve` on the token's ledger, then `deposit` on the DEX. Both steps charge a ledger fee, so the approval must cover `amount + ledger_fee`.

**Asynchronous matching.** `add_limit_order` returns an `OrderId` immediately. The matching engine processes orders on the next timer tick. Clients poll `get_order_status` to observe the lifecycle: `Pending → Open → Filled / Canceled`.

**Orders need a price and quantity.** Price is in quote-token units per base-token unit and must be a positive multiple of the pair's `tick_size`. Quantity is in base-token units and must be a positive multiple of `lot_size`. Both come from `get_trading_pairs`.

**Maker/taker fee model.** Each pair has a maker fee and a taker fee in basis points. The fee is deducted from the proceeds at fill time, **in the asset the side receives** — quote tokens for a sell, base tokens for a buy. At placement time oisy cannot know whether the order fills as maker or taker, so the amount shown is the **gross** before fees.

**Important gap:** `TradingPairInfo` does not currently include `maker_fee_bps` / `taker_fee_bps`; until the DEX team exposes them, fee rates are shown as a static notice. See Open questions.

### Relevant canister methods

```
get_trading_pairs() → vec TradingPairInfo   // pairs, tick_size, lot_size
list_supported_tokens() → vec Token         // symbol, decimals
get_order_book_ticker(pair) → { bid, ask }  // best bid/ask prices
get_balances(opt filter) → { token, balance: { free, reserved } }
deposit(token, amount) → Ok | Err           // requires prior icrc2_approve
withdraw(token, amount) → Ok | Err
add_limit_order(pair, side, price, quantity) → Ok(OrderId) | Err
cancel_limit_order(orderId) → Ok(OrderRecord) | Err
get_order_status(orderId) → Pending | Open | Filled | Canceled | NotFound
```

### Listing user orders (v1 fallback)

There is currently no method that returns all orders for a user. A paginated `get_user_orders` query is being added to `dfinity/dex` over two PRs ([`dfinity/dex#111`](https://github.com/dfinity/dex/pull/111) adds the per-user index; a follow-up exposes the paginated query). **v1 does not depend on it:** when the user places an order, oisy persists the returned `OrderId` locally and polls each via `get_order_status`. The paginated query is adopted as a follow-up.

---

## Navigation context

Top-level navigation is unchanged: **Assets · Activity · Earn · Explore**. There is no new top-level Trade page. This feature adds one surface: a **Trading tab** inside Assets ("where is my money?" — DEX deposits and active orders at a glance).

The existing **"Swap" hero button** opens a combined Trade modal with two tabs: **Swap** (default) and **Limit order**. It is the primary entry point for trading actions.

---

## Where it lives

### Trading tab (Assets)

_Wireframe: [trading-tab.html](./2026-06-04-feat-limit-orders/wireframes/trading-tab.html)_

A new **Trading** tab on the Assets view, alongside Tokens, NFTs, and Earning. Gated by a feature flag, disabled in production until ready. It begins with a one-line description and a "Learn more" link, and contains two sections:

**My assets** — tokens deposited on trading providers, with free balance, reserved balance, and fiat equivalent per row; provider name as subtitle. A "+ Deposit" link in the section header opens the Deposit flow; each row has a "Withdraw" inline link.

**Orders** — tabbed **Active** (Pending + Open) and **History** (Filled + Cancelled). Each row shows pair, provider, price, amount, and status. A "+ Limit order" link in the header opens the Trade modal on the Limit order tab.

**Three states:** _new user_ (empty assets row with a prominent Deposit button; "+ Limit order" disabled; "No active orders"); _has assets, no orders_ ("+ Limit order" active; "No active orders" with a Limit order button); _has assets and orders_ (asset rows with Withdraw; order rows with status pills; History tab).

### Hero net-worth total

DEX balances (`free + reserved`) are included in the hero net-worth total. DEX-deposited tokens do **not** appear in the Tokens tab list — only in the Trading tab. The hero shows the total figure only — no breakdown label.

---

## Order placement form (Limit order tab)

> **⚠ Two candidate form designs — a decision is required before implementation (see Open questions).** Both designs are fully specified below, side by side. Pick one before building; the unchosen option will be removed in a follow-up commit.
>
> - **Option A — Intent-based** (primary): [`trade-modal-intent.html`](./2026-06-04-feat-limit-orders/wireframes/trade-modal-intent.html)
> - **Option B — Fixed sell-buy** (alternative): [`trade-modal-sell-buy.html`](./2026-06-04-feat-limit-orders/wireframes/trade-modal-sell-buy.html)

### Option A — Intent-based design

_Wireframe: [trade-modal-intent.html](./2026-06-04-feat-limit-orders/wireframes/trade-modal-intent.html)_

A single modal form, reached from the **Swap** hero button (Limit order tab) or pre-filled from the Trading tab "+ Limit order" link. One form, fields revealed progressively as prerequisites are met.

#### Why this differs from the swap form

The swap form is direction-fixed: the top field is always what leaves your wallet ("You pay"), the bottom is what you receive. A limit order has no fixed direction — you may be **selling** a token (waiting for its price to rise) or **buying** one (waiting for its price to fall), and the price, presets, and warnings read differently depending on which. So the user **declares intent first** with a Buy/Sell control, and everything below adapts. Unlike the swap form, the top token is **not** always the one you sell.

#### Token roles and selection order

Every limit order is framed around a **base token** (the volatile asset traded) quoted against a **quote token** — matching how order-book DEXes are conventionally presented (you trade "ICP", quoted in a stablecoin). The slots have fixed roles: first = base, second = quote.

**v1 is base-first.** The quote selector is **inactive until a base is chosen** (its list depends on the base). Picking a base while no quote is set yet **chains straight into the quote picker** — one "both tokens" gesture — and on returning, focus lands in the amount field. Because the roles are fixed, the Buy/Sell control is always framed on the base regardless of how the tokens were chosen.

> _Deferred — quote-only tokens & either-order selection:_ a token that exists only as a **quote** (e.g. ckUSDC) never appears in the base list, so it cannot start an order in v1. The planned solution relaxes selection to **either order**: the user picks the quote-only token in the quote selector first (which would then list all quotes and narrow the base list afterwards). Because roles stay fixed, this is purely an input-path change — the form is unaffected, and the get/pay labels read correctly for the intent ("You pay ckUSDC → You buy ICP" when offloading ckUSDC). Tracked as a follow-up.

#### Information hierarchy

The two things the user actively sets — **base amount** and **price** — are the only editable inputs, and they are rendered as **white, bordered fields** so it is visually obvious what can be typed. Everything else (token pills, the derived amount, balances) is flat. The base and quote tokens live together in one **merged trade-pair box**; the resulting quote amount is a derived, read-only readout inside that box (plain text, not a field).

#### Layout — top to bottom

1. **Buy / Sell segmented control** — the frame for the whole form. Prominent, full-width, at the top, with a directional cue (Sell = asset out, Buy = asset in). Switching it re-labels the fields, flips the preset semantics, **resets the price to current value (0%)**, and re-derives the amount. Tokens and the base amount are preserved. There is **no flip button** — switching side is this control's job.

   _Why the price resets:_ a price sensible for one direction is usually wrong for the other. A Sell target above current value would, kept as-is on a Buy, mean "buy above current value" — an immediate-fill / overpay. The price re-anchors to current value rather than carrying a nonsensical target across.

2. **Merged trade-pair box** — one container holding both tokens, linked by a direction word so it reads as a sentence:
   - **Base row:** the **amount** (white editable field, the user's primary input) on the left with its fiat equivalent and free balance on the sub-line (see _Free balance + Max_); the base **token pill** on the right. On a **Buy**, the maker/taker fee is taken from the base received, so a "you keep slightly less, before fees" note shows here.
   - **Connector:** a thin divider carrying the direction word — **"for"** on a Sell, **"with"** on a Buy — so the box reads "Sell ICP **for** ckUSDC" / "Buy ICP **with** ckUSDC".
   - **Quote row:** the **derived amount** as **plain read-only text** (clearly not an input) — **"at least" (≥)** on a Sell, **"at most" (≤)** on a Buy — with a side-aware sub-line; the quote **token pill** on the right (opens the quote picker). Both token pills are right-aligned so choosing the two tokens is a single vertical move.

   The amount is **not an estimate** — `quote = base × price`, exact at the limit price. It is a **bound** because a limit fills at the limit price _or better_ (price improvement): a Sell receives _at least_ this much quote (could be more); a Buy pays _at most_ this much (could be less). Sub-line is side-aware because the fee lands on the asset the side receives: **Sell** → "gross, before fees" (fee reduces the quote you get); **Buy** → "max at your limit price" (a clean cap; the before-fees note lives on the base row).

   **Free balance + Max (spend-side).** Each row shows the user's **free DEX balance** of its token on the sub-line ("Free 15.4994 ICP"), so both balances are always visible for reference. Only the **spend side** carries a clickable **Max** — because the amount field is always the base, but the token you spend flips with side:
   - **Sell** (spend = base): Max sits on the **base** row. It fills the amount with the free base, floored to `lot_size` (e.g. free 15.4994 ICP, lot 0.25 → 15.25). The displayed Free is the true balance; Max fills the largest valid multiple, so it never trips validation.
   - **Buy** (spend = quote): Max sits on the **quote** row. It converts the free quote into a base amount via the price — `base = floor((freeQuote ÷ price) / lot_size) · lot_size` — so you spend as much quote as the lot grid allows (a small remainder may stay unspent; the "You pay ≤" readout shows the real spend). Max is **disabled until a price is set** (the conversion needs one); shown greyed with a "Set a price first" hint.

   The non-spend side shows its balance read-only (no Max). "Free" is the DEX free balance (reserved-by-open-orders excluded).

3. **Price section** — active once a quote token is chosen.
   - **Dynamic label** (see Price label logic).
   - **Quick-set links**, relative to the base token's **current value** (oisy price feed): **Sell** `0% · +1% · +5%`, **Buy** `0% · −1% · −5%`. The baseline is **"0%"** (the no-offset rung), deliberately not "Spot" — "spot" wrongly implies immediate execution, but a limit at current value still rests until the book reaches it. (No "fill now"/crossing preset — immediate trades belong on the Swap tab.)
   - **Price input** — a **white editable field**, quoted **quote-per-base** (e.g. "ckUSDC / ICP"). No reciprocal toggle. Editing recomputes the quote and keeps the base amount fixed.
   - **Value difference** — signed % of the limit price vs **current value**, inline by the price. Unlike a swap (where a positive figure is a realized surplus), a limit order trades **at** its target, so while it **rests** this figure is **informational only**, shown **neutral/muted** regardless of sign. It turns **amber/red** only when the price **crosses the order book** (immediate fill) — the only case where value is actually given up. Colour follows _crossing_, not the sign.
   - **Current-value reference** — small text below: "current value 2.69 ckUSDC / ICP (oisy feed)". Replaced by the immediate-fill warning when the price crosses the book.

4. **Routing element** — a small, low-prominence line ("Routed via **OISY DEX** · best execution"), expandable to show the venue's top-of-book and maker/taker fees. The order is **defined on market data, not a chosen venue**; routing is an execution detail. v1 has one venue (informational); with multiple venues it becomes a routing choice at the end of the flow, defaulting to best execution.

There is **no lock toggle** and **no reciprocal toggle**: both existed to support editing the quote, which is now derived.

#### Two reference prices (and which drives what)

| Reference          | Source                                    | Drives                                                                                                                                               |
| ------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Current value**  | oisy price feed                           | The presets (`0% · ±1% · ±5%`) and the **value-difference %**. The user's "what are my tokens worth" anchor. Labelled "current value", never "spot". |
| **Best bid / ask** | Aggregate order book (best across venues) | Whether the order **fills immediately** and its realistic execution price. Surfaced at the routing step.                                             |

The feed is the **value** anchor; the aggregate book is the **execution** reality. A limit above current value but still above the best bid (Sell) simply rests until the book rises to it. The immediate-fill warning fires only when the price crosses the book.

> _Caveat:_ a limit order is a fixed quote-per-base price. With a USD-stablecoin quote (v1), "+1% in value" and "+1% in price" coincide. With a volatile quote they diverge (the quote's own USD price drifts); out of scope for v1.

##### Venue-agnostic definition (routing last)

The user defines the order entirely from market data — value (feed) and aggregate liquidity — without picking a venue. v1 has a single venue, so the routing element is informational. When multiple venues exist, it becomes an interactive routing choice at the end, defaulting to best execution. No part of the value-definition UI changes when venues are added.

#### Price label logic

With side declared and base fixed, the label and warning depend on whether the price **crosses the order book**; the give-up is stated versus **current value**.

| Side | Limit vs book     | Label                        | Warning                                                                                                        |
| ---- | ----------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Sell | above best bid    | "When 1 [base] reaches"      | none                                                                                                           |
| Sell | at/below best bid | "Sell now, while 1 [base] ≥" | "This price crosses the order book — your order will fill almost immediately, about ≈ $X below current value." |
| Buy  | below best ask    | "When 1 [base] drops to"     | none                                                                                                           |
| Buy  | at/above best ask | "Buy now, while 1 [base] ≤"  | "This price crosses the order book — your order will fill almost immediately, about ≈ $X above current value." |

While the order **rests**, the value-difference is neutral regardless of sign — informational, not realized. It turns **amber** (give-up 0 to 5%) or **red** (beyond 5%) with the warning box only when the price crosses the book. On the review step a confirmation checkbox is required before "Place order" when the give-up exceeds 5%.

#### Token selection and pairing rules

**Base selector** (first slot). Header reflects the side — "Select token to sell" / "Select token to buy". Lists base-eligible tokens. Selecting a base **resets the amount only when the base actually changes** — an amount typed before any token is chosen, or re-selecting the same base, keeps the value (the field is never locked). (The quote-only disclaimer — "Can't find your token? Pick your other token first…" — ships with the deferred either-order work above.)

**Quote selector** (second slot). **Inactive until a base is chosen.** Once a base is set it lists the valid quote tokens for that base. Because no venue is chosen yet, rows show only venue-neutral, market-wide data: the quote token; the **current price** for the pair and the **venue count** ("current 2.69 · 3 venues"); and an **aggregate liquidity chip** — **Deep / Moderate / Thin** — summed across all venues (a venue-neutral fill-speed hint). No per-book best bid/ask appears here — that is execution detail, surfaced only at the routing step.

**Base → quote chaining.** Picking a base while the quote is empty opens the quote picker immediately (a single "both tokens" gesture); choosing the quote returns to the form with focus in the amount field. If a quote is already set, re-opening the base picker updates the base only — the quote picker does not re-open.

**Cascade clear.** If the base changes and the current quote no longer forms a valid pair, the quote clears to placeholder state (and the amount resets) — no stale values. **Changing either token re-anchors the price to current value (0%) of the resulting pair** (or clears the price until a valid pair exists) — price scale is pair-specific (ICP/ckUSDC ≈ 2.69 vs ICP/ckBTC ≈ 0.0000448 vs ckBTC/ckUSDC ≈ 60000), so a carried-over price would be meaningless. Changing side (Buy/Sell) does **not** clear tokens or the base amount; it re-labels fields, flips preset semantics, **re-anchors the price to current value (0%)**, and re-derives the quote.

#### Field linkage, validation, and required fields

Two inputs only: **base amount** and **price**. The quote amount is always derived output (`quote = base × price`, recomputed on every change). The two grid constraints — base a multiple of `lot_size`, price a multiple of `tick_size` — are enforced by **inline, on-type field validation**, not by an after-the-fact rounding step. There is no apply box and no silent rounding.

Validity has two parts, handled differently:

- **Decimal places — hard-limited as you type.** The field accepts at most as many decimals as the step allows (`lot_size` 0.1 → 1 decimal, 0.0001 → 4, an integer step → none). Extra digits are rejected at the keystroke. This is the same precision-capping users already see on token amount fields, so it feels native.
- **Multiple — validated live.** The value must be an integer multiple of the step. For **power-of-ten** steps the decimal cap already guarantees this (any value within the allowed decimals is a valid multiple), so nothing more is needed. For **non-power-of-ten** steps (e.g. `lot_size` 0.25, where 0.30 has a legal decimal count but isn't a multiple), the field shows an inline validation message — "→ Enter a multiple of 0.25 ICP — e.g. 0.25" — turns its border red, and **Review is disabled** until corrected. (We surface the nearest valid value as a hint rather than auto-applying it.)

Same rules for both base (`lot_size`) and price (`tick_size`).

**Required fields — empty is not zero.** An empty base amount or price field is treated as "not entered," **not** as 0: the field shows a placeholder, the derived amount shows "—" (no misleading $0), and **Review is disabled**. A typed 0 (or negative) is likewise invalid. Review enables only when both fields hold a positive value **and** both satisfy their step constraint.

#### Entry points

- **Flow A — no pre-fill.** The modal opens **empty**: no tokens, blank amount/price (placeholders), derived amount "—", Review disabled, hint "Pick a token to begin". Side defaults to Sell. The user picks a base → the quote picker chains open → picks a quote → lands in the amount field → enters amount and price.
- **Flow B — position pre-fill.** From the Trading tab "+ Limit order" on a held position: side and base token arrive pre-filled (you hold the asset → Sell); the quote selector is open to choose. The user can switch to Buy.

#### Wizard steps

Form → Review → Progress (same pattern as swap).

**Review** — title "Review limit order". Hero: "You sell X [base]" / "You get ≥ Y [quote] (at least)" for a Sell; "You buy X [base]" / "You pay ≤ Y [quote] (at most)" for a Buy. Rows: limit price with current-value reference; value difference; DEX (routing); "Fee (maker / taker)" with a (?) explanation. If the price crosses the book, the warning box shows; beyond 5% give-up a confirmation checkbox is required before "Place order".

**Progress** — single step submitting the order. On success the modal closes and the order appears in the Trading tab Active Orders as Pending; status updates via polling.

#### Insufficient balance

Checked against the token actually spent: the **base free balance** on a Sell, the **quote free balance** (= `base × price`) on a Buy. If the spend exceeds free, it is **soft-validated like the step rules** — an inline message under the amount field ("Exceeds your free balance — 15.4994 ICP available" / "Costs X ckUSDC — only Y free") and **Review is disabled**. **Affordability takes precedence over precision**: if the amount both exceeds the balance and isn't a valid `lot_size` multiple, only the balance message shows — knowing you can't afford it matters more than a rounding nudge.

> _Deferred — inline deposit:_ instead of only blocking, a future version can offer to **deposit the shortfall right from the order form** (token + shortfall pre-filled, opening the deposit flow at its Review step) so the user tops up without leaving. Out of scope for now; the soft block stands in until then.

#### Fee display

The derived amount is always **gross** (before fees). On the form, the routing element expands to show maker/taker fees (or a static notice until rates are queryable). On review, a single "Fee (maker / taker)" row with a (?) explains that fees are deducted from proceeds at fill time and that maker-vs-taker can't be predicted.

### Option B — Fixed sell-buy design

_Wireframe: [trade-modal-sell-buy.html](./2026-06-04-feat-limit-orders/wireframes/trade-modal-sell-buy.html)_

A single form used from multiple entry points. Always modal.

Layout follows oisy's existing swap form: amount on the left (left-aligned), token selector pill on the right.

#### Fields (in order, top to bottom)

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

#### Price label logic

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

#### Below-market confirmation

- **Value difference < 0%**: warning shown on form and review steps. No checkbox required — the user can still proceed.
- **Value difference < −5%**: warning shown on form and review steps. On the review step, a confirmation checkbox is required before "Place order" is enabled. The checkbox and warning are combined into a single box. This matches the existing swap behaviour for significant value differences.

On the form step the warning text reads: **"This price is below market — your order will fill almost immediately. You'll receive approximately $X less than at market price."**

On the review step the warning text reads: **"The specified price is below market — your order will fill almost immediately. You'll receive approximately $X less than at market price."** (refers to the limit price row visible directly above it).

#### Field linkage and rounding rules

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

**Lot size rounding.** `lot_size` constrains the base token quantity (e.g. ICP in an ICP/ckUSDC pair). The rounding always applies to the base token amount regardless of which field the user typed into. When the user enters a quote token amount that produces a non-integer base amount, the base is rounded down to the nearest valid lot size multiple and both fields update to reflect the rounded values. The user always sees the final rounded amounts before confirming.

**Tick size rounding.** `tick_size` constrains the price in quote-per-base terms (e.g. ckUSDC per ICP). The DEX always stores and validates price in this canonical direction. When the user enters a price via the reciprocal display (e.g. ICP per ckUSDC), the value must be converted back to quote-per-base and rounded to the nearest valid `tick_size` multiple before submission. Both the reciprocal display and the canonical price update to reflect the rounded value. The user always sees the rounded price before confirming.

#### Language

The Limit Order tab uses **"You sell"** and **"You buy"** — not "You pay" / "You receive". This distinction matters because "You receive" is reserved for the net post-fee amount, which cannot be shown as a single value at placement time (maker vs taker is unknown until fill). "You buy" clearly expresses the gross target amount the order is priced to achieve.

The Swap tab continues to use "You pay" / "You receive" (existing behaviour unchanged).

#### Token selection and pairing rules

Both "You sell" and "You buy" token selectors open a token selector modal. The selection is symmetrical — either token can be chosen first.

**Default filter.** When neither token is selected, both selectors show only tokens that appear in at least one CLOB pair on the integrated DEXes.

**After one token is selected.** The other selector is further filtered to tokens that form a valid pair with the already-selected token.

**"Show all tokens" toggle.** Inside the token selector modal (not on the main form), a "Show all tokens" toggle removes the pairing filter and shows the full DEX-supported token list. If the user picks a token that has no valid pair with the already-selected token, the other token field and its amount are both cleared. The main form always shows the filtered view — "show all tokens" is only visible inside the modal.

**Cascade clear on change.** When either token changes and the other no longer forms a valid pair, the other token and its entered amount are cleared. Cleared fields are shown in their empty/placeholder state — no silent stale values.

**DEX selector.** Enabled only after both tokens are selected. Shows only DEXes that support the chosen pair, with best ask price per DEX.

**Price section.** Becomes active after a DEX is selected.

**Fiat values** are shown in the user's selected currency throughout the form: sell amount, buy amount, price, and market reference all show fiat equivalents. Fiat conversion uses the same price feeds and currency setting as the rest of oisy.

The "You sell" field always shows both balances: DEX free balance and wallet balance. Both are shown at all times — the wallet balance is context for how much more the user could deposit if needed.

#### Entry points

**Flow A — no pre-fill.** User opens the form without a specific position in mind (e.g. from a global "Trade" button). All three selectors start empty. User fills them top to bottom.

**Flow B — position pre-fill.** User clicks "+ Limit order" from the Trading tab with a specific token in context. "You pay" token and DEX arrive pre-filled and locked. "You receive" selector is the only one the user needs to choose, constrained to pairs available on that DEX. The flip button is still available to switch direction.

Both entry points use the same form. The only difference is which fields arrive pre-filled and locked.

#### Fee display

The "You buy" amount always shows the **gross amount before fees**. Fees are deducted from proceeds at fill time. Whether the order fills as maker or taker is not known at placement time — it depends on the order book state at execution.

**On the form** — the DEX selector row is expandable (same pattern as swap fees). Collapsed it shows the DEX name and the CLOB best ask (labelled "best ask", clearly distinct from the oisy price feed market reference shown in the price section). Expanded it shows two lines:

- "Maker fee · 0% (No fee)" — shown in green when 0 bps
- "Taker fee · 0.05% (5 bps)"

Fee rates come from `maker_fee_bps` / `taker_fee_bps` in `TradingPairInfo` once available (see Open questions). Until then, show a static note in the expanded section.

**Market reference vs CLOB price** — the price section shows "market X (oisy price feed)" based on oisy's own price feeds, used for value difference and label logic. The DEX expanded row separately shows "best ask Y" from the CLOB order book. These are two distinct data sources and must be labelled differently.

**On the review step** — a single "Fee (maker / taker)" row shows both rates (e.g. "0% / 0.05%"). A (?) next to the label expands a short explanation: "Fees are deducted from your proceeds at fill time. Whether your order fills as maker or taker depends on the order book state at execution and cannot be predicted." with a Learn more link. There is no "You receive" row on the review — the gross "You buy" amount is shown in the hero, and the fee row gives the context needed.

#### Insufficient balance

If the user's DEX free balance for the "You pay" token is less than the order requires, show the shortfall clearly and offer an inline deposit step before confirming. The user sees the deposit as an explicit action, not a hidden side effect.

#### Wizard steps

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

_Wireframe: [deposit-flow.html](./2026-06-04-feat-limit-orders/wireframes/deposit-flow.html)_

Triggered from the "+ Deposit" link in the Trading tab (no token context). Mirrors the stake wizard: Form → Review → Progress. _(A future inline entry from the order form, pre-filling the shortfall, is deferred — see Insufficient balance.)_

**Form** — token selector (only DEX-supported tokens the user holds); amount with wallet balance + fiat; collapsible transaction-fee row (approval + transfer fees); an agreement checkbox ("I understand my tokens will be held by the OISY DEX canister and are subject to on-chain smart contract risk") gating Review. **Review** — hero amount + fiat, "To: OISY DEX", fee row; no "you deposit" summary (fee is on top, not deducted). **Progress** — Approving → Depositing → Done.

---

## Withdraw flow

_Wireframe: [withdraw-flow.html](./2026-06-04-feat-limit-orders/wireframes/withdraw-flow.html)_

Triggered from the "Withdraw" link on a token row. Form → Review → Progress.

**Form** — token pre-selected; amount with fiat; free balance as a clickable max shortcut (cannot exceed free balance); reserved balance shown as context ("Locked by open orders. Cancel orders to free this balance."); transfer-fee row. **Review** — hero amount + fiat, "From: OISY DEX", fee row, and a "You receive" row (amount − transfer fee, so less than entered). **Progress** — Withdrawing → Done.

---

## Cancel order flow

Triggered from the Cancel action on an Active order row. A confirmation step prevents accidental cancels. On confirm, reserved funds return to free balance and the order leaves the active list.

---

## Active orders

Shows all Pending/Open orders for the connected user. Each row: pair, direction (You sell → You get / You buy → You pay), price, amount, status (Pending with spinner, or Open), and a Cancel button. Status refreshes by polling while the Trading tab is visible; on transition to Filled/Canceled the order moves to History.

---
## Acceptance criteria

**Common (apply to both form options)**

- [ ] Trading tab is visible (when the flag is on) and navigates correctly.
- [ ] DEX-deposited tokens are not shown in the Tokens tab list.
- [ ] Hero net-worth total includes DEX free + reserved balances.
- [ ] Trading tab states render correctly (new user / assets-only / full).
- [ ] Deposit flow completes with two visible steps (Approve → Deposit).
- [ ] "Swap" hero button opens the combined modal with Swap as the default tab; switching to Limit order preserves token context.
- [ ] Limit order follows Form → Review → Progress; the placed order appears immediately in Active Orders as Pending and updates via polling.
- [ ] Cancel returns reserved funds to free balance.

**Order placement form — Option A (Intent-based)**

- [ ] A **Buy/Sell segmented control** sits at the top and frames the form; the top token field is the base regardless of side.
- [ ] Switching side re-labels fields, flips preset semantics, **resets the price to current value (0%)**, and re-derives the quote — while preserving tokens and the base amount.
- [ ] Base and quote tokens render in **one merged box**, linked by a connector word: **"for"** (sell) / **"with"** (buy), reading "Sell ICP for ckUSDC" / "Buy ICP with ckUSDC".
- [ ] Both token pills are right-aligned.
- [ ] Only the **base amount** and **price** are editable, rendered as **white bordered fields**; the quote amount is plain read-only text.
- [ ] The derived amount is a **bound**: "at least" (≥) for a Sell, "at most" (≤) for a Buy, labelled gross/before-fees appropriately per side.
- [ ] Quote labels use **get/pay** (Sell → "You get", Buy → "You pay"); Sell/Buy describe the base only.
- [ ] Presets are **`0% · +1% · +5%`** (Sell) / **`0% · −1% · −5%`** (Buy), anchored to current value (oisy feed); the baseline is "0%", never "Spot".
- [ ] Value-difference is **neutral while the order rests**, regardless of sign; it turns amber/red only when the price **crosses the order book** (immediate fill), with the warning box.
- [ ] Beyond 5% give-up, a confirmation checkbox is required on review before "Place order".
- [ ] The dynamic label reflects crossing: "reaches" / "drops to" (resting) vs "Sell now, while ≥" / "Buy now, while ≤" (crossing).
- [ ] **Empty amount or price is not treated as zero**: the field shows a placeholder, the derived amount shows "—", and **Review is disabled**; a typed 0 is also invalid.
- [ ] Review enables only when both inputs are positive **and** both satisfy their step constraint (multiple of lot_size / tick_size).
- [ ] Amount/price fields **hard-limit decimals** to the lot_size/tick_size precision as the user types (extra digits rejected).
- [ ] For a non-power-of-ten step, a value with legal decimals but not a valid multiple shows an **inline validation message** (with the nearest valid value) and disables Review; no apply box, no silent rounding.
- [ ] Quote token picker shows current price, venue count, and an aggregate **Deep/Moderate/Thin** liquidity chip — no per-book bid/ask before routing.
- [ ] The modal opens **empty** (no tokens, blank values, Review disabled, "Pick a token to begin").
- [ ] The **quote selector is inactive until a base is chosen**; once chosen it lists the valid quotes for that base.
- [ ] Picking a base while the quote is empty **chains into the quote picker**, and returning **focuses the amount field**; re-picking a base when a quote is already set does not re-open the quote picker.
- [ ] Changing the base to a different token **resets the amount**; an amount typed before token selection, or re-selecting the same base, is preserved (the field is never locked).
- [ ] Changing **either token** re-anchors the price to current value (0%) of the new pair (or clears the price if the base change leaves no valid quote).
- [ ] _(Deferred)_ Quote-only tokens (e.g. ckUSDC) and **either-order selection** — picking the quote first — are a follow-up; the base selector's quote-only disclaimer ships with it.
- [ ] Routing element shows "Routed via OISY DEX · best execution"; the order is defined on market data, not a chosen venue.
- [ ] Both rows show the free DEX balance of their token; only the **spend side** has a clickable **Max** (base row on Sell, quote row on Buy).
- [ ] Sell Max fills free base floored to lot_size; Buy Max converts free quote → base via the price (floored to lot_size) and is disabled until a price is set.
- [ ] Insufficient balance (spend > free: base on Sell, quote on Buy) is **soft-validated** — inline message under the amount field + Review disabled; the **balance error takes precedence over the lot error**. (Inline deposit deferred.)
- [ ] Flow B pre-fills side and base token from the position context.

**Order placement form — Option B (Fixed sell-buy)**

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
- [ ] Flow B pre-fills DEX and "You pay" token from the position context.

---

## Open questions

0. **⚠ Form design — Option A (Intent-based) vs Option B (Fixed sell-buy) — DECIDE BEFORE IMPLEMENTATION.** Both options are fully specified above. Pick one; the unchosen "Order placement form" subsection and its acceptance criteria are then removed in a follow-up commit.
   - _Option A — Intent-based_ — removes direction ambiguity and the reciprocal/lock controls, reads as a sentence ("Sell ICP for ckUSDC"), handles quote-only tokens; but diverges from the existing Swap form and is net-new UI.
   - _Option B — Fixed sell-buy_ — matches the current Swap UX and is already prototyped; but keeps the ambiguity and the reciprocal/lock complexity Option A set out to remove.
1. **Mainnet canister ID** — fill in once deployed.
2. **Token logos** — confirm the oisy registry covers all DEX-listed tokens, or add a fallback.
3. **USD price feeds** — confirm all DEX-listed tokens have USD price data (needed for the hero total and current-value anchor).
4. **Fee rates in `TradingPairInfo`** — request the DEX team add `maker_fee_bps` / `taker_fee_bps`; until then show a static fee notice.
5. **Aggregate liquidity source** — confirm how cross-venue best price / depth is computed once more than one venue exists (v1 has a single venue, so "aggregate" = that venue).
