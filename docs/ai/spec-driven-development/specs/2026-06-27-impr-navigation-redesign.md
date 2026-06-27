# Navigation redesign — grouped sidebar (desktop) and bottom bar with cradle (mobile)

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Motivation

OISY's primary navigation is currently a single flat list shared by the desktop
sidebar and the mobile bottom bar (`src/frontend/src/lib/components/navigation/NavigationMenuMainItems.svelte`):
Assets, Activity, Earn, dApp Explorer, Rewards/Airdrops, Settings. There is no
concept of grouping. As the product grows (Trade, Borrow, Earn, NFTs, Notes), a
flat list no longer scales and the relationship between related destinations is
invisible.

This redesign introduces grouped navigation with a single, unambiguous
"selected" signal, expressed differently for the two form factors:

- **Desktop** — a vertical sidebar that lays out **all groups at once** under
  section headings (Portfolio / Finance / More). Nothing is hidden behind a tap.
- **Mobile** — a bottom bar where the Finance group is a raised center "cradle"
  button and More is the right-hand entry; both open a **bottom sheet**.

The resolved design lives in
[`./2026-06-27-impr-navigation-redesign/designs/navigation-final.html`](./2026-06-27-impr-navigation-redesign/designs/navigation-final.html).

This builds on the personal-notes work — PR #13134
(`feat/frontend/personal-notes-modal`), the final wave of
`docs/ai/spec-driven-development/specs/2026-06-17-feat-personal-notes.md`, which
adds **Notes** as a user-menu item that opens a modal. The new navigation
surfaces Notes directly (see [Notes](#notes-interim-modal)).

## The core model — one blue, transient states are not blue

There is exactly **one** "you are here" signal, and it is blue. It always lands
on the actual page the user is on — never two things at once.

- **Blue** — the current page. Only ever one.
- **Grey pill / fill** — a submenu/sheet is open _over another page_ (a
  "pressed/open" state, not a selection). The page underneath keeps its blue.
  **Mobile only** — see below.
- **Blue pill / fill** — a submenu/sheet is open _over its own page_ (you are on
  a page inside that group and its sheet is open). The parent stays blue with a
  blue "open" treatment; the active child is marked inside. **Mobile only.**

**The grey/blue "open" states only exist on mobile.** On desktop every group is
always visible, nothing opens as a transient sheet, so there is never a
"menu-open" signal — the current page simply takes the blue pill wherever it is.

## Information architecture

The grouping is **intentionally different per form factor** (confirmed with the
PM): the mobile bar has a limited number of slots, so Notes earns a top-level
slot while NFTs is tucked into the More sheet; the desktop sidebar has room, so
NFTs sits in Portfolio next to Assets and Notes lives in the More group.

### Desktop sidebar

| Heading       | Items                                        |
| ------------- | -------------------------------------------- |
| (logo)        | OISY WALLET                                  |
| **PORTFOLIO** | Assets · **NFTs** · Activity                 |
| **FINANCE**   | Trade _(NEW)_ · Borrow _(NEW)_ · Earn        |
| **MORE**      | Explore · **Notes** · Settings · **Rewards** |
| (footer)      | social links (X, GitHub)                     |

### Mobile bottom bar

Five slots, left to right: **Assets · Activity · Finance (cradle) · Notes ·
More**.

- **Finance (cradle)** sheet: Trade, Borrow, Earn.
- **More** sheet: **NFTs**, Explore, Settings, **Rewards**.

### Route mapping (`src/frontend/src/lib/constants/routes.constants.ts`)

| Nav entry | Destination / behaviour                                                   |
| --------- | ------------------------------------------------------------------------- |
| Assets    | `AppPath.Tokens` (`/`), preserving the active-assets-tab behaviour        |
| NFTs      | `AppPath.Nfts` (`/nfts/`) — now a nav item + page, not an Assets tab      |
| Activity  | `AppPath.Activity`                                                        |
| Trade     | `AppPath.Trading` (`/trading/`), labelled "Trade", `NEW` tag              |
| Borrow    | `AppPath.Borrow` (`/borrow/`) — Liquidium, `NEW` tag (see open questions) |
| Earn      | `AppPath.Earn` (`/earn/`), labelled "Earn"                                |
| Explore   | `AppPath.Explore`                                                         |
| Notes     | opens the Notes modal (`modalStore.openNotes`) — interim                  |
| Settings  | `AppPath.Settings`                                                        |
| Rewards   | `AppPath.Rewards` / Earn rewards — see [Rewards](#rewards)                |

Naming distinction the PM confirmed: the **Finance** group uses **Earn**
(`/earn/`) and **Trade** (`/trading/`) as standalone destinations — _not_ the
**Earning** (`/earning/`) and **Trading** tabs that live inside Assets.

## Desktop — sidebar

Around `NavigationMenu.svelte` / `NavigationMenuMainItems.svelte`. All three
groups render at once under their headings; the logo header and a social-links
footer bracket them.

- **No expand/collapse, no chevrons** — every group is always open.
- **No grey/blue "open" state** — the only signal is the single **blue pill**,
  which moves to whichever page is current (e.g. on NFTs the pill is on NFTs
  under Portfolio; on Trade it is on Trade under Finance).
- Section headings (Portfolio / Finance / More) are non-interactive labels, not
  destinations.
- Trade and Borrow show a **`NEW`** tag (the existing `tag` / `tagVariant`
  support on `NavigationItem.svelte` — `tagVariant="emphasis"` — is reused).

## Mobile — bottom navigation

Around `MobileNavigationMenu.svelte`. Five slots: **Assets · Activity · Finance
(cradle) · Notes · More**. The Finance cradle is a raised center button (layers
icon). Finance and More each open a **bottom sheet** of their children; opening
a sheet sets `bottomSheetOpenStore`, which already hides the bar
(`MobileNavigationMenu.svelte`).

States (clusters 1–4 of the design):

1. **On a top-level page** (Assets / Activity / Notes-page-equivalent) → that
   item is blue.
2. **A sheet is open while you stay on the current page** → the current page
   keeps its blue; the opened group (cradle or More) takes the **grey**
   "pressed/open" fill. Selection has not changed.
3. **On a page inside a group, sheet closed** → the group's entry (cradle /
   More) turns **solid blue**; nothing is grey because nothing is open.
4. **On a group page with that group's sheet open** → the group's entry is
   **blue with a blue "open" fill** (it owns your current page _and_ is open),
   and the active child is marked selected inside the sheet.

## NFTs becomes a nav item and a page

NFTs **leaves the Assets internal tabs** and becomes a first-class destination
backed by its own page at `AppPath.Nfts` (`/nfts/`): on desktop under
**Portfolio**, on mobile inside the **More** sheet. `isRouteNfts` already exists.
The Assets tab for NFTs (`TokenTypes.NFTS` in `activeAssetsTabStore`) is removed
so NFTs is reached only via the nav item.

## NFTs page hero — counts, not value

On the NFTs page (`/nfts/`) the hero no longer shows the fiat **AUM / total
balance** (`ExchangeBalance`) used on the Assets pages — an NFT portfolio has no
meaningful single fiat figure. Instead the hero shows:

- a prominent **total NFT count** ("12 NFTs"; "0 NFTs" when empty; singular
  "1 NFT"), and
- a row of **per-network count pills** — one per network the user holds NFTs on,
  each rendered "{network} · {count}" (e.g. "ICP · 8", "Ethereum · 3",
  "Base · 1"), ordered by count descending.

The counts come from the same enabled-NFT set the list renders
(`getEnabledNfts({ $nftStore, $enabledNonFungibleNetworkTokens })`), so the hero
total always matches the list. The hero keeps its existing action row (Receive,
etc.) and the `selectedNetworkNftUnsupported` inflow-disabled rule. Privacy mode
does **not** hide the counts (they are not fiat balances). On a collection page
the existing collection hero is unchanged.

Grounding: `HeroContent.svelte` already derives `isNftsPage`; this adds an
`isNftsPage` branch that renders the NFT-count hero instead of `ExchangeBalance`.

## Assets tabs — unchanged except NFTs

Per the PM: **the Assets internal tabs remain.** Assets keeps its tab behaviour
(`activeAssetsTabStore`, `assetsPath` logic in `NavigationMenuMainItems.svelte`)
for Tokens / Earning / Trading. Only **NFTs is removed** from the Assets tabs
(promoted above). The standalone Finance destinations (Earn `/earn/`, Trade
`/trading/`) coexist with the Assets Earning/Trading tabs as distinct entry
points.

## Notes (interim modal)

For now, the **Notes** nav item opens the existing modal
(`modalStore.openNotes`, `modalNotes` derived, `NotesModal` from PR #13134) — it
is _not_ yet a page. On mobile Notes is a top-level bar slot; on desktop it is an
item in the More group.

Because the modal is a transient overlay, not a destination, Notes never takes
the blue "current page" treatment in this interim (there is no Notes _page_ to be
"on"). On **mobile**, while the modal is open Notes shows the **grey
"pressed/open"** state and the underlying page keeps its blue. On **desktop**,
where the grey state does not exist, Notes shows no blue while its modal is open;
the underlying page keeps its pill.

**Follow-up (out of scope here):** promote Notes to a real page (like NFTs), at
which point it earns the blue treatment exactly as "On Notes" shows.

## Rewards

Rewards/Airdrops is **no longer a top-level item**; its content lives inside the
**Earn** page. Per the PM, a **Rewards** entry is nonetheless added to the
**More** group on both platforms (desktop More group and mobile More sheet),
even though the current mockup does not draw it. Today's `EARNING_ENABLED` flag
toggles between an Earn item and a Rewards/Airdrops item in
`NavigationMenuMainItems.svelte`; that conditional is superseded by the new IA —
confirm the flag's remaining role during build.

## Grounding in current code

Files this redesign will most likely touch (FE only):

- `src/frontend/src/lib/components/navigation/NavigationMenuMainItems.svelte` —
  the shared item list; becomes group-aware and renders the two layouts.
- `src/frontend/src/lib/components/navigation/NavigationMenu.svelte` (desktop
  shell — adds section headings + footer social links) and
  `MobileNavigationMenu.svelte` (mobile shell — adds the cradle + sheets).
- `src/frontend/src/lib/components/navigation/NavigationItem.svelte` — reused for
  leaf items (already supports `tag` / `tagVariant` for the `NEW` badge);
  complemented by a bottom-sheet child variant for mobile.
- New (mobile only): a **cradle** button and a **bottom-sheet** group. Search
  `docs/ai/frontend/reusability.md` for an existing sheet/disclosure before
  adding (reuse over rebuild). Desktop needs **no** new disclosure component —
  groups are static headed lists.
- `src/frontend/src/routes/(app)/+layout.svelte` — composition of sidebar +
  bottom bar.
- `src/frontend/src/lib/utils/nav.utils.ts` — add `isRouteTrading` /
  `isRouteBorrow` helpers as needed (existing helpers cover Tokens, Nfts,
  Earning, Earn, Rewards, Activity, Settings, DappExplorer, Transactions).
- `src/frontend/src/lib/constants/routes.constants.ts` — `AppPath` already has
  `Trading`, `Borrow`, `Earn`, `Nfts`, `Rewards`.
- `src/frontend/src/lib/constants/test-ids.constants.ts` — new test-ids for the
  groups, cradle, sheets, section headings, and the NFTs/Notes items.
- i18n: add labels/aria for section headings (Portfolio / Finance / More) and
  items (Trade, Borrow, NFTs) under `navigation.*` across all locale files +
  `i18n.d.ts` (English first; follow
  `docs/ai/frontend/workflows/add-i18n-key.md`). No hard-coded English.
- Icons (lucide, per the design): wallet, image (NFTs), history, candlestick
  (Trade), handcoins (Borrow), sprout (Earn), telescope (Explore), notebook
  (Notes), sliders (Settings), layers (cradle), more (3-dots). Reuse existing
  icon components (e.g. `IconNotebook`) before adding.

## PR breakdown (staged)

One spec, small atomic PRs (OISY's "small PRs" rule):

1. **PR 1 — IA + grouped data model.** Introduce the group abstraction in the
   shared item list with the per-form-factor IA; remove NFTs from the Assets
   tabs and surface it as a nav item; relocate Rewards into More; wire the Notes
   nav item to the modal. Update `PRODUCT.md`.
2. **PR 2 — Desktop sidebar.** Section-headed groups (Portfolio / Finance /
   More), the single blue-pill selection, `NEW` tags on Trade/Borrow, social
   footer. No disclosure behaviour (static).
3. **PR 3 — Mobile cradle + bottom sheets.** Raised center Finance cradle, More
   sheet, the grey/blue open-state rules (clusters 1–4), bar-hide on open.
4. **PR 4 — NFTs page.** The standalone NFTs page behind `AppPath.Nfts` (if not
   already a complete destination once removed from the Assets tab).

Each PR updates `docs/ai/PRODUCT.md` in the same PR and runs the local gates
(`format`, `lint --max-warnings 0`, `check`, `test`).

## Acceptance criteria

- At most **one** blue item shows at any time, on every route, both layouts.
- **Desktop:** all three groups always visible under their headings; the blue
  pill is on the current page wherever it sits; there is **no** grey/open state
  on desktop; Trade and Borrow show a `NEW` tag; the footer shows social links.
- **Mobile:** opening Finance/More while staying put shows the **grey** open
  state and keeps the current page blue; landing on a group page (sheet closed)
  shows the parent **solid blue**; a group page with its sheet open shows the
  parent **blue-open** with the active child marked.
- Opening the Notes modal never makes Notes blue (interim); on mobile it shows
  the grey open state, on desktop no blue; the underlying page keeps its pill.
- NFTs is reachable (desktop Portfolio / mobile More sheet), renders its own
  page, and is gone from the Assets tab bar.
- On the NFTs page the hero shows the **total NFT count** and **per-network
  count pills** (no fiat AUM), and the total matches the rendered list.
- Rewards is reachable from the More group on both platforms; it is gone as a
  top-level item.
- Assets tabs (Tokens / Earning / Trading) behave as today, minus NFTs.
- All new labels/aria are i18n keys; no bare clickable `<div>`s; keyboard and
  screen-reader operable (the cradle and sheet are reachable and labelled;
  section headings are exposed as group labels, not as buttons).

## Negative guarantees (does **not** do)

- Does **not** promote Notes to a page (explicit follow-up).
- Does **not** add desktop expand/collapse — desktop groups are always visible.
- Does **not** show a grey/"menu-open" state on desktop.
- Does **not** remove or restructure the Assets internal tabs beyond removing
  NFTs.
- Does **not** add a new top-level route folder beyond what `AppPath` defines.
- Does **not** change backend, `.did`, or stable state.
- Does **not** add new npm dependencies.

## Open questions (facts to confirm)

- **Borrow destination.** `AppPath.Borrow` (`/borrow/`) exists in the enum, but
  there is no `borrow` route folder under `src/frontend/src/routes/(app)/`
  (Liquidium lives under `providers/liquidium/`, spec
  `2026-06-07-feat-liquidium-lend-borrow.md`). Confirm what "Borrow" in Finance
  routes to at ship time, and whether the `NEW` tags on Trade/Borrow are
  time-boxed.
- **`EARNING_ENABLED` flag.** Confirm whether the flag still gates anything once
  Earn is a permanent Finance child and Rewards moves into More.
- **Rewards target.** Does More › Rewards route to `AppPath.Rewards` or deep-link
  into the Earn page's rewards section?
- **Desktop footer links.** The design shows X and GitHub icons in the sidebar
  footer; confirm exact destinations and whether existing `SupportLink` /
  `DocumentationLink` components are affected/relocated.

## Pending decisions (facts clear — need a call)

- **Interim mobile layout during PR 1–2.** If the cradle/sheet land in PR 3,
  the mobile bar stays flat-but-grouped-aware until then. (Recommend: yes —
  ship the cradle in PR 3.)
- **Section-heading visibility on mobile.** Desktop uses Portfolio / Finance /
  More headings; mobile has no headings (bar + sheets). Confirm the More/Finance
  sheets need no heading beyond the group name already shown.
