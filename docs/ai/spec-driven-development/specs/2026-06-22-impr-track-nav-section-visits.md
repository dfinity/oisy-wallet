# Spec: Track Main Navigation Section Visits in Plausible

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Track how often users visit each of the five main navigation sections — **Assets**, **Activity**, **Earn**, **Explore**, and **Settings** — in Plausible, so we can see which sections users actually use and how usage shifts over time.

A "visit" means _entering the section_, regardless of how the user got there (clicking the nav item, a direct URL, the browser back/forward button, or an in-app redirect). This mirrors the visit-counting semantics OISY already uses for the Earn page.

This spec also completes the **Assets sub-tab view counts** (Tokens / NFTs / Earning). Today a `view_open` fires only when a sub-tab is clicked, so the tab the user _lands on_ is never counted. We add a landing `view_open` and an `event_trigger` property so every sub-view appearance is counted and the cause (auto vs. click) is preserved.

---

## Background

OISY tracks Plausible events via `trackEvent()` in `src/frontend/src/lib/services/analytics.services.ts`. Event names and their attribute enums live in `src/frontend/src/lib/enums/plausible.ts`; legacy string event names live in `src/frontend/src/lib/constants/analytics.constants.ts`.

The five sections render from the main navigation menu (`src/frontend/src/lib/components/navigation/NavigationMenuMainItems.svelte`) via `NavigationItem.svelte`. Each nav item links to an `AppPath` route (`src/frontend/src/lib/constants/routes.constants.ts`); each route is a thin `+page.svelte` wrapper that renders one feature component.

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

The same `PAGE_OPEN` pattern is already used by the NFT pages (`NftCard.svelte`, `NftCollectionCard.svelte`) and the Harvest Autopilot pages. This spec extends that exact pattern to the four sections that are not yet instrumented.

### Current state per section

| Nav item     | Route (`AppPath`)             | Renders                               | `PAGE_OPEN` today?               |
| ------------ | ----------------------------- | ------------------------------------- | -------------------------------- |
| **Assets**   | `Tokens` / `Nfts` / `Earning` | `tokens/Assets.svelte`                | ❌ none                          |
| **Activity** | `Activity`                    | `transactions/AllTransactions.svelte` | ❌ none                          |
| **Earn**     | `Earn`                        | `earning/Earning.svelte`              | ✅ `earn-page` — **leave as is** |
| **Explore**  | `Explore`                     | `dapps/DappsExplorer.svelte`          | ❌ none                          |
| **Settings** | `Settings`                    | `settings/Settings.svelte`            | ❌ none                          |
| Rewards\*    | `Rewards`                     | `rewards/Rewards.svelte`              | ❌ none                          |

\* The Earn nav slot is feature-flagged by `EARNING_ENABLED` (`$env/earning`): it shows **Earn** (→ `AppPath.Earn`) when enabled and **Rewards** (→ `AppPath.Rewards`) when not. Both occupy the same nav slot. We track them as **separate** sections (`earn-page` vs `rewards-page`) so usage of each is independently visible during the rollout. This is a cheap default to reverse later if you'd rather fold them into one value.

---

## Assets: section visit vs. sub-tab views

The **Assets** nav item does not map to a single route. It lands on Tokens (`/`), NFTs (`/nfts/`), or the Earning sub-tab (`/earning/`) depending on `activeAssetsTabStore`, and **all three routes render the same `tokens/Assets.svelte` component**. Switching between these sub-tabs is done via the `Tabs` component (`src/frontend/src/lib/components/ui/Tabs.svelte`), which **already** fires a `VIEW_OPEN` event on each sub-tab click:

```ts
// Tabs.svelte handleClick — current code, to be refactored onto the shared helper below
trackEvent({
	name: trackEventName, // PLAUSIBLE_EVENTS.VIEW_OPEN
	metadata: {
		event_context: PLAUSIBLE_EVENT_CONTEXTS.ASSETS_TAB,
		event_value: id, // tokens | nfts | earning
		location_source: PLAUSIBLE_EVENT_SOURCES.ASSETS_PAGE
	}
});
```

The model, confirmed with the PM, is:

- **Assets section** → one `page_open` (`assets-page`) when the user _enters_ the Assets section.
- **Tokens / NFTs / Earning sub-views** → one `view_open` **per appearance**, whether the view was reached by a tab click or shown automatically as the landing tab. An `event_trigger` property records which.

### Why a landing `view_open` is needed

Because `view_open` previously fired only on a tab _click_, the tab the user lands on (driven by the sticky `activeAssetsTabStore`) was never counted — an uneven, default-tab-biased blind spot. We close it by firing a `view_open` for the landing tab when the user enters the Assets section, tagged `event_trigger = auto`.

### Why the landing fire must be entry-guarded

Each Assets sub-route mounts a fresh `Assets.svelte` instance, so a naive per-mount fire would double-count: clicking a sub-tab already fires `view_open` in `Tabs.handleClick` **and then** navigates/remounts. To avoid this, the landing `view_open` (and the section `page_open`) fire only when the _previous_ route was not itself an Assets route. Use `afterNavigate` with a guard (Implementation §4).

Net effect — a sub-tab **click** produces exactly one `view_open` (`trigger = click`, from `Tabs`); the remount's landing fire is suppressed by the guard. "Click then land" collapses to a single `click` event.

### `event_trigger`: `auto` vs `click`

- `click` — the user clicked the tab in the `Tabs` component.
- `auto` — the view was shown without a tab click: the landing/default tab on section entry, a direct URL to a sub-route, or back/forward landing on a sub-route.

We use `auto` rather than `land` deliberately: a click also "lands" on a tab, so `land` would be ambiguous. `auto` names the _cause_ (the view was selected automatically by app state, not by a deliberate tab click).

---

## Event Schema

### Section visits (`page_open`)

All five section visits reuse the existing `PLAUSIBLE_EVENTS.PAGE_OPEN` event; the discriminator dashboards group by is **`event_value`**. Schema follows the [Plausible Events](https://dfinity.atlassian.net/wiki/spaces/OISY/pages/2534572046/Plausible+Events) Confluence page.

| Section  | **Event**   | `event_context` | `event_value`   |
| -------- | ----------- | --------------- | --------------- | ------------------------------- |
| Assets   | `page_open` | `assets`        | `assets-page`   |
| Activity | `page_open` | `activity`      | `activity-page` |
| Earn     | `page_open` | `earn`          | `earn-page`     | _(already emitted — no change)_ |
| Explore  | `page_open` | `explore`       | `explore-page`  |
| Settings | `page_open` | `settings`      | `settings-page` |
| Rewards  | `page_open` | `rewards`       | `rewards-page`  |

### Assets sub-tab views (`view_open`)

| Field             | Value                                         |
| ----------------- | --------------------------------------------- |
| **Event**         | `view_open`                                   |
| `event_context`   | `assets_tab`                                  |
| `event_value`     | `tokens` \| `nfts` \| `earning` (the tab id)  |
| `location_source` | `assets_page`                                 |
| `event_trigger`   | `auto` (landing tab) \| `click` (tab clicked) |

Per-tab view counts = count of `view_open` grouped by `event_value`. Split by `event_trigger` to separate deliberate switches from default landings. No PII is included; all values are static enum members.

### Navigation clicks (`ui_click`)

`page_open` deliberately counts a visit _however_ it is reached, so it carries no source. To capture the complementary signal — _how_ users navigate, i.e. which navigation controls they actually click — we add a generic **`ui_click`** event. It is intentionally generic (not `navigation_click` or per-surface names): Plausible is analysed by _event name → breakdown by property_, so one event with a `source_location` ladder keeps every navigation surface comparable in a single breakdown and scales to future surfaces with no new event names. This matches OISY's existing schema (generic verbs like `view_open` / `open_modal` parameterised by properties).

| Field                | Value                                                             |
| -------------------- | ----------------------------------------------------------------- |
| **Event**            | `ui_click`                                                        |
| `source_location`    | `navigation` (the standard key per the common-properties table)   |
| `source_sublocation` | `main_menu` (main nav menu) \| `assets_tabs` (Assets sub-tab bar) |
| `event_value`        | the click target — section id (`assets` …) or tab id (`tokens` …) |

Scope for this change: the **main navigation menu** and the **Assets sub-tab bar**. (Other navigation surfaces — user menu, back buttons, dApp cards, settings sub-nav — can adopt the same event later by adding `source_location` / `source_sublocation` values; out of scope here.)

This uses the standard **`source_location`** key (not the legacy reversed `location_source` that `view_open` / `NftCard` currently use). Unifying the legacy key is deliberately left as separate, step-by-step cleanup and is out of scope here.

#### Relationship to `page_open` / `view_open`

`ui_click` is **orthogonal** to the appearance events, not a replacement:

- A **main-nav click** to Assets produces three events: `ui_click` (`source_sublocation = main_menu`, `event_value = assets`), `page_open` (`assets-page`), and the landing `view_open` (`event_trigger = auto`, the active tab).
- A **direct URL / back-forward / redirect** entry produces no `ui_click` — only `page_open` + the `auto` `view_open`. So `page_open` stays the complete "visits however reached" metric.
- An **Assets sub-tab click** produces `ui_click` (`source_sublocation = assets_tabs`, `event_value` = tab) **and** the existing `view_open` (`event_trigger = click`). The two are kept (UI-interaction signal vs appearance signal); `event_trigger` on `view_open` is **not** removed.

---

## Implementation

### 1. Extend `PLAUSIBLE_EVENT_VALUES`

In `src/frontend/src/lib/enums/plausible.ts`, add to `PLAUSIBLE_EVENT_VALUES` (alongside the existing `EARN_PAGE`):

```ts
ASSETS_PAGE = 'assets-page',
ACTIVITY_PAGE = 'activity-page',
EXPLORE_PAGE = 'explore-page',
SETTINGS_PAGE = 'settings-page',
REWARDS_PAGE = 'rewards-page',
```

### 2. Extend `PLAUSIBLE_EVENT_CONTEXTS` and add `PLAUSIBLE_EVENT_TRIGGERS`

In the same file, add to `PLAUSIBLE_EVENT_CONTEXTS` (alongside the existing `EARN`):

```ts
ASSETS = 'assets',
ACTIVITY = 'activity',
EXPLORE = 'explore',
SETTINGS = 'settings',
REWARDS = 'rewards',
```

And add a new enum for the trigger:

```ts
export enum PLAUSIBLE_EVENT_TRIGGERS {
	AUTO = 'auto',
	CLICK = 'click'
}
```

> The existing `ASSETS_TAB` context is used by the sub-tab `view_open` events and is intentionally distinct from the new `ASSETS` page-visit context.

### 3. Instrument the three single-route sections (Activity, Explore, Settings)

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

**`src/frontend/src/lib/components/dapps/DappsExplorer.svelte`** (Explore): same shape with `EXPLORE` / `EXPLORE_PAGE`.

**`src/frontend/src/lib/components/settings/Settings.svelte`** (Settings): same shape with `SETTINGS` / `SETTINGS_PAGE`. (This component already imports `trackEvent` for its "Learn more" link — reuse the import.)

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

### 5. Route the existing sub-tab click through the helper

In **`src/frontend/src/lib/components/ui/Tabs.svelte`**, replace the inline `view_open` object in `handleClick` with the helper, passing `trigger: CLICK`:

```ts
if (nonNullish(trackEventName)) {
	trackEvent(buildAssetsTabViewEvent({ tabId: id, trigger: PLAUSIBLE_EVENT_TRIGGERS.CLICK }));
}
```

> `Tabs` is generic, but the Assets sub-tabs are its only `trackEventName` consumer today (`PLAUSIBLE_EVENTS.VIEW_OPEN`, with the `assets_tab` / `assets_page` payload). This keeps current behaviour and only adds `event_trigger`. If `Tabs` later gains other tracked consumers, the helper can be generalised; out of scope here.

### 6. Instrument the Assets section (entry-guarded `page_open` + landing `view_open`)

In **`src/frontend/src/lib/components/tokens/Assets.svelte`**, fire both events only when entering the Assets section from a non-Assets route (including initial load, where `from` is `null`). The landing `view_open` uses the current `activeTab`, tagged `auto`:

```ts
import { afterNavigate } from '$app/navigation';
import type { AfterNavigate } from '@sveltejs/kit';
import { nonNullish } from '@dfinity/utils';
import { isAssetsRouteId } from '$lib/utils/nav.utils';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_TRIGGERS,
	PLAUSIBLE_EVENT_VALUES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { buildAssetsTabViewEvent, trackEvent } from '$lib/services/analytics.services';

afterNavigate(({ from }: AfterNavigate) => {
	// Only count entering the Assets section, not switching Tokens/NFTs/Earning sub-tabs
	// (sub-tab clicks already fire view_open in Tabs.handleClick).
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

	// Landing tab impression — completes per-tab view counts (the clicked path is covered by Tabs).
	trackEvent(buildAssetsTabViewEvent({ tabId: activeTab, trigger: PLAUSIBLE_EVENT_TRIGGERS.AUTO }));
});
```

Add the `isAssetsRouteId` helper to `src/frontend/src/lib/utils/nav.utils.ts`, composed from the existing path predicates so route-id matching stays centralised and type-clean (the existing `isRouteTokens`/`isRouteNfts`/`isRouteEarning` take a `Page`, whereas here we have a raw route id from `NavigationTarget.route.id`):

```ts
export const isAssetsRouteId = (id: string | null): boolean =>
	isTokensPath(id) || isNftsPath(id) || isEarningPath(id);
```

> Reuse the existing `isTokensPath` / `isNftsPath` / `isEarningPath` helpers already defined in `nav.utils.ts`. Do not add new path constants.
>
> `activeTab` is the existing `$state` in `Assets.svelte` (initialised from the `tab` prop and bound by `Tabs`); when entering directly on a sub-route it already reflects that sub-route's tab, so the `auto` view matches the tab actually shown.

### 7. Instrument the Rewards fallback

In **`src/frontend/src/lib/components/rewards/Rewards.svelte`**, add the same `onMount` `PAGE_OPEN` with `REWARDS` / `REWARDS_PAGE`. This is the section shown in the Earn nav slot when `EARNING_ENABLED` is off.

> The route file `src/frontend/src/routes/(app)/rewards/+page.svelte` is already marked "Todo: remove once earn is permanently enabled." Tracking lives in the component, so it is removed automatically with the route when that cleanup happens.

### 8. Leave Earn untouched

`earning/Earning.svelte` already fires `PAGE_OPEN` with `EARN` / `EARN_PAGE`. Do not duplicate or modify it.

### 9. Add the `ui_click` event, helper, and `navigation` source

In `src/frontend/src/lib/enums/plausible.ts`, add `UI_CLICK = 'ui_click'` to `PLAUSIBLE_EVENTS` and `NAVIGATION = 'navigation'` to `PLAUSIBLE_EVENT_SOURCE_LOCATIONS` (the standard `source_location` enum).

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

### 10. Fire `ui_click` from the main nav menu and the Assets tab bar

Add an optional `trackEvent?: TrackEventParams` prop to **`NavigationItem.svelte`** and fire it from the link's `onclick`, exactly mirroring `ExternalLink.svelte` (`isNullish(trackEvent)` → return; else `trackEventServices(trackEvent)`). `NavigationItem` is consumed only by `NavigationMenuMainItems`, so this stays scoped to the main menu.

In **`NavigationMenuMainItems.svelte`**, pass a `ui_click` event to each item via the helper (`source_location = navigation`, `source_sublocation = main_menu`, `event_value` = the section id: `assets` / `activity` / `earn` / `explore` / `rewards` / `settings`).

In **`Tabs.svelte`**, in the same `nonNullish(trackEventName)` block that fires the `view_open`, additionally fire a `ui_click` (`source_sublocation = assets_tabs`, `event_value = id`). Keep the `view_open` (with `event_trigger = click`) as-is — the two events are complementary.

---

## Tests

Follow the existing `PAGE_OPEN` test precedent in `src/frontend/src/tests/lib/components/nfts/NftCard.spec.ts` (mock the analytics service, render the component, assert `trackEvent` is called with the exact `{ name, metadata }`).

- **Activity / Explore / Settings / Rewards:** one test each asserting `trackEvent` fires once on mount with `name: PAGE_OPEN` and the correct `event_context` + `event_value`.
- **Assets** (`src/frontend/src/tests/lib/components/tokens/Assets.spec.ts`):
  - Entering from a non-Assets route (and initial load, `from === null`) fires **two** events: `page_open` (`assets-page`) and `view_open` (`event_value` = active tab, `event_trigger = auto`).
  - Navigating in from an Assets route (Tokens↔NFTs↔Earning sub-tab switch) fires **neither** — no `page_open`, no `auto` `view_open`.
  - The `auto` `view_open`'s `event_value` matches the tab actually shown (parametrise over `tokens` / `nfts` / `earning`).
  - Drive `afterNavigate` via the SvelteKit navigation mocks already used in the suite.
- **`Tabs`** (`src/frontend/src/tests/lib/components/ui/Tabs.spec.ts`): clicking a tab fires the `view_open` (`event_trigger = click`, clicked tab's `event_value`) **and** the `ui_click` (`source_location = navigation`, `source_sublocation = assets_tabs`, `event_value` = tab). Confirms the click path is not double-counted by the entry guard.
- **`analytics.services` / helpers:** unit-test `buildAssetsTabViewEvent` for both `auto` and `click`, and `buildUiClickEvent` (with and without `source_sublocation` / `event_value`) — asserting full payloads, mirroring the `buildLearnMoreEvent` tests in `analytics.service.spec.ts`.
- **`NavigationItem`** (`src/frontend/src/tests/lib/components/navigation/NavigationItem.spec.ts`, new): clicking the item fires the provided `trackEvent`; no event when the prop is absent (mirrors the `ExternalLink` click-tracking test).
- **`nav.utils.spec.ts`:** add cases for `isAssetsRouteId` (true for tokens/nfts/earning ids, false for activity/explore/settings/earn/rewards/`null`).
- Do not add assertions to the Earn / NFT / Harvest tests — they are unchanged.

---

## Out of Scope

- The existing `PAGE_OPEN` on Earn, NFT, and Harvest pages — unchanged.
- Replacing `page_open` with click tracking: `page_open` remains the complete "visits however reached" metric (it must catch direct URLs, back/forward, redirects). The `ui_click` event is an _additional, orthogonal_ signal for how users navigate, not a substitute — and it deliberately does **not** add `event_trigger` to `page_open`.
- `ui_click` on navigation surfaces beyond the main nav menu and the Assets tab bar (user menu, back buttons, dApp cards, settings sub-nav, …) — same event, added later via new `source_location` / `source_sublocation` values.
- Migrating the legacy `location_source` key to the standard `source_location` — done step by step, separately.
- Generalising the `Tabs` `view_open` payload for non-Assets consumers (none exist today).
- Sub-navigation within Settings, Explore, or Activity (e.g. individual settings panels, dApp detail opens, transaction filters) — those have or can get their own events separately.
- Any dashboard/Confluence changes — the new values appear automatically once events flow.

### Known minor gap

Back/forward navigation _between_ Assets sub-tabs (e.g. NFTs → Tokens → back to NFTs) does not emit a `view_open`, because the entry guard treats it as intra-Assets navigation. Tab clicks (the primary path) and section entry are both counted; this edge case is accepted. Revisit only if back/forward sub-tab counts prove necessary.

---

## Acceptance Criteria

- [ ] Entering **Assets** from outside the section fires exactly two events: `page_open` (`event_context = assets`, `event_value = assets-page`) and `view_open` (`event_context = assets_tab`, `event_value` = the landing tab, `location_source = assets_page`, `event_trigger = auto`).
- [ ] Switching between Tokens/NFTs/Earning sub-tabs fires **one** `view_open` per switch, with `event_trigger = click`, and does **not** fire an additional `page_open` or `auto` `view_open`.
- [ ] The clicked-tab `view_open` and the landing `view_open` share an identical payload shape except `event_value` and `event_trigger`, produced by the shared `buildAssetsTabViewEvent` helper.
- [ ] `Tabs.handleClick` is refactored onto `buildAssetsTabViewEvent` with `trigger = click`; existing `assets_tab` / `assets_page` semantics are preserved.
- [ ] Visiting **Activity** fires `page_open` with `event_context = activity`, `event_value = activity-page`.
- [ ] Visiting **Explore** fires `page_open` with `event_context = explore`, `event_value = explore-page`.
- [ ] Visiting **Settings** fires `page_open` with `event_context = settings`, `event_value = settings-page`.
- [ ] Visiting **Rewards** (Earn slot when `EARNING_ENABLED` is off) fires `page_open` with `event_context = rewards`, `event_value = rewards-page`.
- [ ] **Earn** continues to fire its existing `page_open` (`earn-page`) with no change.
- [ ] Each `page_open` fires on _any_ entry to the section (nav click, direct URL, back/forward, redirect), not only on nav-menu clicks.
- [ ] Clicking a **main nav menu** item fires `ui_click` with `source_location = navigation`, `source_sublocation = main_menu`, and `event_value` = the section id; `page_open` stays trigger-less.
- [ ] Clicking an **Assets sub-tab** fires both `ui_click` (`source_location = navigation`, `source_sublocation = assets_tabs`, `event_value` = tab) and the existing `view_open` (`event_trigger = click`); `view_open`'s `event_trigger` is retained.
- [ ] `ui_click` uses the standard `source_location` key; the legacy `location_source` on `view_open` is left unchanged.
- [ ] `UI_CLICK` and `PLAUSIBLE_EVENT_SOURCE_LOCATIONS.NAVIGATION` members added; `ui_click` payloads are produced by the shared `buildUiClickEvent` helper.
- [ ] New `PLAUSIBLE_EVENT_VALUES`, `PLAUSIBLE_EVENT_CONTEXTS`, and `PLAUSIBLE_EVENT_TRIGGERS` members added; no new path constants introduced; `isAssetsRouteId` reuses existing path predicates.
- [ ] Unit tests cover the four newly instrumented sections, the Assets entry-vs-sub-tab guard (page_open + auto view_open), the `click` trigger via `Tabs`, the `buildAssetsTabViewEvent` helper, and `isAssetsRouteId`.
- [ ] Analytics never throws — tracking failures are swallowed and never affect the user flow (guaranteed by `trackEvent`).
- [ ] Quality gates pass: `npm run format`, `npm run lint -- --max-warnings 0`, `npm run check`, `npm run test`.
- [ ] In this PR, `docs/ai/PRODUCT.md` is updated to note that the five main navigation sections emit section-visit analytics, the Assets sub-tabs emit `auto`/`click` view analytics, and the main nav menu / Assets tab bar emit `ui_click` navigation analytics.
