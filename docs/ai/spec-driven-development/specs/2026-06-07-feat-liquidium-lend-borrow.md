# Spec: Lend & Borrow via Liquidium

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## What we're building

Let users **supply (lend)** and **borrow** native assets through the [Liquidium](https://liquidium.fi) cross-chain lending protocol, directly from oisy. This is an integration — the lending logic (pools, interest accrual, collateral accounting, liquidations) runs inside Liquidium's canisters on the Internet Computer. Oisy provides the UX and signs the canister calls with the user's existing identity.

The integration uses Liquidium's official TypeScript SDK, [`@liquidium/client`](https://www.npmjs.com/package/@liquidium/client), via its **account-based profile path** (`client.accounts`, `client.lending`, `client.positions`, `client.market`, `client.quote`). This is the path Liquidium documents for apps that "own a full lending dashboard" — supply, borrow, repay, withdraw, and monitor positions across sessions.

This feature follows the **Earn pattern**, not Trade. (The limit-orders spec, [`2026-06-04-feat-limit-orders.md`](./2026-06-04-feat-limit-orders.md), already states: _"Lend & Borrow (coming later) follows the Earn pattern, not Trade."_) Liquidium appears as a new provider on the existing **Earn** surface and opens a dedicated management page, mirroring how Harvest Autopilot works today.

---

## Scope (v1)

- Connect / create a Liquidium profile for the signed-in oisy identity (transparent, no separate account UX where avoidable).
- **Supply** a supported asset to a Liquidium pool to earn yield (this also becomes collateral).
- **Borrow** a supported asset against supplied collateral, subject to max-LTV.
- **Repay** an open borrow position (full or partial).
- **Withdraw** supplied assets (up to the amount that keeps the position healthy).
- A shared **Liquidium provider page** (`/providers/liquidium/`) showing per-asset positions, supply/borrow APY, portfolio health factor, net value, and net APY.
- Two intent-based entry points: the existing **Earn** page (lend framing) and a **new top-level Borrow page** (borrow framing); both lead to the shared provider page. **Settings moves to the user menu** to keep the nav budget.
- Surface positions on the **Assets page**: supplies in the existing **Earning** tab (alongside other providers), borrows in a new **Liabilities** tab — grouped by type, each card labelled with its provider.
- Liquidium **net value** (supplied − borrowed) is included in the hero net-worth total.

**Supported assets (v1):** BTC (ckBTC), ETH (ckETH), USDC, and USDT — matching Liquidium's advertised markets. Pools that are not yet live on Liquidium mainnet are shown as "Coming soon" and are not selectable (driven by `client.market` pool availability, never hard-coded). See Open questions.

**Not in v1:** accountless Instant Loans, the "Liquidium Loop" leveraged flow, custom vaults, liquidation-dashboard participation, same-asset borrowing UI specialisation (the protocol may allow it per-pool; v1 just respects whatever `client.market` reports), and withdrawing borrowed funds to an external CEX/Ledger address (v1 borrows to the user's own oisy-controlled address only).

---

## Why this approach (integration rationale)

The "optimal" integration was chosen against three constraints: reuse oisy's existing patterns, keep protocol logic on Liquidium's side, and ship safely behind a flag.

1. **Account-based SDK path, not Instant Loans.** The user requirement is to _deposit BTC/USDC/USDT and borrow against that deposit as collateral_, and to manage positions over time. That is exactly Liquidium's "account-based profile flow." Instant Loans is an accountless, single-shot borrow flow with no persistent supply/collateral dashboard, so it does not satisfy the requirement. We use `client.lending` + `client.positions` + `client.accounts`.

2. **Provider-card pattern, two intent-based entries.** oisy already has a config-driven provider-card system (`EarningProvider` in `src/frontend/src/lib/types/earning-provider.ts`, assembled in `src/frontend/src/lib/providers/earning.providers.ts`, cards configured in `$env/earning-providers.json`), where a card's action navigates to a dedicated provider page — exactly like Harvest Autopilot (`HARVEST_AUTOPILOT_PROVIDER_ID`). Liquidium reuses this on **two** surfaces: the existing **Earn** page (lend framing) and a **new top-level Borrow** page (borrow framing), both pointing to one shared provider page. Earn and Borrow are kept distinct because they serve different users — _Earn is the simple, mainstream "get yield" entry; Borrow is the advanced "take on debt for liquidity" entry_ — and Earn deliberately stays even if a DeFi umbrella is added later (see Navigation context → Future direction).

3. **Reuse the swap wizard.** Supply / Borrow / Repay / Withdraw are each a `Form → Review → Progress` modal wizard, reusing the structure and components under `src/frontend/src/lib/components/swap/` (`SwapModal.svelte`, `SwapForm.svelte`, `SwapReview.svelte`, `SwapProgress.svelte`, `SwapModalWizardSteps.svelte`) and the Harvest Autopilot stake wizard as the closest existing precedent.

4. **Feature-flagged.** Gated by a new `LIQUIDIUM_ENABLED` flag following the existing convention (`parseBoolEnvVar(import.meta.env.VITE_LIQUIDIUM_ENABLED)` in a new `src/frontend/src/env/liquidium.ts`, mirroring `EARNING_ENABLED` in `env/earning.ts`). Disabled in production until ready.

---

## Liquidium integration

### SDK

|         |                                                                        |
| ------- | ---------------------------------------------------------------------- |
| Package | `@liquidium/client`                                                    |
| Client  | `LiquidiumClient` (bundles Liquidium mainnet canister IDs by default)  |
| Docs    | https://liquidium-inc.github.io/liquidium-sdk/                         |
| Source  | https://github.com/Liquidium-Inc/liquidium-sdk                         |
| Runtime | Browser `fetch`, `BigInt`, ESM; viem public client for EVM (ETH) reads |

Client construction (in a new `src/frontend/src/lib/api/liquidium.api.ts`):

```ts
import { LiquidiumClient } from '@liquidium/client';

const client = new LiquidiumClient({
	identity, // oisy's signed-in IC identity (for client.lending canister calls)
	evmPublicClient, // reuse oisy's existing Alchemy-backed viem client (ETH/USDT ERC reads) — see Pending decisions
	headers: { 'x-client-name': 'oisy' }
});
```

`environment` defaults to mainnet; `icHost`/`canisterIds` only need overriding for local/staging. The IC identity that oisy already manages for canister calls is passed as `identity` so Liquidium canister calls are signed as the same principal.

> **Note:** the `WalletAdapter` is **not** a constructor option — it is passed **per write call** (`createProfile`, `supply`, `borrow`, `withdraw`). Only `identity` (and optional EVM read config) live on the client. See Open questions → "Identity / signing model".

### Core dependency — the `WalletAdapter` (oisy signer bridge)

**This is the single most load-bearing piece of the integration.** Every Liquidium _write_ flow — profile creation, supply, borrow, repay, withdraw — authorizes through a SDK `WalletAdapter` that oisy must implement, backed by oisy's existing signer(s). It is **one multi-chain adapter** (not one per chain); the SDK calls only the capability methods a given flow needs (all optional):

| `WalletAdapter` method    | Used for                                                       | oisy backing                                        |
| ------------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| `signMessage(req)`        | profile creation, borrow, withdraw (authorization)             | sign with the relevant chain address's key          |
| `sendEthTransaction(req)` | ERC stablecoin / contract-interaction supply, ETH native sends | oisy ETH signer                                     |
| `sendBtcTransaction(req)` | native-BTC transfer-path supply                                | oisy BTC signer (signer canister / threshold-ECDSA) |
| `signPsbt(req)`           | PSBT-based BTC actions (when exposed)                          | oisy BTC PSBT signing                               |

Notes:

- The adapter holds both BTC and ETH capabilities on one object; oisy routes each method to the correct internal signer. It may be composed from per-chain signer helpers, but the SDK consumes a single adapter.
- **Which capabilities are required depends on the rail (see Open questions → "Asset & network representation / rail per leg").** `signMessage` is always needed. `sendEthTransaction` is needed for the ERC stablecoin path. `sendBtcTransaction`/`signPsbt` are needed **only for the native-BTC rail** — if oisy supplies the BTC pool as **ckBTC** (`icrcAccount` target), that leg uses oisy's own ICRC-1/2 ledger transfer + inflow reporting and does **not** touch the adapter's BTC methods.
- Profiles are owned by a wallet **address** + signed message (see Pending decisions → "Profile ownership"), so the adapter's `signMessage`/address wiring also determines profile ownership.

### SDK modules used

| Module                               | Used for                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `client.accounts`                    | Create/reuse the Liquidium profile for the signed-in identity; linked-wallet lookup         |
| `client.market`                      | `pools`, `prices`, pool rate lookups — drives the asset list, APYs, caps, availability      |
| `client.lending`                     | `supply(...)` (deposit **and** repayment), `borrow(...)`, `withdraw(...)`, inflow reporting |
| `client.positions`                   | Per-pool positions, health factor, aggregate stats — drives the dashboard + hero total      |
| `client.quote`                       | `calculateLtv(...)`, `getMinimumBorrowAmount(asset)` — pre-submit validation                |
| `client.activities`/`client.history` | Optional: feed position/transaction history into oisy's Activity view (stretch)             |

> **Repay method (confirmed):** There is **no `client.lending.repay(...)`**. Repaying an account-based position is an inflow on the supply path — `client.lending.supply({ ..., action: 'repayment' })` (`SupplyAction.repayment`). The full-debt amount for the "Max (full debt)" shortcut comes from `client.positions.getMaxRepayAmount(profileId, poolId, bufferBps?)` (principal + accrued interest + small buffer, default 10 bps).

### Key concepts (from Liquidium docs)

**Pools and share-based accounting.** Each asset (BTC, ETH, USDC, USDT) has its own pool with independent, dynamically-adjusting (Aave-style kink) interest rates. Suppliers earn the **supply APY**; borrowers pay the **borrow APY**. Interest accrues continuously via share-based accounting (no per-user cron).

**Supply is collateral.** When a user supplies an asset, it automatically counts toward collateral. Borrowing is over-collateralised: total collateral value must exceed borrow value with a safety buffer.

**Max LTV vs. liquidation threshold.** _Max LTV_ caps how much can be borrowed when opening/increasing a position. _Liquidation threshold_ (higher than max LTV) is where the position becomes liquidatable. The gap is the safety buffer. Both are per-pool; a portfolio with multiple collaterals uses a weighted-average liquidation threshold.

**Health factor.** Portfolio health is surfaced as a percentage: `100%` = no debt; `>0%..99%` = safe (higher is safer); near `0%` = at risk; `0%` = partially liquidatable. oisy displays the percentage form (Liquidium's default).

**Amounts in smallest units.** All SDK amounts are in each asset's base unit — BTC in **satoshis**, USDC/USDT in token base units per pool decimals. oisy converts to/from human units at the UI edge only.

**Minimum borrow amounts.** BTC borrows ≥ `5_100n` sats; USDC/USDT borrows ≥ `1_000_000n` base units. Display the minimum via `getMinimumBorrowAmount(asset)` before submit; block submit below it.

**Native / cross-chain.** Assets enter and leave native (no user-facing wrapped tokens). Under the hood Liquidium uses chain-key assets (ckBTC, ckETH, ckUSDT) and IC Chain Fusion. Supplying BTC pulls from the user's BTC balance; borrowing USDT can target an Ethereum address. v1 keeps funds within oisy-controlled addresses.

### LTV / pre-submit validation

Before any borrow (and before a withdraw that reduces collateral), validate with the SDK so the protocol never receives an invalid request:

```ts
const ltv = client.quote.calculateLtv(
	{ collateralPoolId, borrowPoolId, collateralAmount, borrowAmount },
	pools,
	prices
);
if (ltv.validationErrors.length > 0) {
	// surface ltv.validationErrors[].message inline; disable Review/Confirm
}
```

The same `pools` and `prices` come from `client.market`. `calculateLtv` is a pure helper — safe to call live as the user types (debounced).

---

## Navigation context

This feature **adds one new top-level entry, `Borrow`**, and moves **Settings into the user menu** to stay within the ~5-item nav budget. The top-level nav (`src/frontend/src/lib/components/navigation/NavigationMenuMainItems.svelte`) becomes:

**Assets · Activity · Earn · Borrow · Explore** (Settings → user menu).

(Note: on `main` today, Settings is still a top-level item and there is no Borrow entry; both change here. The limit-orders spec also assumed Settings moves to the user menu.)

### Two intent-based entry points, one provider page

Liquidium is reached from **two** top-level surfaces, framed by user intent, both leading to the **same** Liquidium provider page:

- **Earn** (`/earn/`) — for mainstream users who just want yield. The Liquidium card here is framed around **lending / supply APY**.
- **Borrow** (`/borrow/`) — a new page that mirrors the Earn page's structure but lists **borrow-capable** providers, framed around **borrow cost** (rate/APR). The Liquidium card here is framed around borrowing.

Both cards' actions navigate to the same shared provider page (`/providers/liquidium/`), which contains the full supply + borrow + repay + withdraw experience. Keeping `Earn` and `Borrow` as separate verbs is deliberate: **Earn is the low-knowledge, mainstream "get yield" entry; Borrow is the more advanced "take on debt for liquidity" entry.** They are not merged so the simple use case stays simple.

| Surface                                               | Type            | Purpose                                                                                |
| ----------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| **Liquidium card on Earn** (`/earn/`)                 | Entry point     | Lend framing — supply APY, your supplied value                                         |
| **Liquidium card on Borrow** (`/borrow/`)             | Entry point     | Borrow framing — borrow rate, your borrowing power / debt                              |
| **Liquidium provider page** (`/providers/liquidium/`) | Management view | Per-provider full picture — positions, health, supply/borrow/repay/withdraw            |
| **Assets page tabs** (Earning + new Liabilities)      | Holdings view   | "Where are all my assets/debts?" — positions grouped **by type**, across all providers |

**Grouping principle (Assets page).** On the Assets page, positions are grouped by _type_ (asset vs. liability), **not** by provider. There is no "Liquidium section." A Liquidium supply appears in the **Earning** tab next to Harvest Autopilot stakes; a Liquidium borrow appears in the new **Liabilities** tab. Each card names its provider. Rationale: on Assets the user cares about _what kind_ of holding it is; on the provider page they care about _that provider_.

New routes/constants in `src/frontend/src/lib/constants/routes.constants.ts`:

- `AppPath.Borrow = '/borrow/'` — the new top-level Borrow page. `src/frontend/src/routes/(app)/borrow/+page.svelte` renders a borrow-framed provider list (mirrors the Earn page's `Earning.svelte` structure).
- `AppPath.ProvidersLiquidium = '/providers/liquidium/'` — the shared Liquidium provider page, reached from both the Earn and Borrow cards. A neutral `/providers/` namespace (rather than `/earn/liquidium/`) is used precisely because it is reached from both entry points. `src/frontend/src/routes/(app)/providers/liquidium/+page.svelte` renders it, mirroring how `earn/autopilot/+page.svelte` renders `HarvestAutopilot`. (The breadcrumb reflects the entry point — "Earn › Liquidium" or "Borrow › Liquidium".)
- `AppPath.Liabilities = '/liabilities/'` — the new Assets-page tab. `src/frontend/src/routes/(app)/liabilities/+page.svelte` renders `<Assets tab={TokenTypes.LIABILITIES} />`, mirroring how `earning/+page.svelte` renders `<Assets tab={TokenTypes.EARNING} />`.

### Future direction (north star — not v1)

Later, a single DeFi **umbrella** entry (option 2) may group all providers **technically** — Staking, Lend, Borrow, Trade (limit orders) — as sub-tabs, giving advanced/"degen" users one place for everything. **`Earn` is kept as a top-level entry even then**: it remains the simple, curated, low-knowledge "get yield" surface for mainstream users, while the umbrella serves power users. This also resolves the eventual asymmetry with the in-flight limit-orders/Trade work (currently a Trading tab under Assets). v1 does **not** build the umbrella; it only adds `Borrow` alongside `Earn`, with the shared `/providers/` route chosen so it slots cleanly under an umbrella later.

---

## Where it lives

### Provider cards (Earn page + Borrow page)

Liquidium appears as a provider card on **two** pages. Both reuse oisy's existing `EarningOpportunityCard` / `DefaultEarningOpportunityCard` components, configured via `$env/earning-providers.json` (validated by `env-earning-providers.schema.ts`). To support lending semantics, extend `EarningType` in `src/frontend/src/lib/types/earning-provider.ts` from `'stake' | 'reward'` to `'stake' | 'reward' | 'lending'`, and add the provider data store to `earningDataStores` in `src/frontend/src/lib/providers/earning.providers.ts` (e.g. `LIQUIDIUM_PROVIDER_ID` → `liquidiumEarningData` in a new `src/frontend/src/lib/derived/liquidium-earning.derived.ts`).

**Earn-page card (lend framing).** Mirrors the live Harvest Autopilot card field set for parity: the `APY` badge ("Max. APY", best supply APY across live pools, green), then `NETWORKS`, `ASSETS` (BTC, ETH, USDC, USDT as overlapping logos), `CURRENT_EARNING` (the user's net interest, green, "+ $X/year"), and `EARNING_POTENTIAL` (blue, "+ $X/year"). Structure is constant regardless of position — only values change. `actionText`: "Lend & Borrow". See wireframe [`earn-card.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/earn-card.html).

**Borrow-page card (borrow framing).** Same component, borrow-oriented fields: a badge showing the **borrow rate** (e.g. "Borrow APR from 0.94%", styled as cost not green yield), `NETWORKS`, `ASSETS`, and — when the user has collateral/debt — their **borrowing power** and **current debt + borrow rate**. `actionText`: "Borrow". The Borrow page (`/borrow/`) is structured like the Earn page (`Earning.svelte`) but lists only borrow-capable providers.

**Both cards' actions navigate to the same page:** `goto(AppPath.ProvidersLiquidium)` (`/providers/liquidium/`). The destination is identical; only the card framing and the entry point differ.

### Borrow page (`/borrow/`)

Mirrors the Earn page skeleton (`Earning.svelte`): a header section plus a "Borrowing options" provider list. The header's two summary boxes are the borrow equivalents of Earn's "Earning potential" / "Active earning":

- **Borrowing power** (≈ Earn's "potential") — how much the user could borrow now, based on their best/available provider and current collateral (blue). Shows `$0` / disabled-feel when the user has no collateral.
- **Active loans** (≈ Earn's "active earning") — total currently borrowed, plus **interest per year** (shown as a cost, red, e.g. "− $2,590/year"), plus a **worst-health chip** across the user's borrow accounts (green/amber/red — "Healthy/At risk/Critical · N%"). The worst-health surfacing here is deliberate: this is the most decision-relevant signal on the Borrow page.

Below, the **Borrowing options** list contains the borrow-framed **Liquidium card** only (other borrow providers → "coming soon" placeholder). The card shows a borrow-rate badge ("Borrow APR from X%"), Networks, borrow Assets, and — when the user has debt — "Currently borrowing" and "Interest / year". Its action opens `/providers/liquidium/`. See wireframe [`borrow-page.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/borrow-page.html).

### Dapps carousel slide (promo entry point)

The dapps carousel (`src/frontend/src/lib/components/dapps/DappsCarousel.svelte`) shows promo slides. A slide either opens the **dapp-details modal** (default, explorer-style) or navigates **internally** when given a `pagePath` (handled in `DappsCarouselSlide.svelte`'s `open()` — `nonNullish(pagePath)` → `goto(...)`).

There are **two distinct Liquidium presences here, with separate IDs:**

- **Existing** — the `"liquidium"` entry in `$env/dapp-descriptions.json` already has a `carousel` block. It has **no `pagePath`**, so its slide opens the **dapp-details (explorer) modal**. **Leave it as-is** — it's the dapp-directory listing.
- **New (this spec)** — a **code-synthesized slide with a new id**, opening the Liquidium page, exactly mirroring the `harvestAutopilotSlide` pattern in `DappsCarousel.svelte`:
  - Add a derived `liquidiumSlide` (gated by `LIQUIDIUM_ENABLED`) shaped as `CarouselSlideOisyDappDescription`: a **new unique `id`** (e.g. `LIQUIDIUM_PROVIDER_ID` — distinct from `"liquidium"` so it doesn't collide with the dapp-descriptions entry), `carousel.text` + `carousel.callToAction` (new i18n keys), `logo`, `name`. Prepend it to `dappsCarouselSlides` alongside `harvestAutopilotSlide`.
  - Generalise the `pagePath` prop passed to `DappsCarouselSlide` so each synthesized slide maps to its route: the Harvest slide → `AppPath.Earn` (existing), the new Liquidium slide → `AppPath.ProvidersLiquidium`. So clicking it `goto`s `/providers/liquidium/` instead of opening the dapp modal.

Net: the explorer/dapp-details card stays (id `"liquidium"`); the new carousel card (new id) is a direct promo into the Liquidium provider page, just like Harvest Autopilot's slide deep-links into `/earn/`. See wireframe [`carousel-slide.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/carousel-slide.html).

### Assets page — Earning tab and new Liabilities tab

The Assets page (`src/frontend/src/lib/components/tokens/Assets.svelte`) has a tab bar: today **Tokens · NFTs · Earning** (Earning gated by `EARNING_ENABLED`). This feature adds a fourth tab, **Liabilities**, after Earning.

**Tab model:**

```
Assets page
├── Tokens          spot wallet balances (unchanged)
├── NFTs            (unchanged)
├── Earning         "My assets" — all yield-bearing positions, ALL providers
│                     (Harvest Autopilot stakes + Liquidium supplies)
└── Liabilities     "My liabilities" — all debt positions, ALL providers   ← NEW
                      (Liquidium borrows) — negative decoration
```

**Earning tab (generalised).** Today `EarningsList.svelte` only maps Harvest Autopilot vaults. It is generalised to also list **Liquidium supply positions** as cards. Cards are grouped by type, not provider; each card shows a **provider label** (e.g. "Harvest Autopilot", "Liquidium") so the user can tell sources apart. A Liquidium supply card shows the asset, supplied amount + supply APY, and fiat value.

> **Status: deferred out of the Supply milestone.** An initial `EarningsList` generalization + `LiquidiumEarningCard` were built then **removed** — the Earning-tab holdings view will be tackled separately/differently. For now supplied positions show only on the provider page ("My positions"); the Earn-page provider card is unaffected.

**Liabilities tab (new).** A new `TokenTypes.LIABILITIES` enum value and a `LiabilitiesList.svelte` that lists **borrow positions**, **grouped by provider** (v1: a single "Liquidium" group). Within a group, each card shows the asset, borrowed amount, and a **"negative" decoration** — minus sign on the amount, red/owed styling — to make clear this is debt, not a holding. The interest figure is labelled **"Borrow rate"** (the cost you pay), **not "APY"** — APY/earnings framing is reserved for the asset side, and it is styled as a cost (amber/neutral), never as green yield. The provider is named by the **group header** (so it need not repeat on each card). Empty state when the user has no debt.

> Note: the Liabilities tab is grouped **by provider** (unlike the Earning tab, which is a flat list grouped by type with a per-card provider label). The driver is the health factor below — it is a **per-provider** measure, so it belongs at the provider group level, not per asset.

**Liquidation-risk status (must always be visible).** Debt accrues interest continuously, so a position drifts toward its liquidation threshold over time even with no user action; collateral value can also fall. If the **health factor** reaches the threshold, the provider liquidates collateral. Health factor is computed **per provider** (each provider has its own shared collateral pool and weighted-average liquidation threshold), so it is shown **once per provider group**, not per card.

- **On the Assets → Liabilities tab (compact):** a single colour-coded **health tag next to the provider group title** — e.g. "Healthy at 68%" (green), "At risk at 16%" (amber), "Critical at 7%" (red). One small element; it deliberately does not take a full banner here, to keep the Assets page dense. This risk colour is a **separate axis** from the red "owed" amount styling, so "this is debt" and "this is dangerous" never blur together.
- **On the provider page (`/providers/liquidium/`, large):** the full health display — big percentage, coloured track, "Liquidation at 0%", and an alert with direct **Repay** / **Add collateral** actions when in the amber/red band.
- **On the Liabilities tab label itself (status dot):** a small indicator circle in the top-right of the **Liabilities** tab label, so the user sees a problem even when that tab is not selected. **Amber** when any borrow provider is _at risk_, **red** when any is _critical_, hidden when all are healthy. With multiple providers it shows the **worst** state. Implemented in `Assets.svelte`'s `Tabs` config (the tab gets a status badge derived from the per-provider health stores).

(Active push/notification alerting when health approaches the threshold is a candidate fast-follow; v1 guarantees the always-visible in-app status described here. Exact amber/red band thresholds to match Liquidium's own UI — see Open questions.)

**Nav selection.** `NavigationMenuMainItems.svelte` keeps the **Assets** top-level item highlighted on the Liabilities route: extend `assetsSelected` (currently `isRouteTokens || isRouteNfts || isRouteEarning || isRouteTransactions`) and the `assetsPath` logic to include `TokenTypes.LIABILITIES` / `AppPath.Liabilities`, and add an `isRouteLiabilities` helper in `src/frontend/src/lib/utils/nav.utils.ts`.

**Gating.** The Liabilities tab is gated on the borrow feature flag (`LIQUIDIUM_ENABLED`) so it does not render an empty tab before any borrow provider ships. The Earning tab stays on `EARNING_ENABLED`; Liquidium supply cards within it are additionally gated by `LIQUIDIUM_ENABLED`.

> A Liquidium position set therefore appears across **two** Assets tabs — supplies under Earning, borrows under Liabilities — plus the consolidated per-provider view on `/providers/liquidium/`. This is intended: Assets is organised by type; the provider page is organised by provider.

### Liquidium provider page (`/providers/liquidium/`)

Gated by `LIQUIDIUM_ENABLED`. Three regions:

**Header** — one-line description, "Learn more" link (to Liquidium docs), and a portfolio summary: **Health factor** (percentage with colour: green high → amber → red near 0%), **Net value**, and **Net APY** (can be negative; show sign and colour). Sourced from `client.positions` aggregate stats.

**My positions** — one row per asset the user has supplied and/or borrowed. Each row shows: asset, **Supplied** amount + supply APY, **Borrowed** amount + borrow APY, and fiat equivalents. Row actions: **Supply**, **Borrow**, **Repay**, **Withdraw** (Repay shown only when there's debt in that asset; Withdraw only when there's a supplied balance). Refreshed by polling while the page is visible (same approach as the limit-orders Active Orders polling).

**Markets** — pools the user has not entered yet, each showing supply APY, borrow APY, and a **Supply** CTA. Pools not live on mainnet render disabled with a "Coming soon" pill. Driven entirely by `client.market.pools` availability.

**Three states:**

- _New user (no profile / no positions):_ My positions shows an empty state with a prominent **Supply** CTA; the Markets list is the focus. Borrow actions are disabled until the user has collateral.
- _Has supply, no borrow:_ position rows with Supply/Withdraw; Borrow becomes enabled; health factor shows `100%` (no debt).
- _Has supply and borrow:_ full rows with all four actions; live health factor with colour coding.

### Hero net-worth total

Liquidium **net value** (Σ supplied − Σ borrowed, in fiat) is added to the hero net-worth total, consistent with how the limit-orders spec rolls DEX balances into the hero. Supplied collateral adds to the total; outstanding debt subtracts from it. The hero shows only the total figure — no breakdown label.

**Where positions are visible:** Liquidium supplied/borrowed balances do **not** appear in the **Tokens** tab — that tab is strictly spot wallet balances. Supplies appear in the **Earning** tab, borrows appear in the **Liabilities** tab, and both are summarised on `/providers/liquidium/`. Note that funds the user _received_ from a borrow (e.g. borrowed USDC now sitting in their wallet) are real spot balances and **do** show in Tokens as normal — that is distinct from the protocol-side debt shown under Liabilities.

---

## Action flows

All four actions are modal wizards: **Form → Review → Progress**, reusing `SwapModalWizardSteps.svelte` and the swap form/review/progress components as the structural template. Amount-on-the-left, token/asset context on the right — matching oisy's existing form layout. Fiat equivalents shown throughout in the user's selected currency, using oisy's existing price store.

### Supply (lend)

Entry points: the Markets list "Supply" CTA, and a position row "Supply" action.

**Form** — asset selector (only Liquidium-supported assets the user holds; if a position row launched it, the asset is pre-filled and locked). Amount input with **wallet balance** shown and a "Max" shortcut, plus fiat equivalent. Shows the pool's current **supply APY**, a **Provider fee** row (the protocol's per-inflow fee, in the supplied token, with fiat), the network fee, and an info line that supplied assets also serve as collateral. Agreement checkbox: "I understand my assets will be supplied to the Liquidium protocol and are subject to on-chain smart-contract risk." Review disabled until checked. Button: "Review".

> **Provider fee handling (implemented).** The provider inflow fee is treated as a real cost: the **balance must cover `amount + fee`** (the "Max" shortcut reserves the fee), and the on-chain transfer is `amount + fee` (the protocol deducts the fee on arrival, crediting the net `amount`). There is **no separate below-minimum-amount check** — the affordability check subsumes it.

**Review** — title "Review supply". Hero: "You supply" + amount + fiat. "To: Liquidium" row (provider name from the provider config). Supply APY. Provider fee. Network fee. Back + "Supply".

**Progress** — submits via `client.lending.supply(...)`; the modal closes before settlement (the action is tracked as an `ActiveUserTransaction`). On success the position appears/updates in My positions and health/net value refresh.

### Borrow

Entry points: a position row "Borrow" action; or "Borrow" from a market the user already supplies to. Disabled entirely until the user has collateral.

**Form** —

- **Collateral context:** read-only summary of current collateral and available borrowing power (from `client.positions` + `calculateLtv`).
- **Borrow asset selector** + amount, with fiat equivalent.
- **Minimum borrow** shown from `getMinimumBorrowAmount(asset)`; submit blocked below it.
- **LTV / health preview:** live, debounced `client.quote.calculateLtv(...)`. Show resulting **LTV** and the **projected health factor** with colour. If `validationErrors` is non-empty, show the messages inline and disable Review.
- **Borrow APY** for the selected pool.
- A clear risk line: "Borrowing reduces your health factor. If it falls too far your collateral can be liquidated."

**Review** — title "Review borrow". Hero: borrow amount + fiat. Rows: borrow APY, resulting LTV, **projected health factor** (with the same colour scale as the dashboard). If projected health crosses into the amber/red band, show a warning box; if it crosses a high-risk threshold, require a confirmation checkbox before "Borrow" is enabled (mirrors the limit-orders below-market −5% checkbox pattern). Back + "Borrow".

**Progress** — submits via `client.lending.borrow(...)`. On success, the borrowed asset is delivered to the user's oisy address; the position row updates and health factor refreshes.

### Repay

Entry point: position row "Repay" (only when that asset has debt).

**Form** — asset pre-filled. Amount input with a "Max (full debt)" shortcut that fills the outstanding amount from `client.positions.getMaxRepayAmount(profileId, poolId)` (principal + accrued interest + small buffer). Shows current debt and the **projected health factor after repay** (improves). Wallet balance shown; if insufficient, surface the shortfall clearly. Transaction fee row.

**Review** — title "Review repay". Hero: repay amount + fiat. Rows: remaining debt after repay, projected health factor. Back + "Repay".

**Progress** — submits via `client.lending.supply({ ..., action: 'repayment' })`. On success the debt decreases (or clears) and health factor improves.

### Withdraw

Entry point: position row "Withdraw" (only when that asset has a supplied balance).

**Form** — asset pre-filled. Amount input. The **maximum withdrawable** amount is the larger-of-zero portion of supply that keeps the position healthy (free collateral); show it as a clickable "Max" shortcut and as the cap — the user cannot exceed it. If the user has debt, show the **projected health factor after withdraw** (decreases) live via `calculateLtv`, with warning/confirm if it crosses risk bands (same pattern as Borrow). Reserved-by-debt context line. Transaction fee row.

**Review** — title "Review withdraw". Hero: amount + fiat. "From: Liquidium" row. "You receive" = amount − transfer fee (fee deducted from the withdrawal, unlike supply). Projected health factor. Back + "Withdraw".

**Progress** — submits via `client.lending.withdraw(...)`. On success the supplied balance decreases and net value / health refresh.

---

## Profile bootstrapping

Liquidium account-based flows require a profile. On first entry to the Liquidium dashboard (or first action), oisy calls `client.accounts` to look up an existing profile for the signed-in identity and creates one if absent. This is transparent: the user sees a brief "Setting up Liquidium…" step rather than a separate account-creation screen. If profile creation requires a signature, fold it into the first action's Progress step. See Open questions for the exact `createProfile` signature requirements.

---

## Asynchronous settlement & active transactions

Liquidium actions don't all settle synchronously — native-BTC legs need multiple Bitcoin confirmations (~30–60 min), and even ICRC/canister legs are async. **No Liquidium action blocks its modal until settlement.** Instead, every Liquidium action reuses oisy's existing **active-user-transactions** mechanism (recently added for the OneSec / 1sec integration), which lets the execution modal close immediately while a backend-persisted record tracks the transaction to completion.

**The existing mechanism (OneSec is the reference implementation):**

- Backend (user-profile canister) stores an `ActiveUserTransaction` per user: `id` (FE-generated UUIDv4), `status` (`Pending → Executing → Succeeded | Failed`, transitions enforced by the backend), `external_refs` (learned-mid-flow `{ key, value }` pointers — e.g. a tx hash — that say _where to read status_), `progress_step` (FE-written step label), `data` (a per-integration variant), `updated_at_ns`, and `error`. API: `create`/`get`/`update`/`delete` in `src/frontend/src/lib/api/backend.api.ts`.
- Frontend: `activeUserTransactionsStore` (`src/frontend/src/lib/stores/active-user-transactions.store.ts`, persisted per principal); services `createActiveUserTransaction` / `updateActiveUserTransaction` / `loadActiveUserTransactions` / `applyActiveUserTransactionPollUpdate` (`active-user-transactions.services.ts`); `LoaderActiveUserTransactions.svelte` runs a global poll timer over `activeUserTransactionsPending`; and the active-transactions UI (`ActiveUserTransactionsButton`/`List`/`Item`) surfaces them with an unseen badge. Terminal transactions trigger a wallet/balance refresh once (guarded by `terminalSideEffectsApplied`).

**What Liquidium adds:**

1. **Backend dependency (required).** The `ActiveUserTransactionData` Candid variant is currently OneSec-only (`OneSecEvmToIcp` / `OneSecIcpToEvm`). The backend canister must add Liquidium variant(s) — e.g. `LiquidiumSupply` / `LiquidiumBorrow` / `LiquidiumRepay` / `LiquidiumWithdraw` (or one `Liquidium` variant carrying action + pool + amount). This is a Rust + `.did` change and is a prerequisite for the FE work. See Open questions.
2. **Register on submit.** Each action's **Progress** step calls `createActiveUserTransaction({ identity, id, data, progressStep, externalRefs })`, then the **modal can close before settlement**. The position/loan immediately shows a **pending** state on the provider page and the Earning/Liabilities tabs.
3. **External refs = where to read status.** Store the Liquidium identifiers as `external_refs` (e.g. the loan `ref`, a deposit/activity id, and for native BTC the `tx_hash`). Some are known at submit; others are added via `updateActiveUserTransaction` as they're learned mid-flow.
4. **Poller.** Add `pollLiquidiumActiveUserTransactions` (mirroring `pollOneSecActiveUserTransactions`) and an `isLiquidiumActiveUserTransaction` filter, wired into `LoaderActiveUserTransactions`. It reads status from the Liquidium SDK via the refs (`client.activities` for confirmation-level detail, `client.instantLoans.get` / `client.positions` as applicable) and calls `applyActiveUserTransactionPollUpdate` to advance `status`/`progress_step`.
5. **Terminal side-effects.** On `Succeeded`, refresh Liquidium positions/health and wallet balances once (reuse the existing terminal-refresh path).

This applies to **all four flows** (Supply, Borrow, Repay, Withdraw). The fast ckBTC/ICRC legs simply resolve quickly; the slow native-BTC legs surface as pending and resolve in the background — the user can navigate away or close oisy and the state is re-derived from the backend on return.

See wireframe [`active-transactions.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/active-transactions.html) for how a Liquidium **deposit (Supply)** and **loan (Borrow)** render in the Active-transactions panel, alongside a OneSec swap for parity (status circle, "Liquidium · step" subtitle, confirmation progress, dismiss-on-terminal). _Note: the implemented row is simpler than this wireframe — provider name + status only, no step subtitle or confirmation count (see "Active-transactions — implementation decisions")._

### Sources of truth & reconciliation

The SDK also exposes the user's open/in-flight transactions (`client.activities.list(...)` — receipt/confirmation status; `client.history` — settled history; `client.positions` and `client.instantLoans.get(...)` — current state). So there are two records of an in-flight action: oisy's `ActiveUserTransaction` and Liquidium's own activity view. These are **not co-equal sources of truth** — they have different roles, and defining that prevents disagreement:

- **Liquidium (SDK / protocol) is the source of truth for _state_.** It is authoritative on confirmations, settlement, fills, real debt and health, and it is _complete_ — it includes Liquidium activity the user performed **outside** oisy (e.g. on Liquidium's own app), which oisy's store will never have.
- **oisy's `ActiveUserTransaction` store is a tracking/index projection**, not a state authority. It records "the user started this from oisy + where to read its status" (`external_refs`) and drives the close-early / pending-badge / terminal-side-effects UX. Its `status` is **derived from the SDK, never asserted independently.**

**Reconciliation rules:**

1. **SDK wins on state.** The active-transactions poller maps SDK activity/loan status → `ActiveUserTransaction.status`; never the reverse. The store mirrors the protocol; it does not override it.
2. **The store only covers the gap the SDK can't.** Between "user sent funds" and "protocol detected them" (the `awaiting_deposit`/pre-detection window), the SDK may not yet show the item — that is exactly when the locally-created record bridges. Once the SDK reports terminal, the local record is retired.
3. **Positions and net worth come only from `client.positions`** — never from the active-transactions store. A pending supply shows as "pending" in the Active-transactions panel but is **not** counted in net worth / Earning / Liabilities until `positions` reflects it. This avoids double-counting.
4. **Never write `Succeeded` optimistically.** The backend treats terminal states (`Succeeded`/`Failed`) as final and irreversible, so the poller only transitions to terminal once the SDK confirms — an early `Succeeded` could not be walked back if the protocol later fails the action.
5. **Correlate via `external_refs`** (loan ref / activity id / tx_hash) for idempotent matching. SDK-reported activity that oisy did not initiate has no local record and simply surfaces via `positions` / `history` / the Activity view — which is fine.

Net: **one source of truth for state (the protocol, via the SDK); the `ActiveUserTransaction` store is a derived, oisy-scoped tracking projection over it.**

### Active-transactions — implementation decisions

Discovered during the Supply build; these refine the mechanism above and apply to all four flows.

1. **No custom SDK HTTP headers (CORS).** The Liquidium SDK's REST API (`https://app.liquidium.fi/api/sdk`, used by `client.activities` / `client.history`) only allows `content-type` + `x-request-id` in its CORS `Access-Control-Allow-Headers`. Any extra request header turns a GET into a preflighted request the API rejects, so **every** browser SDK HTTP call fails with `NETWORK_ERROR` ("Failed to fetch") — while IC canister calls (profile, supply) keep working, masking the problem. **Decision: pass no `headers` to `LiquidiumClient`.** (A custom `x-client-name: oisy` header was the root cause of supplies appearing permanently "pending" — the poller's status reads were silently blocked.)
2. **Correlate by on-chain txid only.** The poller matches the SDK activity **solely by the unique on-chain txid**: `client.activities.list({ profileId, filter: all })` then find by normalized txid (`0x`/case-insensitive, also scanning `txids[]`). It does **not** use `client.activities.getStatus`, does **not** persist an `activity_id` ref, and uses **no** pool+kind heuristic — a txid is unique, so every match is exact and may write a terminal status. `filter: all` includes completed activities, so a confirmed/failed leg terminalizes the row. The only persisted status pointers are `liquidium_profile_id` + `liquidium_txid`.
3. **Both rails persist a txid.** ETH supplies use the tx hash from oisy's `send`; native BTC uses the txid now returned by `sendBtc` (previously discarded). `LiquidiumSupplyBroadcast` therefore always resolves to a txid, and `executeLiquidiumSupply` always calls `flow.submit({ txid })` and persists `liquidium_txid`.
4. **No confirmation-progress label.** Liquidium active-transaction rows render provider name + status only — no `progress_step` / `x/y` confirmation count — so BTC and ERC-20 rows are visually aligned. (`progress_step` is never written for Liquidium, and `ActiveUserTransactionItem` does not render it for the Liquidium branch.)
5. **Post-broadcast steps are best-effort.** Once funds are broadcast (point of no return), `flow.submit` + `createActiveUserTransaction` run inside a try/catch (logged, not rethrown). The protocol detects the inflow on-chain regardless and positions self-heal from `client.positions`, so a bookkeeping failure must not surface the supply as failed — only a failure **before/at** broadcast reports failure and returns the user to the form. (Mirrors the OneSec swap flow.)
6. **Analytics lifecycle (mirrors OneSec swaps).** `liquidium_submitted` fires at broadcast time in the service; `liquidium_success` / `liquidium_error` fire from the AUT poller's terminal side-effects in `LoaderActiveUserTransactions`, with metadata built off the row's `external_refs` (so it survives refresh/resume). Events are generic across actions — the action rides in the metadata — mirroring the `swap_submitted` / `swap_success` / `swap_error` lifecycle.

---

## Data, polling, and stores

- A `liquidium.services.ts` (in `src/frontend/src/lib/services/`) wraps the SDK calls and maps results to oisy types/units.
- A derived store (`liquidium-earning.derived.ts`) exposes the user's aggregate position for the Earn card and hero total, and feeds both Assets tabs: the supply side into `EarningsList` and the borrow side into the new `LiabilitiesList`.
- Markets (`client.market.pools` + `prices`) and positions (`client.positions`) are loaded on dashboard open and polled while visible; the hero total subscribes to the positions-derived net value.
- All fiat conversion uses oisy's existing price store and currency setting. ckBTC, ckUSDC, ckUSDT and the ETH/USDT tokens already exist in oisy's token registry (`$env/tokens/...`), so logos and USD price feeds should largely be covered — confirm coverage (Open questions).

---

## Error handling

- SDK/canister errors surface as inline messages on the relevant wizard step; the Progress step shows a clear failure state with a retry where safe.
- `calculateLtv` `validationErrors` are shown inline and block Review/Confirm.
- Below-minimum borrow amounts block submit with the minimum shown.
- Network/identity errors (e.g. EVM RPC unavailable for ETH reads) degrade gracefully: affected pools show "Temporarily unavailable" rather than breaking the whole dashboard.

---

## Acceptance criteria

- [ ] A new top-level **Borrow** entry exists; **Settings moves to the user menu**; nav is Assets · Activity · Earn · Borrow · Explore (gated by `LIQUIDIUM_ENABLED`).
- [ ] Liquidium card appears on **both** the Earn page (lend framing: supply APY) and the Borrow page (borrow framing: borrow rate), hidden in production until ready.
- [ ] Both cards' actions navigate to the same shared provider page `/providers/liquidium/`.
- [ ] A new code-synthesized dapps-carousel slide (new id, gated by `LIQUIDIUM_ENABLED`) opens `/providers/liquidium/` via `pagePath`/`goto` — mirroring Harvest Autopilot; the existing `"liquidium"` dapp-descriptions slide is unchanged and still opens the dapp-details modal.
- [ ] Borrow page header shows **Borrowing power** and **Active loans** (total + interest/year + worst-health chip across accounts).
- [ ] Earn card shows best live supply APY, assets, and (when present) the user's supplied value / net interest; Borrow card shows borrow rate and (when present) borrowing power / debt.
- [ ] Provider page header shows health factor (%), net value, and net APY with correct colour coding.
- [ ] Markets list is driven by `client.market` availability; non-live pools show "Coming soon" and are not selectable.
- [ ] Supply flow (Form → Review → Progress) completes via `client.lending.supply` and the position appears in My positions.
- [ ] Assets page shows a fourth tab, **Liabilities**, after Earning (gated by `LIQUIDIUM_ENABLED`); the **Assets** top-level nav item stays highlighted on the Liabilities route.
- [ ] Earning tab lists Liquidium **supply** positions alongside Harvest Autopilot stakes; each card shows a provider label.
- [ ] Liabilities tab lists **borrow** positions **grouped by provider**; cards use a negative decoration (minus amount, red/owed styling); empty state when no debt.
- [ ] On the Liabilities tab the interest figure is labelled "Borrow rate" (a cost), never "APY"; it is not styled as green yield.
- [ ] Each provider group shows a single compact, colour-coded health tag next to its title ("Healthy/At risk/Critical at N%"); health is per-provider (one tag per group, not per card).
- [ ] The full/large health display (percentage, track, Repay / Add collateral actions) lives on the provider page `/providers/liquidium/`, not on the Assets tab.
- [ ] The **Liabilities** tab label shows a status dot (top-right) — amber if any provider is at risk, red if any is critical, hidden when all healthy, worst-of when multiple — visible regardless of which Assets tab is active.
- [ ] Risk colour is on a separate axis from the red "owed" amount styling.
- [ ] Positions are grouped by type, not provider — no "Liquidium section"; supplies under Earning, borrows under Liabilities.
- [ ] Supplied/borrowed balances are not shown in the Tokens tab; hero net-worth adds supplied collateral and subtracts outstanding debt (net value).
- [ ] Borrow is disabled until the user has collateral.
- [ ] Borrow form shows minimum borrow (`getMinimumBorrowAmount`) and blocks submit below it.
- [ ] Borrow form runs live, debounced `calculateLtv`; surfaces `validationErrors` and disables Review on error.
- [ ] Borrow review shows resulting LTV and projected health factor; high-risk borrow requires a confirmation checkbox.
- [ ] Borrow delivers funds to the user's oisy address and updates the position + health factor.
- [ ] Repay flow supports partial and "Max (full debt)"; debt decreases/clears and health factor improves.
- [ ] Withdraw flow caps the amount at free (non-collateralising) supply and cannot exceed it.
- [ ] Withdraw with outstanding debt shows projected health factor and warns/confirms on risk-band crossings.
- [ ] Withdraw "You receive" reflects amount − transfer fee.
- [ ] A single multi-chain `WalletAdapter` backed by oisy's signer(s) satisfies every write flow's signing (`signMessage` always; `sendEthTransaction`/`sendBtcTransaction`/`signPsbt` per the rail decision).
- [ ] Liquidium profile is created/reused transparently on first interaction: `getProfileId(walletAddress)` → if null, `createProfile({ account, chain, walletAdapter })` (signature-gated), folded into the first action's Progress step.
- [ ] All amounts sent to the SDK are in base units (sats / token base units); UI shows human units and fiat.
- [ ] Positions and health update via polling without a page reload.
- [ ] Every Liquidium action (Supply/Borrow/Repay/Withdraw) registers an `ActiveUserTransaction` and the modal can close before settlement; the position/loan shows a pending state and resolves via the global active-transactions poller, surviving refresh and navigation.
- [ ] Native-BTC legs surface as pending (no per-leg confirmation count — see "Active-transactions — implementation decisions"); ckBTC/ICRC legs resolve quickly; terminal success refreshes positions/health/balances once.
- [ ] All four wizards reuse the Form → Review → Progress structure and oisy form layout.

---

## Not yet specified (to flesh out)

Aspects this spec has not detailed yet — captured here as a reminder; each needs its own pass before or during the build.

- **Analytics / track events.** _Supply action lifecycle is done_ — `liquidium_submitted` (at broadcast) + `liquidium_success` / `liquidium_error` (from the AUT poller), generic across actions with the action in metadata (see "Active-transactions — implementation decisions"). _Still to do:_ page opens (Earn, Borrow, provider page), card/carousel-slide opens, health-risk events, and the borrow/repay/withdraw lifecycles (which reuse the same event shape).
- **Disabled networks.** Make the feature work and look right for users who have **Ethereum or Bitcoin disabled** (in their network settings / `userNetworks`) — possibly both. Pools on a disabled network should degrade gracefully (hidden, or clearly disabled with a hint); Markets, cards, and asset selectors must not offer unusable options; and net-worth / positions math must stay correct. Define the behaviour for each disabled-network combination (ETH off, BTC off, both off).
- **Feature and provider flags (runtime kill-switch).** Beyond the build-time `LIQUIDIUM_ENABLED` flag, keep a **runtime provider-level flag in production** so a provider can be temporarily disabled without a full code-change cycle — e.g. if a Liquidium SDK issue is detected, flip a flag (config + redeploy, or remote config) and the app hides/disables the provider and blocks new actions gracefully while everything else keeps working. Define where the flag lives (env/config vs. remote-fetched) and the disabled-state UX (are existing positions still viewable? are in-flight active transactions still tracked? new actions blocked with a notice?).

---

## Open questions (facts to confirm)

Verified against the installed SDK (`@liquidium/client` v0.3.0, `node_modules/@liquidium/client/dist/index.d.ts`) and the oisy codebase. Six of seven are resolved; #7 is the only one the SDK cannot answer.

1. **Liquidium mainnet readiness per asset** — **Resolved (mechanism).** The `Pool` type exposes no "coming soon" field. Availability is derived at runtime: `client.market.listPools()` returns only pools that exist, each carrying `frozen: boolean` and optional `supplyCap`/`borrowCap`. **Gating rule:** a pool absent from `listPools()`, or with `frozen === true`, or at cap → render "Coming soon"/disabled; never hard-code the asset list. The live mainnet set is whatever `listPools()` returns at load time. (`Pool`, `MarketModule.listPools`, `getPoolRate`.)
2. **Repay method** — **Resolved (corrects an earlier assumption).** There is **no `client.lending.repay(...)`**. For an account-based position, repayment is `client.lending.supply({ ..., action: 'repayment' })` (`SupplyAction.repayment`). `client.positions.getMaxRepayAmount(profileId, poolId, bufferBps?)` returns the full-debt figure (principal + accrued interest + small buffer, default 10 bps) backing the "Max (full debt)" shortcut. (`LendingModule.supply`, `SupplyAction`, `PositionsModule.getMaxRepayAmount`.)
3. **Identity / signing model** — **Resolved.** Both are required and operate at different layers. `identity` is passed once at `new LiquidiumClient({ identity })` for signed IC canister calls. The `WalletAdapter` is passed **per write call** (not at construction) for address-scoped signatures: `createProfile({ account, chain, walletAdapter })`, `borrow`/`withdraw` take `{ signerChain, signerWalletAdapter }`, and `supply` takes `Pick<WalletAdapter, 'sendBtcTransaction' | 'sendEthTransaction'>`. All `WalletAdapter` methods are optional; the SDK invokes only the capability a given flow needs. (`LiquidiumClientConfig`, `WalletAdapter`, `WalletExecutionParams`.)
4. **Token/price coverage** — **Resolved.** Every Liquidium asset is already in oisy's registry with matching contract addresses and USD price feeds: ckBTC, ckETH, ckUSDC (`xevnm-gaaaa-aaaar-qafnq-cai`), ckUSDT (`cngnf-vqaaa-aaaar-qag4q-cai`), native ETH, ERC-20 USDC (`0xA0b8…48`) and USDT (`0xdAC1…ec7`) — the last two exactly matching the SDK's `USDC_CONTRACT_ADDRESS`/`USDT_CONTRACT_ADDRESS`. Prices come from oisy's existing exchange services (CoinGecko, with IcpSwap/KongSwap fallbacks). **No registry additions needed.**
5. **Asset & network representation / rail per leg** — **Resolved (mechanism).** The SDK returns the rail per leg as a discriminated `SupplyTarget = NativeAddressSupplyTarget | IcrcAccountSupplyTarget` (`type: 'nativeAddress' | 'icrcAccount'`) on the `SupplyFlow` from `client.lending.supply(...)`. oisy **does not hard-code the rail** — it inspects `flow.target.type` and routes: `icrcAccount` → oisy ICRC-1/2 ledger transfer (near-instant; e.g. ckBTC) then `flow.submit(...)`/`submitInflow`; `nativeAddress` → native send via the adapter (`sendBtcTransaction`/`sendEthTransaction`, confirmation-bound). The **Networks** field labels the economic asset (BTC/ETH); the rail is an execution detail, surfaced not chosen. The exact target a given pool returns is a runtime fact the SDK reports per call, so oisy handles both branches. ckBTC is the same BTC market via the ICRC rail, **not** a separate "ckBTC market" — present it as BTC. (`SupplyTarget`, `SupplyFlow`, `SupplyAction`.)
6. **`client.activities` contract** — **Resolved.** `client.activities.list({ profileId | shortRef, filter })` returns `Activity[]` (`InflowActivity` {deposit|repayment} ∪ `OutflowActivity` {borrow|withdraw}); each record carries `id`, `poolId`, `asset`, `chain`, `amount`, `txid`, `txids[]`, `confirmations`, `requiredConfirmations`, `status`. `client.activities.getStatus({ … })` polls a single activity/receipt. These key cleanly to oisy's `external_refs` — the implementation correlates **only** by `txid` (see "Active-transactions — implementation decisions"); `confirmations`/`requiredConfirmations` are available but not surfaced. `client.history.getUserTransactionHistory(user, …)` provides settled history (`type: supply|borrow|repay|withdraw`). (`ActivitiesModule`, `Activity`, `HistoryModule`.)
7. **Health-factor band thresholds** — **Resolved (no protocol bands exist).** Liquidium publishes no discrete amber/red cut-offs; its docs describe health as a continuous gradient (100% = no debt, >0–99% = safe/"higher is safer", near 0% = at risk, 0% = partially liquidatable), and the SDK exposes only the raw value (`HealthFactor.healthFactor`, scaled by `RATE_SCALE`/`RATE_DECIMALS`) with no band constants. oisy therefore **chooses its own display bands**, anchored to those semantics: 🟢 Healthy ≥ 50%, 🟠 At risk 15–50%, 🔴 Critical < 15%. Defined once in a constant and reused by the Liabilities tag, the status dot, and the provider-page health display.

---

## Pending decisions (facts are clear — we just need to decide)

The facts are understood; these need a product/architecture call.

1. **Profile ownership** — **Decided: ETH-owned, single profile.** oisy can `signMessage` only on the ETH key today (`eth_personal_sign`/EIP-191; the BTC signer signs transactions, not arbitrary messages — no BIP-322), and profile creation/borrow/withdraw are signature-gated via `walletAdapter.signMessage`. So the profile is owned by the user's **ETH address** (`createProfile({ account: <eth>, chain: 'ETH', walletAdapter })`; `borrow`/`withdraw` use `signerChain: 'ETH'`). A **single** profile is used (one cross-collateral pool, one health factor); other addresses can be associated later via `listLinkedWallets`. Profile ownership is independent of the funds rail — BTC/ckBTC collateral still enters via the transfer rail (`sendBtcTransaction`/ICRC + `submitInflow`), which needs no message signing. (A BTC-owned profile is a future option gated on adding BIP-322 signing to oisy.)
2. **EVM RPC config** — **Decided: reuse oisy's existing Alchemy viem client; no new env var.** The SDK's `LiquidiumClientConfig` accepts `evmPublicClient?: EvmReadClient` (a viem public client), and oisy already builds one against Alchemy (`alchemy.providers.ts`, keyed by `VITE_ALCHEMY_API_KEY`). Pass that client as `evmPublicClient` rather than adding a `VITE_EVM_RPC_URL`/raw URL — no new secret, reuses oisy's provider config. If the Alchemy key is unset or Ethereum is disabled, ETH-side pools degrade to "temporarily unavailable" (see Error handling / Disabled networks).
3. **Withdraw destinations** — **Decided: fast-follow, not v1.** v1 delivers all borrows/withdrawals to the user's own oisy-controlled address only. The SDK supports external receivers (`receiverAddress` on `borrow`/`withdraw`; `ExternalOutflowReceiver`), but external-address withdrawal (CEX/Ledger) adds per-chain address validation and wrong-address-loss safeguards that the core wizards don't otherwise need — deferred to a fast-follow once the core lend/borrow loop is proven. (Already reflected in Scope → "Not in v1".)
4. **Active liquidation alerting** — **Decided: fast-follow.** v1 ships the always-visible in-app health status only (Liabilities tag, status dot, provider-page display). _Active_ alerting (push/email/in-wallet notification as health nears the threshold) is deferred — it requires a background health-watch trigger and a delivery channel beyond what the core wizards need. Revisit as a fast-follow once the in-app surfacing is validated.
5. **Backend `ActiveUserTransactionData` variant** — **Decided: a single `Liquidium` variant with an action field.** Add one `Liquidium : LiquidiumData` variant to `ActiveUserTransactionData` (Rust + `.did`), where `LiquidiumData = { action: LiquidiumAction (Supply|Borrow|Repay|Withdraw), pool_id: text, token: TokenId, amount: nat }`. The four actions share this shape; dynamic/learned-mid-flow values (loan ref, activity id, tx_hash, receiver) ride in the existing `external_refs` — the type's intended escape hatch — rather than bespoke per-action fields. This keeps one Candid type and one validation arm, and a future action becomes a new enum value, not a new variant. (Contrast OneSec's per-direction variants, which exist because their payloads genuinely differ.) Prerequisite: lands before the FE wiring. See "Asynchronous settlement & active transactions".
6. **[PARKED — revisit] Risk on the hero/overview** — since debt grows on its own, **decide** whether to surface a small health indicator near the net-worth total (visible whenever the user holds debt), so a user who never opens the Liabilities tab is still warned. Deferred by request.

---

## References

- Spec-driven workflow: [`docs/ai/spec-driven-development/workflow.md`](../workflow.md)
- Template / sibling spec: [`2026-06-04-feat-limit-orders.md`](./2026-06-04-feat-limit-orders.md)
- Wireframes: [`./2026-06-07-feat-liquidium-lend-borrow/wireframes/`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/) — Earn-page card ([`earn-card.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/earn-card.html)); Borrow page ([`borrow-page.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/borrow-page.html), full-page incl. nav: [`borrow-page-full.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/borrow-page-full.html)); Liquidium provider page ([`dashboard.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/dashboard.html)); flows ([`supply.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/supply.html), [`borrow.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/borrow.html), [`repay.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/repay.html), [`withdraw.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/withdraw.html)); Assets-page tabs ([`earning-tab.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/earning-tab.html), [`liabilities-tab.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/liabilities-tab.html)); active transactions ([`active-transactions.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/active-transactions.html)); carousel slide ([`carousel-slide.html`](./2026-06-07-feat-liquidium-lend-borrow/wireframes/carousel-slide.html))
- Liquidium SDK docs: https://liquidium-inc.github.io/liquidium-sdk/
- Liquidium SDK (npm): https://www.npmjs.com/package/@liquidium/client
- Liquidium core concepts: https://liquidium.fi/docs/quick-start/core-concepts
