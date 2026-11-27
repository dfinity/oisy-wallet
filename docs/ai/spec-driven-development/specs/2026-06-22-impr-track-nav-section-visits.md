# Spec: Track Main Navigation Section Visits in Plausible

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

> **Updated 2026-11-19.** The main navigation was rebuilt while this PR was open: it now has 12 items in three groups (Portfolio / Finance / More), NFTs left the Assets tabs and became its own page, and Trading and Borrowing joined the Assets tabs. This spec now covers every item of the new menu.

## Goal

Track how often users visit each page of the main navigation in Plausible, so we can see which pages users actually use and how usage shifts over time. The pages are **Assets**, **NFTs**, **Activity**, **Trade**, **Earn**, **Borrow**, **Explore**, **Help**, **Settings**, **Rewards** and **Tools**. The twelfth item, **Notes**, opens a modal, not a page.

A "visit" means _entering the page_, regardless of how the user got there (clicking the nav item, a direct URL, the browser back/forward button, or an in-app redirect). This mirrors the visit-counting semantics OISY already uses for the Earn page.

This spec also completes the **Assets tab view counts** (Tokens / Trading / Earning / Borrowing). Before, a `view_open` fired only when a tab was clicked, so the tab the user _lands on_ was never counted. We add a landing `view_open` and an `event_trigger` property so every view appearance is counted and the cause (auto vs. click) is preserved.

Finally, every click on a main navigation item sends a generic `ui_click` event, so we also see _how_ users navigate.

---

## Background

OISY tracks Plausible events via `trackEvent()` in `src/frontend/src/lib/services/analytics.services.ts`. Event names and their attribute enums live in `src/frontend/src/lib/enums/plausible.ts`; the rules for events are in `docs/ai/frontend/analytics.md`.

The main navigation (`src/frontend/src/lib/components/navigation/NavigationMenuMainItems.svelte`) builds one descriptor per item, keyed by `NavigationItemId` (`src/frontend/src/lib/types/navigation.ts`): `assets`, `nfts`, `activity`, `trade`, `borrow`, `earn`, `explore`, `notes`, `help`, `settings`, `rewards`, `tools`. Items render through `NavigationItem.svelte` (desktop sidebar, the pinned bottom block, the mobile bar) or as cards in the mobile group sheets (Finance, More). Each item links to an `AppPath` route (`src/frontend/src/lib/constants/routes.constants.ts`), except Notes, which opens the Notes modal.

**The established pattern (already used by Earn):** the page's feature component fires `PLAUSIBLE_EVENTS.PAGE_OPEN` inside `onMount`, with `event_context` + `event_value` identifying the page. See `src/frontend/src/lib/components/earning/Earning.svelte`:

```ts
onMount(() => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.PAGE_OPEN,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.EARN,
			event_value: PLAUSIBLE_EVENT_VALUES.EARN_PAGE
		}
	});
});
```

### Current state per page

| Nav item     | Route (`AppPath`)                               | Renders                               | `PAGE_OPEN` before this PR               |
| ------------ | ----------------------------------------------- | ------------------------------------- | ---------------------------------------- |
| **Assets**   | `Tokens` / `Trading` / `Earning` / `Borrowings` | `tokens/Assets.svelte`                | ❌ none                                  |
| **NFTs**     | `Nfts` (`/collectibles/`)                       | `tokens/Assets.svelte` (tab `nfts`)   | ❌ none (only NFT and collection clicks) |
| **Activity** | `Activity`                                      | `transactions/AllTransactions.svelte` | ❌ none                                  |
| **Trade**    | `ProvidersOisyTrade`                            | `trading/OisyTradeProvider.svelte`    | ✅ `oisy-trade-page` — **leave as is**   |
| **Earn**     | `Earn`                                          | `earning/Earning.svelte`              | ✅ `earn-page` — **leave as is**         |
| **Borrow**   | `Borrow`                                        | `borrow/Borrow.svelte`                | ✅ `borrow-page` — **leave as is**       |
| **Explore**  | `Explore`                                       | `dapps/DappsExplorer.svelte`          | ❌ none                                  |
| **Notes**    | — (opens a modal)                               | —                                     | — (not a page)                           |
| **Help**     | `Help`                                          | `help/Help.svelte`                    | ❌ none (only the `help` `open` event)   |
| **Settings** | `Settings`                                      | `settings/Settings.svelte`            | ❌ none                                  |
| **Rewards**  | `Rewards`                                       | `rewards/Rewards.svelte`              | ❌ none                                  |
| **Tools**    | `Tools`                                         | `tools/Tools.svelte`                  | ❌ none                                  |

---

## Assets: section visit vs. tab views

The **Assets** nav item does not map to a single route. It lands on Tokens (`/`), Trading (`/trading/`), Earning (`/earning/`) or Borrowing (`/borrowings/`) depending on `activeAssetsTabStore`, and **all four routes render the same `tokens/Assets.svelte` component**. The NFTs page (`/collectibles/`) is rendered by the same component too, but it is its own menu item and its own section. Switching between the Assets tabs is done via the `Tabs` component (`src/frontend/src/lib/components/ui/Tabs.svelte`), which already fired a `VIEW_OPEN` event on each tab click:

```ts
// Tabs.svelte handleClick — previous code, refactored onto the shared helper below
trackEvent({
	name: trackEventName, // PLAUSIBLE_EVENTS.VIEW_OPEN
	metadata: {
		event_context: PLAUSIBLE_EVENT_CONTEXTS.ASSETS_TAB,
		event_value: id, // tokens | trading | earning | borrowings
		location_source: PLAUSIBLE_EVENT_SOURCES.ASSETS_PAGE
	}
});
```

The model, confirmed with the PM, is:

- **Assets section** → one `page_open` (`assets-page`) when the user _enters_ the Assets section.
- **Tokens / Trading / Earning / Borrowing views** → one `view_open` **per appearance**, whether the view was reached by a tab click or shown automatically as the landing tab. An `event_trigger` property records which.
- **NFTs** → one `page_open` (`nfts-page`) when the user enters NFTs. Moving between the NFTs list, a collection and an NFT (same route, other query params) is not a new visit; going from Assets to NFTs is.

### Why a landing `view_open` is needed

Because `view_open` previously fired only on a tab _click_, the tab the user lands on (driven by the sticky `activeAssetsTabStore`) was never counted — an uneven, default-tab-biased blind spot. We close it by firing a `view_open` for the landing tab when the user enters the Assets section, tagged `event_trigger = auto`.

### Why the landing fire must be entry-guarded

Each Assets tab route mounts a fresh `Assets.svelte` instance, so a naive per-mount fire would double-count: clicking a tab already fires `view_open` in `Tabs.handleClick` **and then** navigates/remounts. To avoid this, the landing `view_open` (and the section `page_open`) fire only when the _previous_ route was not itself an Assets tab route. Use `afterNavigate` with a guard (Implementation §6).

Net effect — a tab **click** produces exactly one `view_open` (`trigger = click`, from `Tabs`); the remount's landing fire is suppressed by the guard. "Click then land" collapses to a single `click` event.

### `event_trigger`: `auto` vs `click`

- `click` — the user clicked the tab in the `Tabs` component.
- `auto` — the view was shown without a tab click: the landing/default tab on section entry, a direct URL to a tab route, or back/forward landing on a tab route.

We use `auto` rather than `land` deliberately: a click also "lands" on a tab, so `land` would be ambiguous. `auto` names the _cause_ (the view was selected automatically by app state, not by a deliberate tab click).

---

## Event Schema

### Page visits (`page_open`)

All page visits reuse the existing `PLAUSIBLE_EVENTS.PAGE_OPEN` event; the discriminator dashboards group by is **`event_value`**. Schema follows the [Plausible Events](https://dfinity.atlassian.net/wiki/spaces/OISY/pages/2534572046/Plausible+Events) Confluence page. New values keep the existing `-page` style so they match `earn-page`, `borrow-page` and `oisy-trade-page`; renaming all of them at once is a separate follow-up.

| Page     | **Event**   | `event_context` | `event_value`     | Note                            |
| -------- | ----------- | --------------- | ----------------- | ------------------------------- |
| Assets   | `page_open` | `assets`        | `assets-page`     |                                 |
| NFTs     | `page_open` | `nft`           | `nfts-page`       |                                 |
| Activity | `page_open` | `activity`      | `activity-page`   |                                 |
| Trade    | `page_open` | `trading`       | `oisy-trade-page` | _(already emitted — no change)_ |
| Earn     | `page_open` | `earn`          | `earn-page`       | _(already emitted — no change)_ |
| Borrow   | `page_open` | `borrow`        | `borrow-page`     | _(already emitted — no change)_ |
| Explore  | `page_open` | `explore`       | `explore-page`    |                                 |
| Help     | `page_open` | `help`          | `help-page`       |                                 |
| Settings | `page_open` | `settings`      | `settings-page`   |                                 |
| Rewards  | `page_open` | `rewards`       | `rewards-page`    |                                 |
| Tools    | `page_open` | `tools`         | `tools-page`      |                                 |

Notes sends no `page_open`: it opens a modal, which `personal_note` (`open`) already tracks.

### Assets tab views (`view_open`)

| Field             | Value                                                       |
| ----------------- | ----------------------------------------------------------- |
| **Event**         | `view_open`                                                 |
| `event_context`   | `assets_tab`                                                |
| `event_value`     | `tokens` \| `trading` \| `earning` \| `borrowings` (tab id) |
| `location_source` | `assets_page`                                               |
| `event_trigger`   | `auto` (landing tab) \| `click` (tab clicked)               |

Per-tab view counts = count of `view_open` grouped by `event_value`. Split by `event_trigger` to separate deliberate switches from default landings. No PII is included; all values are static enum members.

### Navigation clicks (`ui_click`)

`page_open` deliberately counts a visit _however_ it is reached, so it carries no source. To capture the complementary signal — _how_ users navigate, i.e. which navigation controls they actually click — we add a generic **`ui_click`** event. It is intentionally generic (not `navigation_click` or per-surface names): Plausible is analysed by _event name → breakdown by property_, so one event with a `source_location` ladder keeps every navigation surface comparable in a single breakdown and scales to future surfaces with no new event names. This matches OISY's existing schema (generic verbs like `view_open` / `open_modal` parameterised by properties).

| Field                | Value                                                                             |
| -------------------- | --------------------------------------------------------------------------------- |
| **Event**            | `ui_click`                                                                        |
| `source_location`    | `navigation` (the standard key per the common-properties table)                   |
| `source_sublocation` | `main_menu` (main navigation) \| `assets_tabs` (Assets tab bar)                   |
| `event_value`        | the click target — the `NavigationItemId` (`assets` …) or the tab id (`tokens` …) |

Scope for this change:

- **Main navigation**: every item, in every layout — desktop sidebar, the pinned bottom block (Settings), the mobile bar, and the cards in the mobile Finance and More sheets. `event_value` is the item's `NavigationItemId`, Notes included. The mobile Finance and More buttons only open a sheet and send nothing. On desktop, Help is not in the sidebar but a row of the More menu: that row sends the same click (`help`) while it opens the in-app Help page; the menu's links out (docs, FAQ, source code, X, and the support page when the Help page is off) keep their own events.
- **Assets tab bar**: every tab click.

Other navigation surfaces — user menu, back buttons, dApp cards, settings sub-nav — can adopt the same event later by adding `source_location` / `source_sublocation` values; out of scope here.

This uses the standard **`source_location`** key (not the legacy reversed `location_source` that `view_open` / `NftCard` currently use). Unifying the legacy key, and the page names, is a separate follow-up.

#### Relationship to `page_open` / `view_open`

`ui_click` is **orthogonal** to the appearance events, not a replacement:

- A **menu click** to Assets produces three events: `ui_click` (`source_sublocation = main_menu`, `event_value = assets`), `page_open` (`assets-page`), and the landing `view_open` (`event_trigger = auto`, the active tab).
- A **direct URL / back-forward / redirect** entry produces no `ui_click` — only `page_open` (+ the `auto` `view_open` for Assets). So `page_open` stays the complete "visits however reached" metric.
- An **Assets tab click** produces `ui_click` (`source_sublocation = assets_tabs`, `event_value` = tab) **and** the existing `view_open` (`event_trigger = click`). The two are kept (UI-interaction signal vs appearance signal); `event_trigger` on `view_open` is **not** removed.
- A **Notes** click produces only `ui_click` (`event_value = notes`), plus the modal's own `personal_note` event.

---

## Implementation

### 1. Extend `PLAUSIBLE_EVENT_VALUES`

In `src/frontend/src/lib/enums/plausible.ts`, add to `PLAUSIBLE_EVENT_VALUES` (alongside the existing `EARN_PAGE`, `BORROW_PAGE`, `OISY_TRADE_PAGE`):

```ts
ASSETS_PAGE = 'assets-page',
NFTS_PAGE = 'nfts-page',
ACTIVITY_PAGE = 'activity-page',
EXPLORE_PAGE = 'explore-page',
HELP_PAGE = 'help-page',
SETTINGS_PAGE = 'settings-page',
REWARDS_PAGE = 'rewards-page',
TOOLS_PAGE = 'tools-page',
```

### 2. Extend `PLAUSIBLE_EVENT_CONTEXTS` and add `PLAUSIBLE_EVENT_TRIGGERS`

In the same file, add to `PLAUSIBLE_EVENT_CONTEXTS` (alongside the existing `EARN`, `BORROW`, `NFT`, `HELP`):

```ts
ASSETS = 'assets',
ACTIVITY = 'activity',
EXPLORE = 'explore',
SETTINGS = 'settings',
REWARDS = 'rewards',
TOOLS = 'tools',
```

And add a new enum for the trigger:

```ts
export enum PLAUSIBLE_EVENT_TRIGGERS {
	AUTO = 'auto',
	CLICK = 'click'
}
```

> The existing `ASSETS_TAB` context is used by the tab `view_open` events and is intentionally distinct from the new `ASSETS` page-visit context. NFTs reuses the existing `NFT` context.

### 3. Instrument the single-route pages (Activity, Explore, Help, Settings, Rewards, Tools)

These are single routes with no shared-component nuance, so mirror the Earn pattern exactly — an `onMount` `PAGE_OPEN` in each feature component.

**`src/frontend/src/lib/components/transactions/AllTransactions.svelte`** (Activity):

```ts
import { onMount } from 'svelte';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_VALUES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';

onMount(() => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.PAGE_OPEN,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.ACTIVITY,
			event_value: PLAUSIBLE_EVENT_VALUES.ACTIVITY_PAGE
		}
	});
});
```

- **`dapps/DappsExplorer.svelte`** (Explore): same shape with `EXPLORE` / `EXPLORE_PAGE`.
- **`help/Help.svelte`** (Help): same shape with `HELP` / `HELP_PAGE`, in the existing `onMount`. The existing `help` event (`event_modifier = open`) stays: it belongs to the Help card funnel, while `page_open` makes Help comparable with every other page.
- **`settings/Settings.svelte`** (Settings): same shape with `SETTINGS` / `SETTINGS_PAGE`.
- **`rewards/Rewards.svelte`** (Rewards): same shape with `REWARDS` / `REWARDS_PAGE`.
- **`tools/Tools.svelte`** (Tools): same shape with `TOOLS` / `TOOLS_PAGE`.

### 4. Add the shared `buildAssetsTabViewEvent` helper

To keep the click fire and the landing fire byte-identical, add a factory in `src/frontend/src/lib/services/analytics.services.ts` that returns the `view_open` params:

```ts
export const buildAssetsTabViewEvent = ({
	tabId,
	trigger
}: {
	tabId: string;
	trigger: PLAUSIBLE_EVENT_TRIGGERS;
}): TrackEventParams => ({
	name: PLAUSIBLE_EVENTS.VIEW_OPEN,
	metadata: {
		event_context: PLAUSIBLE_EVENT_CONTEXTS.ASSETS_TAB,
		event_value: tabId,
		location_source: PLAUSIBLE_EVENT_SOURCES.ASSETS_PAGE,
		event_trigger: trigger
	}
});
```

### 5. Route the existing tab click through the helper

In **`src/frontend/src/lib/components/ui/Tabs.svelte`**, replace the inline `view_open` object in `handleClick` with the helper, passing `trigger: CLICK`:

```ts
if (nonNullish(trackEventName)) {
	trackEvent(buildAssetsTabViewEvent({ tabId: id, trigger: PLAUSIBLE_EVENT_TRIGGERS.CLICK }));
}
```

> `Tabs` is generic, but the Assets tabs are its only `trackEventName` consumer today (`PLAUSIBLE_EVENTS.VIEW_OPEN`, with the `assets_tab` / `assets_page` payload). This keeps current behaviour and only adds `event_trigger`. If `Tabs` later gains other tracked consumers, the helper can be generalised; out of scope here.

### 6. Instrument Assets and NFTs in `Assets.svelte` (entry-guarded)

In **`src/frontend/src/lib/components/tokens/Assets.svelte`**, use `afterNavigate` so the events fire once per entry (including initial load, where `from` is `null`):

- **NFTs** (`tab === TokenTypes.NFTS`): fire `page_open` (`NFT` / `NFTS_PAGE`) unless the previous route was itself the NFTs route (`isNftsPath`). No `view_open`: NFTs has no tab bar.
- **Assets** (every other tab): fire `page_open` (`ASSETS` / `ASSETS_PAGE`) and the landing `view_open` (`activeTab`, `auto`) unless the previous route was an Assets tab route (`isAssetsRouteId`).

```ts
afterNavigate(({ from }: AfterNavigate) => {
	if (tab === TokenTypes.NFTS) {
		if (nonNullish(from) && isNftsPath(from.route.id)) {
			return;
		}

		trackEvent({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_value: PLAUSIBLE_EVENT_VALUES.NFTS_PAGE
			}
		});
		return;
	}

	if (nonNullish(from) && isAssetsRouteId(from.route.id)) {
		return;
	}

	trackEvent({
		name: PLAUSIBLE_EVENTS.PAGE_OPEN,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.ASSETS,
			event_value: PLAUSIBLE_EVENT_VALUES.ASSETS_PAGE
		}
	});

	trackEvent(buildAssetsTabViewEvent({ tabId: activeTab, trigger: PLAUSIBLE_EVENT_TRIGGERS.AUTO }));
});
```

Add the `isAssetsRouteId` helper to `src/frontend/src/lib/utils/nav.utils.ts`, composed from the existing path predicates (the existing `isRoute*` helpers take a `Page`, whereas here we have a raw route id from `NavigationTarget.route.id`):

```ts
export const isAssetsRouteId = (id: string | null): boolean =>
	isTokensPath(id) || isTradingPath(id) || isEarningPath(id) || isBorrowingsPath(id);
```

> Reuse the existing path helpers in `nav.utils.ts`. Do not add new path constants. NFTs is deliberately not an Assets route: going from Assets to NFTs, or back, is a new visit.
>
> `activeTab` is the existing `$state` in `Assets.svelte` (initialised from the `tab` prop and bound by `Tabs`); when entering directly on a tab route it already reflects that route's tab, so the `auto` view matches the tab actually shown.

### 7. Leave Trade, Earn and Borrow untouched

`trading/OisyTradeProvider.svelte` (`oisy-trade-page`), `earning/Earning.svelte` (`earn-page`) and `borrow/Borrow.svelte` (`borrow-page`) already fire `PAGE_OPEN`. Do not duplicate or modify them.

### 8. Add the `ui_click` event, helper, and source values

In `src/frontend/src/lib/enums/plausible.ts`, add `UI_CLICK = 'ui_click'` to `PLAUSIBLE_EVENTS`, and `NAVIGATION = 'navigation'`, `MAIN_MENU = 'main_menu'` and `ASSETS_TABS = 'assets_tabs'` to `PLAUSIBLE_EVENT_SOURCE_LOCATIONS` (the standard `source_location` enum; `analytics.md` lists it as a value source for `source_sublocation` too, and forbids inline literals).

Add a factory in `analytics.services.ts`, mirroring `buildLearnMoreEvent` (returns params; `source_sublocation` / `event_value` are optional and omitted when nullish):

```ts
export const buildUiClickEvent = ({
	sourceLocation,
	sourceSublocation,
	eventValue
}: {
	sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS;
	sourceSublocation?: string;
	eventValue?: string;
}): TrackEventParams => ({
	name: PLAUSIBLE_EVENTS.UI_CLICK,
	metadata: {
		source_location: sourceLocation,
		...(nonNullish(sourceSublocation) && { source_sublocation: sourceSublocation }),
		...(nonNullish(eventValue) && { event_value: eventValue })
	}
});
```

### 9. Fire `ui_click` from the main navigation and the Assets tab bar

**`NavigationItem.svelte`**: add an optional `trackEvent?: TrackEventParams` prop, fired from the link's `onclick` exactly as `ExternalLink.svelte` does (`isNullish(trackEvent)` → return; else `trackEventServices(trackEvent)`). An item without `href` (Notes) renders a `<button>`: it fires the event first, then its own `onclick`.

**`buildMainMenuClickEvent(id)`** in `analytics.services.ts` builds the event from the item id (`source_location = navigation`, `source_sublocation = main_menu`, `event_value` = the `NavigationItemId`), so every control that shows a menu item sends the same payload.

**`NavigationMenuMainItems.svelte`**:

- the `navItem` snippet passes it to `NavigationItem` as `trackEvent`;
- the `navCard` snippet (mobile sheets) fires it from the card's `<a>` `onclick`, and first thing in the `<button>` `onclick` of a card that opens a modal.

The group buttons (Finance cradle, More) are not items and send nothing.

**`NavigationMoreMenu.svelte`** (desktop): the Help row carries `buildMainMenuClickEvent('help')` while it opens the in-app Help page (`HELP_ENABLED`), and fires it before navigating. When the flag is off the row links out to the support page instead, which is not the Help item, so it sends nothing new.

**`Tabs.svelte`**: in the same `nonNullish(trackEventName)` block that fires the `view_open`, additionally fire a `ui_click` (`source_sublocation = assets_tabs`, `event_value = id`). Keep the `view_open` (with `event_trigger = click`) as-is — the two events are complementary.

---

## Tests

Follow the existing `PAGE_OPEN` test precedent in `src/frontend/src/tests/lib/components/nfts/NftCard.spec.ts` (mock the analytics service, render the component, assert `trackEvent` is called with the exact `{ name, metadata }`).

- **Activity / Explore / Help / Settings / Rewards / Tools:** one test each asserting `trackEvent` fires once on mount with `name: PAGE_OPEN` and the correct `event_context` + `event_value`. Tools' existing explorer-click test leaves out the mount event.
- **Assets and NFTs** (`src/frontend/src/tests/lib/components/tokens/Assets.spec.ts`):
  - Entering Assets from a non-Assets route (initial load, Activity, NFTs) fires **two** events: `page_open` (`assets-page`) and `view_open` (`event_value` = active tab, `event_trigger = auto`).
  - Navigating in from an Assets tab route (Tokens, Trading, Earning, Borrowing) fires **neither**.
  - The `auto` `view_open`'s `event_value` matches the tab actually shown (parametrise over the four tabs).
  - Entering NFTs (initial load, an Assets tab, Activity) fires only `page_open` (`nfts-page`); moving within NFTs fires nothing.
  - Drive `afterNavigate` via the SvelteKit navigation mocks already used in the suite.
- **`Tabs`** (`src/frontend/src/tests/lib/components/ui/Tabs.spec.ts`): clicking a tab fires the `view_open` (`event_trigger = click`, clicked tab's `event_value`) **and** the `ui_click` (`source_location = navigation`, `source_sublocation = assets_tabs`, `event_value` = tab).
- **`analytics.services` / helpers:** unit-test `buildAssetsTabViewEvent` for both `auto` and `click`, `buildUiClickEvent` (with and without `source_sublocation` / `event_value`) and `buildMainMenuClickEvent` — asserting full payloads, mirroring the `buildLearnMoreEvent` tests in `analytics.service.spec.ts`.
- **`NavigationItem`** (`src/frontend/src/tests/lib/components/navigation/NavigationItem.spec.ts`): clicking a link fires the provided `trackEvent`; clicking an item without `href` fires it and then `onclick`; no event when the prop is absent.
- **`NavigationMainMenuItems`** (`src/frontend/src/tests/lib/components/navigation/NavigationMainMenuItems.spec.ts`): `ui_click` with the right `event_value` from each desktop sidebar item, the pinned Settings item, a mobile bar item, a card in a mobile sheet (and nothing from the button that opens the sheet), and the Notes item that opens a modal.
- **`NavigationMoreMenu`** (`src/frontend/src/tests/lib/components/navigation/NavigationMoreMenu.spec.ts`): the Help row sends `ui_click` (`help`) when it opens the Help page, and nothing when it links out to the support page.
- **`nav.utils.spec.ts`:** `isAssetsRouteId` is true for the Tokens / Trading / Earning / Borrowing route ids, false for NFTs, Activity, Explore, Settings, Earn, Rewards and `null`.
- Do not add assertions to the Trade / Earn / Borrow / NFT detail / Harvest tests — they are unchanged.

---

## Out of Scope

- The existing `PAGE_OPEN` on Trade, Earn, Borrow, NFT detail, NFT collection and Harvest pages — unchanged.
- Replacing `page_open` with click tracking: `page_open` remains the complete "visits however reached" metric (it must catch direct URLs, back/forward, redirects). The `ui_click` event is an _additional, orthogonal_ signal for how users navigate, not a substitute — and it deliberately does **not** add `event_trigger` to `page_open`.
- `ui_click` on navigation surfaces beyond the main navigation and the Assets tab bar (the desktop More menu's links out, user menu, back buttons, dApp cards, settings sub-nav, …) — same event, added later via new `source_location` / `source_sublocation` values.
- One name per place across all events (drop the `-page` suffix, migrate the legacy `location_source` key to `source_location`) — separate follow-up.
- Generalising the `Tabs` `view_open` payload for non-Assets consumers (none exist today).
- Sub-navigation within Settings, Explore, or Activity (e.g. individual settings panels, dApp detail opens, transaction filters) — those have or can get their own events separately.
- Any dashboard/Confluence changes — the new values appear automatically once events flow.

### Known minor gap

Back/forward navigation _between_ Assets tabs (e.g. Earning → Tokens → back to Earning) does not emit a `view_open`, because the entry guard treats it as intra-Assets navigation. Tab clicks (the primary path) and section entry are both counted; this edge case is accepted. Revisit only if back/forward tab counts prove necessary.

---

## Acceptance Criteria

- [ ] Entering **Assets** from outside the section (NFTs included) fires exactly two events: `page_open` (`event_context = assets`, `event_value = assets-page`) and `view_open` (`event_context = assets_tab`, `event_value` = the landing tab, `location_source = assets_page`, `event_trigger = auto`).
- [ ] Switching between the Tokens / Trading / Earning / Borrowing tabs fires **one** `view_open` per switch, with `event_trigger = click`, and does **not** fire an additional `page_open` or `auto` `view_open`.
- [ ] The clicked-tab `view_open` and the landing `view_open` share an identical payload shape except `event_value` and `event_trigger`, produced by the shared `buildAssetsTabViewEvent` helper.
- [ ] Entering **NFTs** fires `page_open` with `event_context = nft`, `event_value = nfts-page`; moving between its list, a collection and an NFT fires no further `page_open`.
- [ ] Visiting **Activity**, **Explore**, **Help**, **Settings**, **Rewards** and **Tools** fires `page_open` with the context and value in the schema table.
- [ ] **Trade**, **Earn** and **Borrow** continue to fire their existing `page_open` with no change.
- [ ] Each `page_open` fires on _any_ entry to the page (nav click, direct URL, back/forward, redirect), not only on nav-menu clicks.
- [ ] Clicking any **main navigation** item, in any layout, fires `ui_click` with `source_location = navigation`, `source_sublocation = main_menu`, and `event_value` = the item's `NavigationItemId`; Notes included, and Help in the desktop More menu; the Finance and More group buttons fire nothing; `page_open` stays trigger-less.
- [ ] Clicking an **Assets tab** fires both `ui_click` (`source_location = navigation`, `source_sublocation = assets_tabs`, `event_value` = tab) and the existing `view_open` (`event_trigger = click`); `view_open`'s `event_trigger` is retained.
- [ ] `ui_click` uses the standard `source_location` key; the legacy `location_source` on `view_open` is left unchanged.
- [ ] No inline string literals for event metadata: `UI_CLICK`, and `NAVIGATION` / `MAIN_MENU` / `ASSETS_TABS` in `PLAUSIBLE_EVENT_SOURCE_LOCATIONS`, are enum members; `ui_click` payloads are produced by the shared `buildUiClickEvent` helper (`buildMainMenuClickEvent` for a menu item).
- [ ] New `PLAUSIBLE_EVENT_VALUES`, `PLAUSIBLE_EVENT_CONTEXTS`, and `PLAUSIBLE_EVENT_TRIGGERS` members added; no new path constants introduced; `isAssetsRouteId` reuses existing path predicates.
- [ ] Analytics never throws — tracking failures are swallowed and never affect the user flow (guaranteed by `trackEvent`).
- [ ] Quality gates pass: `npm run format`, `npm run lint -- --max-warnings 0`, `npm run check`, `npm run test`.
- [ ] In this PR, `docs/ai/PRODUCT.md` lists the `page_open` value of every navigation page, the Assets tab `auto`/`click` view analytics, and the `ui_click` navigation analytics; `docs/ai/frontend/analytics.md` describes `ui_click`.
