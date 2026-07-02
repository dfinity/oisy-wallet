# Spec: Limit Orders via dfinity/oisy-trade

This spec follows the workflow defined in [`docs/ai/spec-driven-development/workflow.md`](../workflow.md).

## What we're building

Let users place and manage limit orders on the `dfinity/oisy-trade` on-chain order book DEX, directly from the oisy wallet. This is an integration — order matching runs inside the DEX canister. Oisy provides the UX.

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

|                  |                                |
| ---------------- | ------------------------------ |
| Display name     | OISY TRADE                     |
| Repo             | `dfinity/oisy-trade` (private) |
| Staging canister | `proc5-daaaa-aaaar-qb5va-cai`  |
| Mainnet canister | TBD — update when deployed     |

The full Candid interface is at `canister/dex.did` in the `dfinity/oisy-trade` repo.

### Key concepts

**Deposit-first model.** Users must deposit tokens to the DEX before trading. The DEX tracks internal balances per user and token: `free` (available to trade or withdraw) and `reserved` (locked by open orders). Depositing requires two steps: first `icrc2_approve` on the token's ledger, then `deposit` on the DEX. Both steps charge a ledger fee, so the approval must cover `amount + ledger_fee`.

**Asynchronous matching.** `add_limit_order` returns an `OrderId` immediately. The matching engine processes orders on the next timer tick. Clients poll `get_order_status` to observe the lifecycle: `Pending → Open → Filled / Canceled`.

**Orders need a price and quantity.** Price is in quote-token units per base-token unit and must be a positive multiple of the pair's `tick_size`. Quantity is in base-token units and must be a positive multiple of `lot_size`. Both come from `get_trading_pairs`.

**Maker/taker fee model.** Each pair has a maker fee and a taker fee in basis points. The fee is deducted from the proceeds at fill time, **in the asset the side receives** — quote tokens for a sell, base tokens for a buy. At placement time oisy cannot know whether the order fills as maker or taker, so the amount shown is the **gross** before fees.

**Live market data.** Best bid/ask (`get_order_book_ticker`), order-book depth (`get_order_book_depth`, where used), and the oisy price feed move continuously. While the order form is open with a pair selected, oisy **refreshes them on a short interval** and re-evaluates the derived state — value-difference, the immediate-fill / crossing warning, the routing best bid/ask, the queue-position figure, and (for a fill-or-kill order) whether it can fill — so a price that can't cross right now becomes proceedable as the book moves, and vice versa. Refreshes update only computed state, never the user's typed amount/price. A fill is **never guaranteed**: the DEX decides at execution, so even a FOK the UI shows as fillable can be killed if the book moves before the matching tick processes it.

**Fee rates.** `get_trading_pairs` exposes per-pair `maker_fee_bps` / `taker_fee_bps` (nat16) — live on staging (currently maker 0, taker 20) — so the real rates are shown directly; no static notice. The API value is in **basis points**, but oisy always **displays a percentage**, never bps: the rate is converted (`bps ÷ 100`) and shown as e.g. **"0.20%"** (not "20 bps"), since a percentage is the format users read fees in everywhere else in the app.

### Relevant canister methods

```
get_trading_pairs() → vec TradingPairInfo   // pairs, tick_size, lot_size
list_supported_tokens() → vec Token         // symbol, decimals
get_order_book_ticker(pair) → { bid, ask }  // best bid/ask prices
get_order_book_depth({ pair, limit }) → { bids, asks }  // PriceLevel{price, quantity} per level; limit default 100/side, max 1000
get_balances(opt filter) → { token, balance: { free, reserved } }
deposit(token, amount) → Ok | Err           // requires prior icrc2_approve
withdraw(token, amount) → Ok | Err
add_limit_order(pair, side, price, quantity) → Ok(OrderId) | Err
cancel_limit_order(orderId) → Ok(OrderRecord) | Err
get_order_status(orderId) → Pending | Open | Filled | Canceled | NotFound
get_my_orders({ ...selector }) → vec OrderRecord  // caller's own orders (per-user)
```

`get_order_book_depth` returns aggregated levels — `quantity` is the **sum across all resting orders at that price**, with no per-order identity, owner, or arrival order. So it supports price-level analysis (liquidity ahead of a price, immediate-fill size) but **not** FIFO position **within** a single price level. `bids` are sorted best-first (price descending), `asks` best-first (price ascending).

### Listing user orders

The canister exposes **`get_my_orders`**, which returns the caller's own orders directly — so oisy does not need the local-`OrderId` workaround as a hard dependency. **v1 still persists each returned `OrderId` locally** (resilient if the query shape is in flux) and can reconcile against `get_my_orders`; polling individual orders via `get_order_status` remains the status mechanism. _(Earlier drafts assumed no per-user listing existed and described a `get_user_orders` fallback; `get_my_orders` supersedes that.)_

---

## Navigation context

Top-level navigation is unchanged: **Assets · Activity · Earn · Explore**. There is no new top-level Trade page. This feature adds one surface: a **Trading tab** inside Assets ("where is my money?" — DEX deposits and active orders at a glance).

The existing **"Swap" hero button** opens the **Swap** modal, unchanged. The **Limit-order form is its own separate modal** — it is **not** a tab inside the Swap modal. (An earlier draft combined them as two tabs; that was dropped because the two forms differ enough that one shared modal was awkward.) The limit-order modal is opened from the **Trading tab → Orders → "+ Limit order"** link; it reuses the Swap modal's visual language (centered title, boxed sections, token-selector pills, footer buttons) so the two feel like one family.

---

## Where it lives

### Trading tab (Assets)

_Wireframe: [trading-tab.html](./2026-06-04-feat-limit-orders/wireframes/trading-tab.html)_

A new **Trading** tab on the Assets view, alongside Tokens, NFTs, and Earning. Gated by the **`Trading` feature flag** (see _Feature & provider flags_), disabled in production until ready. It begins with a one-line description and a "Learn more" link, and contains two sections:

**My assets** — tokens deposited on trading providers. Rows reuse the **standard wallet token-position layout** (token icon, symbol, token name / network as subtitle) so they're consistent with the Tokens tab, **minus the price and 24h change %** — those add noise without helping the trading-balance view. After the symbol sits the **outlined `OISY TRADE` provider tag** — a quiet, neutral pill (matching the Earning tab's provider tags) — the same tag the order rows use, for one consistent way of showing the venue. Each row shows the **total deposited** amount on the right, an **"Available: X"** line beneath it, and the fiat equivalent. "Available" is the **free** balance (total minus amounts reserved by open orders) — it answers the only question the user actually has here: _how much can I use right now_, e.g. to place a new order or withdraw. We show available rather than "reserved" because it's the directly actionable number. The "Available" line appears only when some balance is reserved (available < total); when nothing is reserved the row's total already _is_ the available amount, so the extra line is omitted. A "+ Deposit" link in the section header opens the Deposit flow; each row has a "Withdraw" inline link.

**Orders** — tabbed **Active** (Pending + Open) and **History** (Filled + Cancelled). Each row is a **single natural-language line** with an outlined provider tag (see _Order row format_ below). **Active** orders (Pending and Open) also show a **queue position** as plain right-aligned muted text — **"15% are ahead"** (share of same-side volume priced better), or **"Front of book"** — that updates as the book moves, giving an at-a-glance sense of how soon it might fill. A "+ Limit order" link in the header opens the Limit-order modal. _(Queue position uses `get_order_book_depth`; not shown for Filled/Cancelled rows or crossing orders.)_

**Three states:** _new user_ (an **onboarding card** replaces the empty sections — see below); _has assets, no orders_ ("+ Limit order" active; "No active orders" with a Limit order button); _has assets and orders_ (asset rows with Withdraw; order rows with status pills; History tab).

**New-user onboarding.** For a brand-new user (no deposits, no orders), the intro line and the empty My-assets/Orders sections are replaced by a single **onboarding card** that explains the venue and the getting-started flow: a short "what it is" line (OISY TRADE is an **on-chain order-book exchange**; place limit orders from the wallet; funds stay in **smart contracts you control**, not with a central party), a **3-step "how it works"** — **1) Deposit a supported token · 2) Place a limit order · 3) Withdraw anytime** — a **dynamic list of supported tokens** (distinct base+quote union: ICP, ckBTC, ckUSDC, ckUSDT) as chips, a primary **Deposit** CTA, and a **Learn more** link. The word "swap" is deliberately avoided here (swaps are the separate Swap hero) — the Trading tab onboarding talks only about **limit orders**. Once the user has any deposit or order, the card collapses and the normal sections show.

### Order row format

Order rows (Active and History) are a **single natural-language line** — it scans better than prose-plus-code and holds the whole transaction without redundancy. The sentence is built around the side word, which is **color-coded like the order form** (**Sell** in red, **Buy** in green), and carries the single most relevant amount — what you commit:

- Sell: **`Sell 100 ICP for ckUSDC at 2.75`** (base amount sold)
- Buy: **`Buy ICP with 300 ckUSDC at 2.60`** (quote amount spent)

The price (the `at X` figure) is in quote per base (e.g. ckUSDC per ICP); the preceding token implies the unit. The **provider follows as a small outlined tag** (`OISY TRADE`) at the end of the line — a quiet, neutral pill (matching the Earning tab's provider tags), kept compact and out of the sentence so the figures stay scannable.

On the **right side** of the row: the **status pill** and, for **active** orders (**Pending and Open**), the **queue position** as **plain right-aligned text** in muted dark gray (e.g. "10% are ahead" or "Front of book") — no pill or chip, so it reads as supplementary info rather than a status. It's shown for Pending too: it's the same projection we already surface **before** placement (where the order would land once it rests), so there's no reason to hide it in the brief Pending window — it just becomes live once the order is Open. Hidden once the order is **terminal** (Filled/Cancelled), and not shown for a **crossing** order that fills immediately rather than resting. _(Under privacy mode the amount is masked; the side word, pair, price, venue tag, status, and queue position stay visible.)_

**Status-pill colors.** Each status carries a distinct color + icon so it reads at a glance, including in grayscale: **Pending** amber (with spinner), **Open** green, **Filled** green with a check (the success outcome), **Cancelled** neutral gray with an ✕. Cancelled is deliberately neutral, not red — cancelling is a normal user action, not an error. (Previously Filled and Cancelled were both gray, which forced reading the label to tell two opposite outcomes apart.)

### Hero net-worth total

DEX balances (`free + reserved`) are included in the hero net-worth total. DEX-deposited tokens do **not** appear in the Tokens tab list — only in the Trading tab. The hero shows the total figure only — no breakdown label.

### Privacy mode

The Trading tab honors OISY's existing **global privacy mode** (the wallet-wide hide-balances toggle); there is no separate trading-specific control. When privacy mode is on, the tab follows the **standard pattern** used elsewhere in the wallet — sensitive figures are replaced by a dot mask (e.g. `•••••`) rather than removed, so layout is unchanged.

What is masked on the Trading tab: **My assets** token amounts (total and available) and their fiat equivalents, and **order amounts** in the Active/History rows (and in the order-detail modal). What stays visible: the **pair** (e.g. ICP → ckUSDC), **provider**, **order status**, and **limit/market prices** — prices are public market parameters, not holdings, and the amount is already masked. The hero net-worth total is governed by the same global toggle as the rest of the wallet.

_Wireframe: [trading-tab.html](./2026-06-04-feat-limit-orders/wireframes/trading-tab.html) has a "Privacy mode" toggle (and an eye control in the hero) demonstrating the dot mask._

---

## Feature & provider flags

_Wireframe: the [trading-tab.html](./2026-06-04-feat-limit-orders/wireframes/trading-tab.html) "OISY TRADE off" toggle shows the provider-off placeholder._

**`Trading` feature flag (temporary).** The whole feature ships behind a `Trading` feature flag, so PRs can merge to `main` and the app stays deployable. **Off → the Trading tab is not rendered at all** — no deposit, limit-order, or withdraw entry exists anywhere. It's enabled in **staging** while in development and kept **off in production** until ready, then the flag is **removed** once the feature ships.

**Provider flags (permanent).** Each trading provider also has its own flag (e.g. `oisyTrade`), **kept in the app** as an operational kill-switch — it lets us disable a provider quickly (e.g. when its canister is unreachable) to avoid surfacing errors, without a deploy.

- **Trading on + provider on** → the normal Trading tab.
- **Trading on + provider off** → since v1 has a single provider, the Trading tab shows a **"no provider available" placeholder** ("Trading is temporarily unavailable — no trading provider is available right now…"); **no deposit / limit-order / withdraw actions are offered**. This is a deliberate v1 choice: the flag is meant for an **unreachable** provider, so the tab is a **full placeholder** — a user's existing balances aren't actionable until the provider is re-enabled (they are **not** lost, just paused).
- **Multiple providers (future):** a disabled provider simply drops from the list; the placeholder appears only when **all** providers are off.

**Future — finer control.** If we later need a "soft" disable (e.g. block new orders but still allow withdrawing existing balances while a provider winds down), we can add a soft state or **per-feature provider flags** (`oisy_trade_deposit`, `oisy_trade_withdraw`, …). Out of scope now.

---

## Order placement form (Limit order modal)

_Wireframe: [trade-modal-intent.html](./2026-06-04-feat-limit-orders/wireframes/trade-modal-intent.html)_

The form is **intent-based**: the user declares an intent ("Sell ICP for ckUSDC") rather than filling a fixed pay/receive swap layout. A standalone modal form (its own modal, not a Swap tab), opened from the Trading tab **Orders** "+ Limit order" link. It opens empty (no token context). The modal uses the **Swap modal's chrome** — centered **"Limit order"** title + ✕ close, light-gray boxed sections, token-selector pills (logo + symbol + chevron), and a footer with **Cancel** (soft) + **Review** (primary) buttons in OISY's blue accent. One form, fields revealed progressively as prerequisites are met.

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
   - **Base row** — structured like the Swap modal's "You pay" field: a **header** with the side label ("You sell" / "You buy", left) and the **network** ("On Internet Computer", right); the **amount** field + base **token pill** in a row below; then a sub-line with a **fiat/amount switcher** icon and the **USD value** on the left (plain "$X", no "≈") and the spend-side **Max** on the right (see _Max (spend-side)_). On a **Buy** the base is the token you **receive** (the fee is taken from it), so its $ value gets **", before fees"** — the before-fees note always lands on the receive token (quote on a Sell, base on a Buy).
   - **Connector:** a thin divider carrying the direction word — **"for"** on a Sell, **"with"** on a Buy — so the box reads "Sell ICP **for** ckUSDC" / "Buy ICP **with** ckUSDC".
   - **Quote row** — mirrors the base field's structure (header + network, value in the field's space, sub-line). The label **carries the bound**: **"You get at least"** (Sell) / **"You pay at most"** (Buy) — so no ≥/≤ symbol on the amount. The **derived amount** sits where the input would be but is **plain read-only text** (no border/box, muted) so it reads as non-editable; the quote **token pill** is on the right. The sub-line shows the **fiat/amount switcher** + the quote's **$ value**, and on a **Sell** appends **", before fees"** (the quote received is gross). No "Free" wording.

   The amount is **not an estimate** — `quote = base × price`, exact at the limit price. It is a **bound** because a limit fills at the limit price _or better_ (price improvement): a Sell receives _at least_ this much quote (could be more); a Buy pays _at most_ this much (could be less). _("before fees" is shown on the Sell quote because the fee is taken from the quote received; on a Buy the fee is taken from the base received, so the quote-paid figure carries no before-fees note.)_

   **Max (spend-side).** The spend side shows a single clickable **"Max: 15.4994 ICP"** (the value is the user's free DEX balance of that token, but the label is just "Max" — no "free / reserved" wording in the UI). Only the **spend side** carries Max, because the amount field is always the base while the token you spend flips with side:
   - **Sell** (spend = base): Max sits on the **base** row. It fills the amount with the free base, floored to `lot_size` (e.g. free 15.4994 ICP, lot 0.25 → 15.25). The value shown is the true free balance; Max fills the largest valid multiple, so it never trips validation.
   - **Buy** (spend = quote): Max sits on the **quote** row ("Max: <free quote>"). It converts the free quote into a base amount via the price — `base = floor((freeQuote ÷ price) / lot_size) · lot_size`. Max is **disabled until a price is set** (the conversion needs one); shown greyed with a "Set a price first" hint.

   The **non-spend (receive) side** shows its **balance** instead of a Max — a wallet icon + the DEX free balance of that token (e.g. "[wallet] 25.2719 ckUSDC"), mirroring how the Swap modal shows the balance on its "You receive" field. So each row always has something useful on the right: spend side → **Max**, receive side → **balance**.

3. **Price section** — active once a quote token is chosen.
   - **Dynamic label** (see Price label logic).
   - **Quick-set links.** A leftmost **Bid / Ask** option — labelled by side (_Bid_ on a sell, _Ask_ on a buy) — sets the price to the **best book price** (best bid / best ask): the canonical crossing price, and what a user wants for a FOK filling at the top of book. It is **book-anchored** (from `get_order_book_ticker`). The rest are **value-anchored** to the oisy feed: **Sell** `0% · +1% · +5%`, **Buy** `0% · −1% · −5%`, baseline **"0%"** (the no-offset rung; deliberately not "Spot", which would imply immediate execution — a 0% limit still rests). Setting Bid/Ask positions the price at the top of book; pairing it with **Fill or kill** (below) is how a user fills immediately — there is no separate "fill now" button. A preset shows **selected only while the price still equals it**: a live market/feed move (or a manual edit) that shifts the price off the target **deselects** it — it reads as "not set", like a manually entered value — so a highlighted Bid always means the price _is_ the current best bid (re-click to re-snap after a move).
   - **Price input** — a **white editable field**, quoted **quote-per-base**. The unit after the number is **just the quote symbol** (e.g. "3 ckUSDC"), not "ckUSDC / ICP": the label already reads "When 1 [base] reaches…", so the "/ [base]" is redundant. No reciprocal toggle. Editing recomputes the quote and keeps the base amount fixed.
   - **Value difference** — signed % of the limit price vs **current value**, inline by the price. Unlike a swap (where a positive figure is a realized surplus), a limit order trades **at** its target, so while it **rests** this figure is **informational only**, shown **neutral** regardless of sign. It turns **amber/red** only when the price **crosses the order book** (immediate fill) — the only case where value is actually given up. Colour follows _crossing_, not the sign. **Rendering (matching the swap review): plain coloured text, no background pill.** Neutral = primary-colour text, **not bold, no icon** (purely informational while resting); crossing with give-up 0–5% = **amber + warning icon, bold**; crossing beyond 5% = **red + warning icon, bold**. The gray-vs-coloured split is **crossing**, not a magnitude threshold — a resting order stays neutral however far below market it sits. Same rendering on the form and the Review. _(Swap colours by magnitude with a small fixed orange threshold; the LO instead uses the crossing gate, which is the only point at which the figure is a real loss.)_
   - **No current-value reference line.** The verbose "current value 2.69 … (oisy feed)" line is **omitted** to keep the section clean; a user who wants the spot taps **0%** (which sets the price to current value). The immediate-fill warning still appears when the price crosses the book.
   - **Queue position** — as the price is set, a line reads **"Queue position: Front of book"** or **"Queue position: 15% are ahead"** — the share of same-side volume **priced better** than the user's price (how much must clear before theirs). Formatting: **< 10% uses one decimal and always rounds up** (so any volume ahead shows ≥ 0.1%, never a misleading 0%); **≥ 10% is a whole number**. Computed from `get_order_book_depth` (strictly-better-priced volume); because the endpoint aggregates per price level, it is an **approximation** of true FIFO position (it can't see intra-level order). It refreshes with the live book (see _Live market data_). When the price **crosses the book** (immediate fill) it is **hidden** — a crossing order fills now rather than resting, so it has no queue position, and the immediate-fill warning takes its place. Same value on the Review ("Queue position" row). _Uses `get_order_book_depth` (live on staging) — ships in v1._ See Open questions re: the depth `limit` window.

4. **Routing element** — a small, low-prominence line ("Routed via **OISY TRADE** · best execution"), expandable to show the venue's **top-of-book (both sides)** and maker/taker fees. Expanded, it always lists **two price rows in order — "Lowest ask" (top) then "Highest bid" (below)** — matching the conventional order-book layout (asks above bids), so the user gets a feel for the spread regardless of side. The **ask row is red, the bid row green** (book-side convention; distinct from the value-difference's give-up colouring). Prices use the quote symbol ("2.700 ckUSDC"). A neutral **"Spread"** row follows, showing the **relative spread only** (no absolute — both sides are right above it): `(ask − bid) ÷ mid × 100`, e.g. "0.6%". Fee values (maker/taker) are neutral too, so red/green is reserved for the ask/bid sides. The order is **defined on market data, not a chosen venue**; routing is an execution detail. v1 has one venue (informational); with multiple venues it becomes a routing choice at the end of the flow, defaulting to best execution.

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

| Side | Limit vs book     | Label                        | Warning                                                                                                      |
| ---- | ----------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Sell | above best bid    | "When 1 [base] reaches"      | none                                                                                                         |
| Sell | at/below best bid | "Sell now, while 1 [base] ≥" | "This price crosses the order book — your order will fill almost immediately, about $X below current value." |
| Buy  | below best ask    | "When 1 [base] drops to"     | none                                                                                                         |
| Buy  | at/above best ask | "Buy now, while 1 [base] ≤"  | "This price crosses the order book — your order will fill almost immediately, about $X above current value." |

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
- **Multiple — validated live.** The value must be an integer multiple of the step. For **power-of-ten** steps the decimal cap already guarantees this (any value within the allowed decimals is a valid multiple), so nothing more is needed. For **non-power-of-ten** steps (e.g. `lot_size` 0.25, where 0.30 has a legal decimal count but isn't a multiple), the field shows an inline validation message — **"Amount must be a multiple of 0.25 ICP"** (price: "Price must be a multiple of …") — turns its border red, and **Review is disabled** until corrected. The message is **declarative (states what's wrong)**, not an instruction, and carries **no "→" prefix**; it matches the affordability error's style ("Exceeds your free balance — …").

Same rules for both base (`lot_size`) and price (`tick_size`).

**Order-value bounds — `min_notional` / `max_notional`.** Beyond the per-field grid checks, the order's **notional value** (`base amount × price`, expressed in the quote token) must sit within the pair's bounds: at least **`min_notional`**, and — when the pair sets it — at most **`max_notional`** (`max_notional` is `opt`; `null` = no upper cap). This is a cross-field check (it depends on both inputs together), validated live once both fields hold positive values; it shows beneath the amount field, turns the border red, and **disables Review** until corrected. Messages are declarative and quote-denominated: **"Order value must be at least 5 ckUSDC"** / **"Order value can't exceed 50,000 ckUSDC"**. (Values converted from the candid using the quote token's decimals, e.g. `min_notional` 5_000_000 with 6-decimal ckUSDC = 5 ckUSDC.)

**Message precedence.** The two fields validate independently, each showing at most one message. **Price field:** the `tick_size` multiple check. **Amount field:** one message, in priority order — (1) exceeds free balance, (2) not a multiple of `lot_size`, (3) below `min_notional`, (4) above `max_notional`. So affordability is surfaced before the grid check, which is surfaced before the order-value bounds. (`Review` is gated by **all** checks together regardless of which message is currently shown — any single failure disables it.)

**Required fields — empty is not zero.** An empty base amount or price field is treated as "not entered," **not** as 0: the field shows a placeholder, the derived amount shows "—" (no misleading $0), and **Review is disabled**. A typed 0 (or negative) is likewise invalid. Review enables only when both fields hold a positive value **and** both satisfy their step constraint.

#### Fill or kill (order type)

A **Fill or kill** checkbox sits below the price section (default **off**). Its description is **collapsed by default**: a **(?)** next to the "Fill or kill" label expands/collapses a short explanation inline (matching the settings "Active networks (?)" pattern), so the control stays compact until the user asks for detail. The (?) is independent of the checkbox — tapping it only toggles the help, not the FOK state. It is the only order-type control in v1 because the DEX supports just two time-in-force modes:

- **Off — good-’til-canceled (default).** The resting order specced above: it rests in the book until matched or canceled.
- **On — fill or kill.** The order must fill **in full, immediately, at the limit price or better, or be canceled** — it never rests.

When FOK is on, a few things differ because the order no longer rests:

- **It executes now or not at all**; the price is just the worst acceptable limit, and the resting "When 1 [base] reaches…" framing gives way to a "fills in full now" reading.
- **The value-difference becomes a realized give-up** — coloured (amber/red), not the neutral "informational while resting" figure. Crossing the book is the intent here, so the warning is reworded ("Fill-or-kill: fills in full now, about $X below/above current value") rather than a caution.
- **If the price can't cross the book** (sell above best bid / buy below best ask) the order would be canceled, so a red warning shows — "A fill-or-kill order can't execute at this price right now — it would be canceled; lower/raise the price to cross the book" — and **Review is disabled**. FOK only proceeds when its price crosses. Because best bid/ask is **polled live** (see _Live market data_), this self-corrects as the market moves — a "too high" FOK becomes proceedable once the book reaches it.
- **The v1 gate is price-only** (best bid/ask from `get_order_book_ticker`). A price-crossing FOK can still be killed if there isn't enough volume within the limit to fill in **full** — the DEX decides that at execution, so a fill is **never guaranteed**. Size-aware pre-validation (summing crossable volume from `get_order_book_depth`) is feasible since the depth endpoint exists, and is a strong follow-up; even then it can only warn ("may not fill in full"), never promise, because the book can move before the matching tick. See Open questions.
- **It is always a taker.** Because it crosses the book on execution, a FOK can never be a maker — so the Review fee row shows the **taker fee only** ("Fee (taker)"), not the maker/taker pair (see _Fee display_).

The review step shows the order type (e.g. a "Fill or kill" tag) so the user confirms it before placing. This keeps immediate execution on the Limit-order form rather than the Swap tab; a later integration may also expose the DEX as a **Swap provider** with FOK applied automatically (appearing as a normal swap) — a follow-up.

**Dependency:** FOK ships in **v1** (part of the order form — PR 4a). It requires the `add_limit_order` **time-in-force / FOK parameter** on `dfinity/oisy-trade`; this is a **dependency to verify** before/at integration (see Dependencies), not an open design question.

#### Entry point

There is a **single entry** — the Trading tab **Orders** "+ Limit order" link — and it opens the form **empty**: no tokens, blank amount/price (placeholders), derived amount "—", Review disabled, hint "Pick a token to begin". Side defaults to Sell. The user picks a base → the quote picker chains open → picks a quote → lands in the amount field → enters amount and price.

There is intentionally **no per-position "Limit order" shortcut** on the Trading tab asset rows: those rows carry only the inherently per-position **Withdraw** action, keeping rows uncluttered (notably on mobile). Deposits likewise go through the section "+ Deposit" link, not per row. A contextual pre-fill ("trade this holding", token already selected) is a possible later convenience but is out of scope here.

#### Wizard steps

Form → Review → Progress (same pattern as swap).

**Review** — title "Review limit order". The hero keeps the familiar **swap two-box layout** (token logo + amount + fiat per box, joined by an arrow), adapted to the limit-order intent:

- Each box matches the swap review: **label top-left** ("You sell" etc.), token logo + amount + fiat below it — not a label-on-the-right layout.
- **Base token is always the top box, regardless of side** (the order is framed around the base); the quote is the bottom box.
- Labels are **side-aware**: base box reads **"You SELL"** / **"You BUY"** with the **action verb emphasized** (bold uppercase) so the transaction type stands out; the quote box reads **"You get at least"** (Sell) / **"You pay at most"** (Buy) — the read-only, gross/before-fees bound. The amount carries **no ≥/≤ symbol** — the label ("at least" / "at most") already states the bound, so "≥ 41.02" would be redundant.
- The **arrow points to the token you end up with**: **↓** on a Sell (you receive the quote, bottom), **↑** on a Buy (you receive the base, top).

Below the hero, the price-related facts are grouped into a dedicated **price section** (a bordered card), since the limit price is the key value of the order: a prominent **limit price** headline (visually emphasized — e.g. "2.69 ckUSDC / ICP"), with three sub-rows beneath — **current value** ("2.69 ckUSDC / ICP (oisy feed)"), **value difference**, and **"Queue position"** ("15% are ahead" / "Front of book"). Grouping these keeps limit price, what the value is, and where the order sits in the book readable together.

The feed reference is labelled **"current value"** consistently across the form and the Review — the deliberate term distinguishing the oisy price feed from the order-book "market" (best bid/ask), which is surfaced separately in the routing element.

Then the remaining rows: **DEX** (routing); **order type** — **always shown**: "Good until canceled" for a resting order, "Fill or kill" when FOK is on (every order has a type, so it is not hidden when resting); **"Fee (maker / taker)"** with a (?) explanation. If the price crosses the book, the warning box shows **and the "Queue position" sub-row is hidden** (a crossing order fills immediately rather than resting, so it has no queue position); beyond 5% give-up a confirmation checkbox is required before "Place order". _(The "Queue position" row depends on `get_order_book_depth`; omitted if unavailable.)_

Unlike the form, **Review is a stable confirmation surface — it does not live-re-gate** as the book moves (no button flipping under the user). Instead a **final freshness re-check runs at "Place order"**:

- **FOK:** re-checks the price against the **latest** book. It differs from the form only if the book actually moved since Review; if the order would now be killed (no longer crosses), submission is **interrupted** — a "market moved" notice with the updated best bid/ask, and the user goes back to adjust. (In the wireframe a "Simulate market move" control ticks the book so this is demonstrable — set the price to Bid, go to Review, simulate a move, then Place order is interrupted.)
- **GTC:** a resting order is unaffected by a move (it just rests until reached), so there is no block — the re-check is informational only.
- The **>5% give-up** threshold is re-evaluated at submit too, so a market move that pushes it past 5% still requires the confirmation.

**Progress** — single step submitting the order. On success the modal closes and the order appears in the Trading tab Active Orders as Pending; status updates via polling.

#### Insufficient balance

Checked against the token actually spent: the **base free balance** on a Sell, the **quote free balance** (= `base × price`) on a Buy. If the spend exceeds free, it is **soft-validated like the step rules** — an inline message under the amount field ("Exceeds your free balance — 15.4994 ICP available" / "Costs X ckUSDC — only Y free") and **Review is disabled**. **Affordability takes precedence over precision**: if the amount both exceeds the balance and isn't a valid `lot_size` multiple, only the balance message shows — knowing you can't afford it matters more than a rounding nudge.

> _Deferred — inline deposit:_ instead of only blocking, a future version can offer to **deposit the shortfall right from the order form** (token + shortfall pre-filled, opening the deposit flow at its Review step) so the user tops up without leaving. Out of scope for now; the soft block stands in until then.

#### Fee display

The derived amount is always **gross** (before fees). On the form, the routing element expands to show the live maker/taker fees (from `get_trading_pairs`). On review, a single "Fee (maker / taker)" row with a (?) explains that fees are deducted from proceeds at fill time and that maker-vs-taker can't be predicted.

**Exception — Fill or kill is always a taker.** A FOK order crosses the book and executes immediately, so it can only ever be a **taker** (never a maker). When FOK is on, the Review fee row collapses to **"Fee (taker)"** with the taker rate only (e.g. "0.20%") — there's no maker/taker uncertainty to explain. (Resting orders keep the "Fee (maker / taker)" pair, since maker-vs-taker isn't known until they fill.)

## Deposit flow

_Wireframe: [deposit-flow.html](./2026-06-04-feat-limit-orders/wireframes/deposit-flow.html)_

Triggered from the "+ Deposit" link in the Trading tab (no token context). Mirrors the stake wizard: Form → Review → Progress. _(A future inline entry from the order form, pre-filling the shortfall, is deferred — see Insufficient balance.)_

The deposit modal uses the **same chrome as the limit-order modal**: a centered **"Deposit"** title + ✕ with a divider beneath, and the amount field laid out like the order form's — a header with the field label ("You deposit") and the **network** ("On Internet Computer") on the right, the amount + token pill, and a sub-line with the **fiat/amount switcher + $ value** on the left and **Max** on the right.

**Form — elements top to bottom:**

1. **Amount + token field** (the box described above): "You deposit" + network header, the amount input (white field) + token pill, and the switcher + $ value / **Max** sub-line. The token selector lists **DEX-supported tokens the user holds** (the distinct base+quote union, filtered to held balances).
2. **To: OISY TRADE** row — shown on the form (above the fee) so the destination provider is visible before Review.
3. **Transaction fee** — a collapsible row, expanding to the two ledger fees (approval + transfer).
4. **Consent box** — an agreement checkbox ("I understand my tokens will be held by the OISY TRADE canister and are subject to on-chain smart contract risk") that **gates Review**. The box stays **neutral/gray** when checked (not green); only the checkbox fills with the blue accent — matching the stake form.
5. **OISY TRADE info box** — same provider card as the Review: title ("OISY TRADE: on-chain order book") + a **Learn more** link + a one-line description, so the user knows which venue this is and can open more info. (Two boxes total — consent + info — mirroring the stake form.)
6. **Footer** — **Cancel** (soft-blue) + **Review** (blue primary); Review enabled only when the consent box is checked **and** the amount is valid/affordable.

The Review then re-shows the provider as a **To: OISY TRADE** row, ordered **after the Network row** (network belongs to the hero token). Withdraw mirrors all of this with **"From: OISY TRADE"**.

**Max = wallet balance − expected fees.** Because the deposit fees (approval + transfer ledger fees) sit **on top** of the entered amount, Max is **balance minus those fees** — not the full balance — so the total debited (amount + fees) still fits the wallet (e.g. balance 500 ICP, fees 0.0002 → "Max: 499.9998 ICP"). Setting the full balance would overshoot and fail.

**Dust balances (≤ fee).** Max is **clamped to 0, never negative**. A token whose wallet balance can't cover the fee still appears in the picker (we don't hard-filter it); it just shows **"Max: 0"**, which leaves **Review disabled** (no positive amount fits), and any value the user types triggers the affordability validation ("Balance too low to cover the network fee", or "Amount + fee exceeds your balance"). The whole-wallet **empty state** is separate: it replaces the form only when **no** supported token has a depositable balance (> fee). So a dust-only wallet → empty state; a wallet with at least one depositable token → form, where a dust token is still selectable but yields Max 0.

**Review** — modelled on the existing **stake review**: a tinted **hero card** ("You deposit 100 ICP / $269.00"), a **"To: OISY TRADE"** row and a **Network** row ("Internet Computer") — the deposit and withdraw reviews use the **same provider + network row set** for consistency — the **Transaction fee** (kept as our two-line expand/collapse — approval + transfer), and a small **OISY TRADE info card** (the stake form's provider-card slot: a one-line description of where the funds go + a Learn more link). It deliberately has **no "Est. received" row** (a deposit credits the same amount, no conversion) and **no yield row** (a deposit isn't a yield product). **Progress** — Approving → Depositing → Done.

**Empty state — nothing to deposit.** When **no DEX-supported token has a depositable wallet balance** (balance must exceed the ledger fee; dust that can't cover the fee doesn't count), the modal shows an empty state in place of the form — same for a brand-new wallet and for a user who has already deposited everything (both need to acquire a supported token first, so the copy is shared). It states **"Nothing to deposit yet"** and explains that depositing needs a supported token in the wallet, then lists **which tokens OISY TRADE supports** — a **dynamic** list computed as the **distinct union of every base and quote token across the trading pairs** (e.g. ICP, ckUSDC, ckUSDT, ckBTC), shown as token chips. Receive/Buy call-to-action buttons that route to those wallet flows are a **deferred improvement** (not in this version); for now the empty state is informational.

---

## Withdraw flow

_Wireframe: [withdraw-flow.html](./2026-06-04-feat-limit-orders/wireframes/withdraw-flow.html)_

Triggered from the "Withdraw" link on a token row. Form → Review → Progress.

Like deposit, it uses the **shared modal chrome**: centered **"Withdraw"** title + ✕ + divider, the amount field laid out like the order/deposit field (a "You withdraw" + network header, the amount in a **white field**, the pre-selected token, and a sub-line with the **fiat/amount switcher + $ value** on the left and **Max** on the right), and **blue footer buttons**. It has **no consent box and no provider info box** (not needed for an outbound withdraw).

**Form** — token pre-selected; **Max = the full free balance** (unlike deposit: withdraw's entered amount is the **gross** that leaves the account, and the fee comes out of what you receive — so there's nothing to subtract from Max). Reserved balance is shown as a small context note ("X reserved · locked by open orders"). A transfer-fee row, and a **"You receive"** row (amount − transfer fee, updates live). **Review** — modelled on the stake/deposit review: a tinted **hero card** ("You withdraw 150 ICP / $403.50"), a **"From: OISY TRADE"** row (so the user sees which provider the funds come from) and a **Network** row ("Internet Computer") — matching the deposit review's provider + network rows — the transfer-fee row, and the same **"You receive"** row. **Progress** — Withdrawing → Done.

The entered amount is the **gross** — the amount debited from the DEX free balance — so the user receives slightly **less** (gross − transfer fee). This is the inverse of deposit (and of the standard send/swap pattern), where the entered amount is the affected amount and the fee sits on top. Because withdraw breaks that convention, the **"You receive" line is shown explicitly on the form** (not only Review) so the net is never a surprise. _(Same gross/net handling the GLDT stake wizard used.)_

---

## Order detail & cancel

_Wireframe: [order-detail.html](./2026-06-04-feat-limit-orders/wireframes/order-detail.html)_

**Tapping any order row** (Active or History) opens an **order-detail modal** styled like the limit-order Review — there is **no inline Cancel button on the row**. The modal reuses the Review layout: the two-box intent hero (You SELL/BUY + amounts), the **price section** (limit price, current value, value difference, and — for resting orders — queue position), the **DEX / order type / fee** rows, plus a **Status** pill (Pending / Open / Filled / Cancelled). It serves **all order states** — Filled/Cancelled are read-only. (No separate "Reserved" row: in v1 the reserved amount always equals the spend-side amount already shown in the hero — a Sell reserves the base, a Buy the quote — so it would only repeat it. A Reserved/Remaining row would return if partial fills are supported.)

**Cancel** lives inside the modal and only for **active (Pending / Open)** orders: a destructive **"Cancel order"** action (red, mirroring the contacts "Delete contact" pattern). It opens a **confirmation** — a **centered dialog on desktop, a bottom sheet on mobile** — that states the reserved funds return to free balance and that it can't be undone, with the order facts (pair, price, returns-to-free). On confirm: `cancel_limit_order` → reserved returns to free → the order leaves Active and appears in History as Cancelled.

**Static vs live.** The order's **terms are fixed** — base amount, limit price, and the derived **quote bound** (base × limit price). Everything **valuation-relative is recomputed against the current feed/book** and refreshes while the modal is open: all **$ values** (base and quote), **current value** (feed), **value difference** (fixed limit price vs live current value), and **queue position** (live book). **Status** updates via polling.

_(Queue position in the detail uses `get_order_book_depth`, live on staging.)_

---

## Active orders

Shows all Pending/Open orders for the connected user. Each row uses the single-line **order row format** (natural-language intent + outlined provider tag; see _Order row format_), plus a status pill (Pending with spinner, or Open) and the queue position as plain text (shown for both Pending and Open). **Tapping a row opens the order-detail modal** (see _Order detail & cancel_) — there is no inline Cancel button; cancellation happens from inside the detail modal. Status refreshes by polling while the Trading tab is visible; on transition to Filled/Cancelled the order moves to History.

---

## Acceptance criteria

**Common**

- [ ] When the **`Trading` feature flag is off**, the Trading tab is not rendered and no deposit/limit-order/withdraw entry is reachable; when on, the tab is visible and navigates correctly.
- [ ] When **Trading is on but the OISY TRADE provider flag is off**, the Trading tab shows the **"no provider available" placeholder** with no deposit/order/withdraw actions.
- [ ] DEX-deposited tokens are not shown in the Tokens tab list.
- [ ] Hero net-worth total includes DEX free + reserved balances.
- [ ] Trading tab states render correctly (new user / assets-only / full).
- [ ] Deposit flow completes with two visible steps (Approve → Deposit).
- [ ] The "Swap" hero opens the Swap modal (unchanged). The **Limit-order modal is separate** (no Swap/LO tabs), opened from the Trading tab Orders "+ Limit order" link, with the swap modal's chrome (centered "Limit order" title + ✕, boxed sections, footer Cancel/Review buttons, blue accent).
- [ ] Limit order follows Form → Review → Progress; the placed order appears immediately in Active Orders as Pending and updates via polling.
- [ ] Tapping an order row (any state) opens the **order-detail modal** (Review-styled); rows have no inline Cancel button.
- [ ] Only **Pending/Open** orders show a **Cancel order** action in the modal; it opens a confirmation (centered dialog on desktop, bottom sheet on mobile). On confirm, reserved funds return to free balance and the order moves to History as Cancelled. Filled/Cancelled detail is read-only.
- [ ] While the order form is open, best bid/ask and the price feed **refresh on a short interval**; derived state (crossing/immediate-fill warning, value-difference, routing prices, FOK gate) updates accordingly without disturbing the user's typed amount/price.

**Order placement form**

- [ ] A **Buy/Sell segmented control** sits at the top and frames the form; the top token field is the base regardless of side.
- [ ] Switching side re-labels fields, flips preset semantics, **resets the price to current value (0%)**, and re-derives the quote — while preserving tokens and the base amount.
- [ ] Base and quote tokens render in **one merged box**, linked by a connector word: **"for"** (sell) / **"with"** (buy), reading "Sell ICP for ckUSDC" / "Buy ICP with ckUSDC".
- [ ] Both token pills are right-aligned.
- [ ] Only the **base amount** and **price** are editable, rendered as **white bordered fields**; the quote amount is plain read-only text.
- [ ] The derived amount is a **bound**: "at least" (≥) for a Sell, "at most" (≤) for a Buy, labelled gross/before-fees appropriately per side.
- [ ] Quote labels use **get/pay** (Sell → "You get", Buy → "You pay"); Sell/Buy describe the base only.
- [ ] Presets are **`0% · +1% · +5%`** (Sell) / **`0% · −1% · −5%`** (Buy), anchored to current value (oisy feed); the baseline is "0%", never "Spot".
- [ ] A leftmost **Bid/Ask** quick-set (side-labelled) sets the price to the best book price (book-anchored); always available, primarily for FOK.
- [ ] The FOK submit re-check interrupts **only when the book actually moved** since Review (not categorically at the top of book).
- [ ] Value-difference is **neutral while the order rests**, regardless of sign; it turns amber/red only when the price **crosses the order book** (immediate fill), with the warning box.
- [ ] Value-difference renders as **plain coloured text, no background pill** (form and Review alike): neutral = primary-colour text, **not bold**, no icon; crossing 0–5% = amber + warning icon, bold; crossing >5% = red + warning icon, bold.
- [ ] Beyond 5% give-up, a confirmation checkbox is required on review before "Place order".
- [ ] The Review hero uses the **swap two-box layout** (label top-left per box) with the **base token always on top** (either side); base box label is **"You SELL" / "You BUY"** with the action verb emphasized; quote box is the derived bound **"You get at least" / "You pay at most"** (label carries the bound — **no ≥/≤ on the amount**); the arrow is **↓ on Sell / ↑ on Buy** (pointing to the received token).
- [ ] The **order type** row is **always shown** on Review — "Good until canceled" for a resting order, "Fill or kill" when FOK is on — not hidden for resting orders.
- [ ] Review groups price facts into a **price section**: emphasized **limit price** headline + sub-rows **current value** (feed), **value difference**, and **"Queue position"**.
- [ ] **Dependency (verify):** `add_limit_order` on `dfinity/oisy-trade` exposes the time-in-force / FOK parameter, and the integration passes it through.
- [ ] A **Fill or kill** checkbox (default off) is available below the price section: off = resting (good until canceled); on = fill in full immediately or cancel.
- [ ] With FOK **on**, the value-difference is shown as a realized give-up (coloured, not neutral); if the price can't cross the book a red "would be canceled" warning shows and **Review is disabled**. The review step reflects the FOK order type.
- [ ] With FOK **on**, the Review fee row shows the **taker fee only** ("Fee (taker)"); with FOK **off** it shows the "Fee (maker / taker)" pair.
- [ ] Fee rates shown are the **live** per-pair values from `get_trading_pairs` (`maker_fee_bps` / `taker_fee_bps`), not hardcoded, and are **displayed as a percentage** (`bps ÷ 100`, e.g. "0.20%"), never as bps.
- [ ] The dynamic label reflects crossing: "reaches" / "drops to" (resting) vs "Sell now, while ≥" / "Buy now, while ≤" (crossing).
- [ ] **Empty amount or price is not treated as zero**: the field shows a placeholder, the derived amount shows "—", and **Review is disabled**; a typed 0 is also invalid.
- [ ] Review enables only when both inputs are positive **and** both satisfy their step constraint (multiple of lot_size / tick_size).
- [ ] The order's **notional** (`amount × price`, in quote units) must be **≥ `min_notional`** and **≤ `max_notional`** when set (`null` = no cap); a violation shows a declarative quote-denominated message ("Order value must be at least … / can't exceed …") and disables Review.
- [ ] Amount/price fields **hard-limit decimals** to the lot_size/tick_size precision as the user types (extra digits rejected).
- [ ] For a non-power-of-ten step, a value with legal decimals but not a valid multiple shows a **declarative inline validation message** ("Amount/Price must be a multiple of …", no "→" prefix) and disables Review; no apply box, no silent rounding.
- [ ] Quote token picker shows current price, venue count, and an aggregate **Deep/Moderate/Thin** liquidity chip (backed by `get_order_book_depth`) — no per-book bid/ask before routing.
- [ ] **Dependency (verify):** `get_order_book_depth` on `dfinity/oisy-trade` returns per-side `{quantity; price}` levels (live on staging); over-large `limit` returns `LimitTooLarge {max, requested}`.
- [ ] A **queue-position** figure appears on the **form** ("Queue position: 15% are ahead" / "Queue position: Front of book"), the **Review** "Queue position" row, the **order-detail modal**, and **active** (Pending + Open) Active-order rows (compact "15% are ahead" plain text).
- [ ] Formatting: **< 10% shows one decimal and always rounds up** (smallest non-zero value 0.1%); **≥ 10% is a whole number**; zero reads **"Front of book"**.
- [ ] The figure is the share of **same-side base volume at a strictly better price** (asks below a sell / bids above a buy) — an **approximation of FIFO queue position** (the aggregated endpoint can't see intra-level order). It refreshes with the live book on the form and Active rows; it is **omitted entirely if the endpoint is unavailable**, **hidden when the price crosses the book** (immediate fill — no resting position), and never shown for terminal (Filled/Cancelled) orders.
- [ ] The modal opens **empty** (no tokens, blank values, Review disabled, "Pick a token to begin").
- [ ] The **quote selector is inactive until a base is chosen**; once chosen it lists the valid quotes for that base.
- [ ] Picking a base while the quote is empty **chains into the quote picker**, and returning **focuses the amount field**; re-picking a base when a quote is already set does not re-open the quote picker.
- [ ] Changing the base to a different token **resets the amount**; an amount typed before token selection, or re-selecting the same base, is preserved (the field is never locked).
- [ ] Changing **either token** re-anchors the price to current value (0%) of the new pair (or clears the price if the base change leaves no valid quote).
- [ ] _(Deferred)_ Quote-only tokens (e.g. ckUSDC) and **either-order selection** — picking the quote first — are a follow-up; the base selector's quote-only disclaimer ships with it.
- [ ] Routing element shows "Routed via OISY TRADE · best execution"; the order is defined on market data, not a chosen venue.
- [ ] Both rows show the free DEX balance of their token; only the **spend side** has a clickable **Max** (base row on Sell, quote row on Buy).
- [ ] Sell Max fills free base floored to lot_size; Buy Max converts free quote → base via the price (floored to lot_size) and is disabled until a price is set.
- [ ] Insufficient balance (spend > free: base on Sell, quote on Buy) is **soft-validated** — inline message under the amount field + Review disabled; the **balance error takes precedence over the lot error**. (Inline deposit deferred.)
- [ ] Form opens **empty** from the single entry (Trading tab Orders "+ Limit order"); no token pre-fill. Asset rows expose only **Withdraw** (no per-row "Limit order" or "Deposit").

---

## Open questions

1. **Mainnet canister ID** — fill in once deployed.
2. **Token logos** — confirm the oisy registry covers all DEX-listed tokens, or add a fallback.
3. **USD price feeds** — confirm all DEX-listed tokens have USD price data (needed for the hero total and current-value anchor).
4. **Fee rates in `TradingPairInfo`** — _resolved:_ `get_trading_pairs` returns per-pair `maker_fee_bps` / `taker_fee_bps` (nat16), live on staging (maker 0, taker 20). The real rates are displayed in v1; no static notice.
5. **Aggregate liquidity source** — confirm how cross-venue best price / depth is computed once more than one venue exists (v1 has a single venue, so "aggregate" = that venue).
6. **Fill-or-kill parameter** — _resolved:_ FOK is **in v1**. `add_limit_order` exposes the time-in-force / FOK parameter on `dfinity/oisy-trade`; this is tracked as a **dependency to verify** at integration (see the acceptance criteria), not an open design question. (FOK is the only time-in-force the DEX will support — no GTC/IOC choice beyond the resting default.)
7. **Order-book depth — queue position.** _resolved:_ queue position is **in v1**. `get_order_book_depth` is **live on staging** — a `query` returning per-side `asks` / `bids` as `vec {quantity; price}`. Confirmed from the candid: (a) **truncation is signalled, not silent** — over-requesting returns `Err = LimitTooLarge {max, requested}`, so we discover the max and request up to it (or omit `limit` for the default); (b) it aggregates per price level with **no per-order identity or arrival order**, so **FIFO position within a single price level is not knowable** — the "Queue position" figure is an **approximation** computed from strictly-better-priced volume, and the spec keeps that caveat rather than implying an exact slot. The v1 FOK gate remains price-only regardless.
