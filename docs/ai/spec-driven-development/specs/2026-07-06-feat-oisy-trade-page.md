# Spec: OISY TRADE — standalone provider page

This spec follows the workflow defined in [`docs/ai/spec-driven-development/workflow.md`](../workflow.md).

## What we're building

A dedicated, full-width **OISY TRADE page** at `/providers/oisy-trade/` — the home for the
limit-order integration, presented as a standalone provider page alongside the
existing "Trading tab inside Assets" surface. Everything about the _mechanics_ of
trading (deposit-first model, limit-order form, cancel, withdraw, fees, queue
position, privacy mode) is unchanged and continues to be governed by
[`2026-06-04-feat-limit-orders.md`](./2026-06-04-feat-limit-orders.md). This spec
only concerns the **surface**: a standalone provider page, modelled on the other
provider pages (Liquidium borrow, Harvest earn), reached from the new **Finance ›
Trade** navigation entry.

> This is an **expansion** of the limit-orders spec, prompted by the navigation
> redesign ([`2026-06-27-impr-navigation-redesign.md`](./2026-06-27-impr-navigation-redesign.md)),
> which promoted **Trade** to a top-level **Finance** destination at
> `AppPath.Trading` (`/trading/`). The limit-orders spec **stands as-is** and
> remains the source of truth for all trade behaviour; it predates the redesign
> and located the feature as a tab inside Assets. This spec **adds** the
> standalone page — the two surfaces **coexist** (see
> [Where it lives](#where-it-lives)).

---

## Why a page, not a tab

The limit-orders spec put trading in an Assets sub-tab because, at the time, the
flat navigation had no room for a top-level entry. The navigation redesign
introduced the **Finance** group (Trade · Borrow · Earn) with real destinations,
and Borrow (Liquidium) and Earn already render as **standalone provider pages**.
Trade should match them: a single scrollable page that presents the venue
(OISY TRADE), the user's money on it, their orders, and an explainer — the same
shape a user already sees for the other two Finance providers. This also gives
the venue identity room to breathe (icon, name, tagline, "Learn more") in a way a
cramped Assets tab could not.

Consistency note confirmed against the live provider pages: **provider icons are
round.** Liquidium and Harvest both render a circular provider mark, so
OISY TRADE uses a **round** mark too (not a squircle).

---

## Where it lives

- **Route:** the OISY TRADE page is a **provider page** at
  `AppPath.ProvidersOisyTrade` (`/providers/oisy-trade/`) — a cousin of the
  Liquidium provider page (`/providers/liquidium/`) and the Harvest Autopilot
  page, not a Finance _category_ page like `/borrow/` or `/earn/`. With OISY TRADE
  the only trade provider for now, there is no intermediate "Trade" category page;
  the **Finance › Trade** nav entry (with the `NEW` tag, added by the navigation
  redesign) points **directly** at `/providers/oisy-trade/`, bypassing that
  not-yet-needed page. `AppPath.Trading` (`/trading/`) stays as-is, serving the
  Assets Trading tab. _(Relocated from `/trading/` during build — the spec as
  authored placed the page there.)_
- **Gating:** unchanged from the limit-orders spec — the whole surface sits
  behind the **`Trading` feature flag** (off in production until ready, removed
  once shipped), and the **`oisyTrade` provider flag** remains the permanent
  operational kill-switch. With the provider flag off, the page shows the
  "no provider available" placeholder (no deposit / order / withdraw actions),
  exactly as specced for the tab.
- **Relationship to the Assets Trading tab:** the standalone
  `/providers/oisy-trade/` page and the Assets _Trading_ tab (`/trading/`)
  **coexist** as distinct entry points, as the navigation redesign allows. The
  Assets tab is **not** retired by this work. (Possible follow-up, out of scope
  here: simplifying the Assets Trading tab now that the fuller experience lives on
  the standalone page.)

---

## Page structure (top to bottom)

The page is a centered column of cards on the standard app background, with the
app sidebar (desktop) / bottom bar (mobile) around it. Sections in order:

### 1. Hero card — venue identity + money

A single card carrying both _who_ the venue is and _how much you have on it_:

- **Back affordance** (top-left) returning to the previous surface.
- **Venue identity**, centered: the **round OISY TRADE mark**, the name
  **"OISY TRADE"**, a one-line tagline, and a **"Learn more"** link that jumps to
  the explainer section (§5).
  - **Tagline:** "A fully onchain order-book exchange, built into your wallet.
    Set your price, place a limit order, and let it settle onchain." On **mobile**
    only the **first sentence** is shown (the second is hidden) to keep the hero
    compact.
- **Two metric boxes**, side by side on desktop, stacked on mobile:
  - **Trading potential** — the value **in the user's wallet, not yet on the
    exchange** (i.e. depositable balance). Primary **Deposit** CTA (green).
  - **Deposited assets** — the value **held on the DEX** (`free + reserved`),
    with a sub-line breaking it down: **"$X free · $Y in orders"**. **Withdraw**
    CTA (blue). This is the page's expression of the limit-orders spec's
    free/reserved model — "free" is what can be traded or withdrawn now.

The metric boxes are **state-aware** (see §States) — the Deposited box shows the
free/in-orders breakdown only when something is reserved; the Trading-potential
box always offers Deposit.

### 2. My positions

Per-token rows of what the user holds **on the DEX**, reusing the wallet's
token-position layout (icon, symbol, token name) **minus price and 24h change**,
consistent with the limit-orders spec's "My assets" section. Each row shows the
deposited amount and fiat, and an **"in orders"** chip when part of that token is
reserved. Empty state: an icon + "No assets on the exchange yet" + the deposit
prompt.

### 3. Active orders

Open + Pending orders, using the established **single-line natural-language order
row** ("Sell 100 ICP for ckUSDC @ 2.75") with the side word colour-coded
(Sell red / Buy green) and the **status pill** (Open green, Pending amber with
spinner) on the right, per the limit-orders spec. A **New order** button in the
header opens the limit-order modal (disabled with a tooltip when the user has
nothing deposited). Rows are tappable → order-detail modal (§6). Empty state:
"No active orders" with state-dependent copy (see §States).

### 4. Order history

Filled + Cancelled orders in the same row format, with **Filled** (green check)
and **Cancelled** (neutral gray ✕) pills — cancelled is deliberately neutral, not
red. A count summary sits in the header. Empty state: "No past orders yet". Orders
are loaded newest-first, paged up to ~500 via the `get_my_orders` `ByPage` cursor
(the same fetch backs Active orders); there is no "load more" for older history.

### 5. What is OISY TRADE

An explainer card: the venue mark + heading + **"Visit website"** link (to the
docs), a one-paragraph description, and **three feature columns** — _Buy or sell
at your price_ · _Fills even while you're away_ · _Fully onchain_. This is the
landing-page equivalent of the limit-orders onboarding card's "what it is"
content, given permanent room on the page rather than only shown to new users.

### 6. Modals

- **Order detail** — opened from any order row. Shows status, the you-sell /
  you-get boxes (arrow pointing to the token you end up with), limit price,
  current value, value difference, queue position (active orders only), DEX,
  order type, and maker/taker fee — matching the limit-orders spec's detail
  content. Active orders offer **Cancel order**.
- **Cancel confirmation** — a second, smaller dialog: explains funds return to
  free balance, summarises the order (pair, price, amount returned), and asks to
  **Keep order** / **Cancel order**.
- On **mobile** both render as **bottom sheets** (grab handle, full-width,
  bottom-anchored); on desktop as centered modals.

---

## States

The page has **three data states**, selectable in the design for review and
driven by real balances/orders in production:

| State         | Trading potential | Deposited assets              | My positions | Active orders                                          | Order history |
| ------------- | ----------------- | ----------------------------- | ------------ | ------------------------------------------------------ | ------------- |
| **Empty**     | shown (Deposit)   | $0.00 · "Nothing deposited"   | hidden       | empty, deposit-first copy; New order off, Withdraw off | hidden        |
| **Deposited** | shown             | value · "all free"            | shown        | empty, "place one" copy; New order on                  | **hidden**    |
| **Populated** | shown             | value · "$X free · $Y orders" | shown        | real rows                                              | shown         |

Key state rules:

- **Empty** (no deposits, no orders): the page collapses to the essentials — the
  hero, the Active-orders card in its empty state, and the explainer. **My
  positions** and **Order history** are hidden entirely (nothing to show). The
  Active-orders empty copy is deposit-first: _"Deposit tokens from your wallet to
  start placing limit orders on OISY TRADE."_ **New order** and **Withdraw** are
  disabled.
- **Deposited** (has balance, no orders yet): positions show; the Deposited box
  reads all-free. **Order history is hidden** — a user who has deposited but never
  traded has no history, so the empty card is suppressed rather than shown blank.
  The Active-orders empty copy is the standard _"Your open and pending limit
  orders will appear here once you place one."_
- **Populated** (balance + orders): everything shows with real data.

---

## Responsive

- **Desktop:** two-column hero metric boxes; full three-column explainer; app
  sidebar visible; modals centered.
- **Mobile:** app bottom bar; single-column throughout. The **hero is
  condensed** — the two metric boxes become **compact, left-aligned cards**
  (no tall fixed height, smaller value type), matching the OISY Trade mobile
  screen treatment; the tagline shows **first sentence only**; modals become
  **bottom sheets**.

---

## Reused, unchanged from the limit-orders spec

To avoid drift, these are governed by
[`2026-06-04-feat-limit-orders.md`](./2026-06-04-feat-limit-orders.md) and are
**not** redefined here — the page simply presents them:

- Deposit-first model, `free` / `reserved` balances, deposit/withdraw flows.
- The limit-order modal (intent-based Buy/Sell form) and its Review/Progress
  wizard.
- Order-row natural-language format and status-pill colours.
- Queue position, value-difference colouring, maker/taker fee display.
- **Privacy mode** — the page honours the global hide-balances toggle; amounts
  and fiat mask to `•••••`, while pair, provider, status, and prices stay visible.
- Feature flag (`Trading`) and provider flag (`oisyTrade`) behaviour, including
  the provider-off placeholder.

---

## Out of scope / negative guarantees

- Does **not** change any trade **mechanics**, canister methods, or the
  limit-order/deposit/withdraw **flows** — surface only. _One supporting
  exception:_ order loading now pages the newest ≤500 orders via the
  `get_my_orders` `ByPage` cursor (up from a single 100-order page) — a read-only,
  shared-loader change that also benefits the Assets Trading tab; no canister
  methods or write flows change.
- Does **not** alter the navigation redesign's model (one blue signal, Finance
  group); it only repoints the **Finance › Trade** entry to the new
  `/providers/oisy-trade/` provider page and defines what that page renders.
- Does **not** introduce order expiry, market orders, order-book depth view, or
  multiple venues (all still deferred per the limit-orders spec).
- Does **not** change backend, `.did`, or stable state.

---

## Open questions (facts to confirm)

- **Component/route location.** _Resolved:_ the page lives at
  `src/frontend/src/routes/(app)/providers/oisy-trade/+page.svelte`, with its
  components under `src/frontend/src/lib/components/trading/`, modelled on the
  Liquidium provider page. It **reuses** the non-visual layers — the `oisyTrade`
  data/derived + loader, the deposit / withdraw / order-detail / limit-order modal
  flows, and the shared scaffolding (`StakeContentSection`, `StakeContentCard`,
  `FactBox`, `Logo`, `ButtonIcon`, `ExternalLink`) — but introduces **new
  presentation components** for the page (its own position row and order row, hero,
  section cards, info box). Mirroring how the Liquidium and Harvest provider pages
  own their components, the Assets Trading tab is later refactored to reuse these
  new components (that tab redo is **out of scope** here).
- **Provider mark asset.** _Resolved (interim):_ ships with an interim **round**
  mark reusing the Trade line-chart icon (`IconLineChart`, as used in the nav) on
  a branded circle. Dropping in the final OISY TRADE brand mark is a **follow-up**
  once the asset is available.
- **Docs link target.** Confirm the "Visit website" / "Learn more" destination
  (currently `docs.oisy.com/using-oisy-wallet/oisy-trade`).

## Pending decisions (facts clear — need a call)

- **Explainer permanence.** _Resolved:_ the "What is OISY TRADE" card stays
  **always-on** for every user, matching how the Earn and Liquidium provider pages
  keep their "What is …" info box permanently visible.
- **Empty-state depth.** Confirm that hiding My positions + Order history in the
  Empty state (rather than showing empty cards) is the desired minimalism.

---

## Design asset

The resolved design (all three states, desktop + mobile, both modals) lives in
[`./2026-07-06-feat-oisy-trade-page/designs/oisy-trade-page.html`](./2026-07-06-feat-oisy-trade-page/designs/oisy-trade-page.html).

## Post-Merge (per workflow Step 7)

- Update `docs/ai/PRODUCT.md` in the **same PR** as the behaviour change to
  describe the standalone OISY TRADE page (placement, sections, states).
- Remove this spec's `designs/` asset folder after merge; the shipped page +
  `PRODUCT.md` become the source of truth.
