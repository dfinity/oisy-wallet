This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Move Language & Currency Selectors from the User Menu to the Settings Page

## Goal

Relocate the **language** and **currency** preference selectors out of the user
menu (the `IconUser` popover) and onto the dedicated Settings page, grouped under
a new **Preferences** card. The **theme/appearance** selector stays in the user
menu and is out of scope.

## Motivation

- **These two settings rarely change.** Language and currency are set-once
  preferences for most users, so they don't warrant prime real estate in a menu
  opened on every session.
- **The user menu has grown large.** Removing two rows trims it down.
- **Preparation for moving the "Settings" entry into the user menu.** We plan to
  surface the "Settings" navigation entry inside the user menu soon. Having
  language/currency controls _and_ a "Settings" entry living side by side in the
  same popover would be incoherent — those controls belong _behind_ the Settings
  entry, on the Settings page. This move sets that up.

---

## Background

The user menu popover (`src/frontend/src/lib/components/core/Menu.svelte`)
renders three preference selectors at the bottom, inside a single block:

```svelte
<div class="flex max-w-80 flex-col gap-5 py-5">
	<MenuLanguageSelector />

	{#if $authSignedIn}
		<MenuCurrencySelector />

		<MenuThemeSelector />
	{/if}
</div>
```

Note the asymmetry today:

- **Language** sits _outside_ the `authSignedIn` guard — it is shown to
  logged-out users too (the menu is reachable on the lock / landing screen).
- **Currency** and **theme** are inside the `authSignedIn` guard — signed-in
  only.

The selectors are thin wrappers around reusable dropdowns:

- `src/frontend/src/lib/components/core/MenuLanguageSelector.svelte` — label +
  `IconLanguage` + `LanguageDropdown` (this PR swaps the icon to `IconWorld`;
  see the UX rules section below).
- `src/frontend/src/lib/components/currency/MenuCurrencySelector.svelte` — label
  - `IconDollarSign` + `CurrencyDropdown`.

The underlying dropdowns are self-contained and own all the switching logic and
analytics:

- `src/frontend/src/lib/components/core/LanguageDropdown.svelte` — calls
  `i18n.switchLang(lang)` and fires `TRACK_CHANGE_LANGUAGE` with
  `source: $authSignedIn ? 'app' : 'landing-page'`.
- `src/frontend/src/lib/components/currency/CurrencyDropdown.svelte` — calls
  `currencyStore.switchCurrency(currency)` (which persists to `localStorage` and
  refreshes the exchange-rate store, and tracks `TRACK_CHANGE_CURRENCY`).

The Settings page is composed of stacked `SettingsCard` sections, each holding
`SettingsCardItem` rows (`key` / `value` / optional `info` snippets):

- Route component:
  `src/frontend/src/routes/(app)/settings/+page.svelte` (renders `Settings`).
- Main component: `src/frontend/src/lib/components/settings/Settings.svelte`
  (currently: General card, Networks card, `SettingsExportData`, optional
  `SettingsExperimentalFeatures`, `SettingsVersion`).
- Building blocks: `src/frontend/src/lib/components/settings/SettingsCard.svelte`
  and `.../SettingsCardItem.svelte`.

The Settings page lives under the authenticated `(app)` route group, so it is
only reachable when signed in.

---

## Decisions (resolved during clarification)

1. **Scope:** move **language** and **currency** only. **Theme/appearance stays
   in the user menu.**
2. **Presentation:** a **new dedicated "Preferences" `SettingsCard`** on the
   Settings page (not folded into the existing General card).
3. **Logged-out language switching:** because the Settings page is signed-in
   only, **keep a language switcher in the user menu when logged out**. Once
   signed in, the language selector no longer appears in the menu — signed-in
   users change language on the Settings page. Currency is signed-in only (as
   today) and moves entirely to the Settings page.

   This is a **durable** decision, not a temporary fallback: "Settings" is only
   available to logged-in users, so even after the planned move of the
   "Settings" entry into the user menu (see Motivation), logged-out users will
   still have no Settings page to reach — the menu remains their only place to
   switch language.

This yields the following matrix:

| Selector | Logged-out (menu) | Signed-in (menu) | Settings page (signed-in) |
| -------- | ----------------- | ---------------- | ------------------------- |
| Language | ✅ (kept)         | ❌ (removed)     | ✅ (new)                  |
| Currency | — (n/a today)     | ❌ (removed)     | ✅ (new)                  |
| Theme    | — (n/a today)     | ✅ (unchanged)   | — (out of scope)          |

---

## UX rules for the language switcher (MUST hold everywhere it is rendered)

These two rules apply to **every** rendering of the language switcher, anywhere
in the app — the user menu today, the Settings Preferences card from this spec
on, and anything added later. They are non-negotiable.

1. **A user who does not speak the current UI language must still be able to
   locate the language switcher.** This means the localized text label is
   **not sufficient on its own** — a German-only user staring at "Sprache" or
   a Japanese-only user staring at "言語" tells them nothing if they cannot
   read the UI's current language. The switcher must therefore carry a
   universal visual cue alongside the label, and that cue **must be a
   globe** — the pattern Apple/iOS, browsers, Wikipedia and Google all use
   for language selection. In oisy that is
   [`IconWorld`](../../../src/frontend/src/lib/components/icons/IconWorld.svelte).

   **Do not use a translation-script glyph** (e.g. oisy's existing
   [`IconLanguage`](../../../src/frontend/src/lib/components/icons/IconLanguage.svelte)
   — a "文"-style mark next to an "A") for this purpose: it depicts
   "translation between scripts", not "language selection", and is a
   second-tier cue at best. **Never ship a language-switcher entry that is
   text-only.**

2. **Every language option in the dropdown is rendered as an autonym** — in
   its own script, never translated into the current UI language. "Deutsch"
   not "German"; "日本語" not "Japanese"; "Русский" not "Russian". This is
   already enforced by the `LANGUAGES` map in
   [`src/frontend/src/env/i18n.ts`](../../../src/frontend/src/env/i18n.ts)
   (note the inline comment: _"We don't need to translate it as we always
   show it in its own language"_) and consumed verbatim by `LanguageDropdown`.
   Do not change either side of that contract without an explicit decision.

The same icon-cue principle is applied to the **currency** row for visual
symmetry and because money/$ is similarly recognizable across languages —
[`IconDollarSign`](../../../src/frontend/src/lib/components/icons/IconDollarSign.svelte)
sits inline next to the currency label.

---

## Implementation

### 1. New component: `SettingsPreferences.svelte`

Create `src/frontend/src/lib/components/settings/SettingsPreferences.svelte`,
following the same `SettingsCard` + `SettingsCardItem` pattern as
`SettingsExportData.svelte`. It renders a "Preferences" card with two rows that
**reuse the existing dropdowns directly** (do not reuse the `Menu*Selector`
wrappers — their menu-specific styling, e.g. `pl-3` and the tertiary inline
label, does not match the settings card layout) **and carry the icon cue
prescribed by the [UX rules](#ux-rules-for-the-language-switcher-must-hold-everywhere-it-is-rendered)
above** — `IconWorld` next to the language label, `IconDollarSign` next to
the currency label, rendered inline inside the `key` snippet:

```svelte
<script lang="ts">
	import LanguageDropdown from '$lib/components/core/LanguageDropdown.svelte';
	import CurrencyDropdown from '$lib/components/currency/CurrencyDropdown.svelte';
	import IconDollarSign from '$lib/components/icons/IconDollarSign.svelte';
	import IconWorld from '$lib/components/icons/IconWorld.svelte';
	import SettingsCard from '$lib/components/settings/SettingsCard.svelte';
	import SettingsCardItem from '$lib/components/settings/SettingsCardItem.svelte';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<SettingsCard>
	{#snippet title()}{$i18n.settings.text.preferences}{/snippet}

	<SettingsCardItem>
		{#snippet key()}
			<span class="flex items-center gap-2">
				<span class="flex text-tertiary">
					<IconWorld size="20" />
				</span>
				{$i18n.core.text.language}
			</span>
		{/snippet}
		{#snippet value()}<LanguageDropdown />{/snippet}
	</SettingsCardItem>

	<SettingsCardItem>
		{#snippet key()}
			<span class="flex items-center gap-2">
				<span class="flex text-tertiary">
					<IconDollarSign size="20" />
				</span>
				{$i18n.core.text.currency}
			</span>
		{/snippet}
		{#snippet value()}<CurrencyDropdown />{/snippet}
	</SettingsCardItem>
</SettingsCard>
```

Notes:

- Reuse the existing i18n labels `core.text.language` and `core.text.currency`
  for the row keys, and **always render them alongside the icon** — text-only
  is a violation of UX rule 1 and must be flagged in review.
- **The language and currency icons should look visually balanced** — same
  weight, same size, same color, **in both light and dark mode**. They are
  equal-status affordances; neither should compete for attention. In
  practice the icon's colour must follow the surrounding theme wrapper
  (i.e. inherit `currentColor`) rather than carry a hardcoded fill or
  stroke — otherwise the icon stays one literal colour while its neighbour
  theme-adapts and the two diverge in dark mode. Mechanics beyond that are
  an implementation choice.
- No `info` snippet is passed, so `SettingsCardItem` suppresses the help-icon
  button (matches its documented behaviour).
- Consider adding a `data-tid` test id for the card / rows in
  `src/frontend/src/lib/constants/test-ids.constants.ts` if the component test
  (below) needs stable selectors; otherwise the dropdowns' existing test ids
  (`LANGUAGE_DROPDOWN`, `CURRENCY_SWITCHER_BUTTON`) are sufficient.

### 2. Mount it in `Settings.svelte`

Add `<SettingsPreferences />` to
`src/frontend/src/lib/components/settings/Settings.svelte`, placed **after the
General card and before the Networks card** (preferences sit high, above
networks / export). Add the matching import.

### 3. Update `Menu.svelte`

In `src/frontend/src/lib/components/core/Menu.svelte`:

- **Remove** the `MenuCurrencySelector` usage and its import
  (`$lib/components/currency/MenuCurrencySelector.svelte`).
- **Gate the language selector to logged-out only.** `authNotSignedIn` is
  already imported in this file.
- **Keep `MenuThemeSelector`** under the existing `authSignedIn` guard.

Replace the bottom block:

```svelte
<div class="flex max-w-80 flex-col gap-5 py-5">
	{#if $authNotSignedIn}
		<MenuLanguageSelector />
	{/if}

	{#if $authSignedIn}
		<MenuThemeSelector />
	{/if}
</div>
```

Keep the `MenuLanguageSelector` import (still used for the logged-out case).

### 4. Delete the now-dead `MenuCurrencySelector.svelte`

After step 3, `src/frontend/src/lib/components/currency/MenuCurrencySelector.svelte`
has no remaining references. **Delete it.** Verify with a repo-wide search for
`MenuCurrencySelector` that nothing else imports it.

(Keep `MenuLanguageSelector.svelte` — still used by the logged-out menu.)

### 5. Add the `preferences` i18n key

Add to `src/frontend/src/lib/i18n/en.json` under `settings.text` (e.g. right
after `"general"`):

```json
"preferences": "Preferences",
```

Then regenerate i18n types and propagate keys across locales:

```bash
npm run i18n
```

`en.json` is the source of truth; `npm run i18n` regenerates
`src/frontend/src/lib/types/i18n.d.ts` (so `$i18n.settings.text.preferences`
type-checks) and runs `i18n.generate.keys.ts` to keep the 15 locale files
(`ar, cs, de, en, es, fr, hi, it, ja, ko-KR, pl, pt, ru, vi, zh-CN`) structurally
in sync. Translating the new string into the non-English locales is **optional /
follow-up** — missing keys fall back to English. `scripts/check.i18n.mjs` only
flags _unused_ en.json keys, and `preferences` will be used by
`SettingsPreferences.svelte`, so it passes.

---

## Testing

- Add `src/frontend/src/tests/lib/components/settings/SettingsPreferences.spec.ts`:
  assert the card renders both the language dropdown (`LANGUAGE_DROPDOWN` /
  `lang-selector`) and the currency dropdown (`CURRENCY_SWITCHER_BUTTON` /
  `currency-selector`), and the "Preferences" title.
- The existing dropdown specs
  (`src/frontend/src/tests/lib/components/core/LanguageDropdown.spec.ts`,
  `.../currency/CurrencyDropdown.spec.ts`) render the dropdowns standalone and
  are **unaffected** by the move — no changes expected.
- There is currently **no** `Menu.spec.ts` or `Settings.spec.ts`. A small
  optional menu test could assert the currency selector is absent and that the
  language selector only renders when logged out — include it only if it fits
  the existing test conventions without new infrastructure.

Run the frontend quality gates from repo root before declaring done:

```bash
npm run format
npm run lint -- --max-warnings 0
npm run check
npm run test
```

No Rust files change, so backend gates are not required.

---

## Out of Scope

- The **theme/appearance** selector (`MenuThemeSelector`) — stays in the user
  menu, unchanged.
- Any change to the switching logic, persistence, or analytics inside
  `LanguageDropdown` / `CurrencyDropdown` / `currency.store` / `i18n.store`.
- Translating `settings.text.preferences` into non-English locales (English
  fallback is acceptable; can be a follow-up).
- Restyling the Settings page or the dropdown components beyond placing them in
  `SettingsCardItem` rows.

---

## Acceptance Criteria

- [ ] A new **"Preferences"** card appears on the Settings page containing a
      **Language** row and a **Currency** row, each backed by the existing
      `LanguageDropdown` / `CurrencyDropdown`.
- [ ] The **language** row renders `IconWorld` inline before the localized
      "Language" label, and the **currency** row renders `IconDollarSign`
      inline before the localized "Currency" label — satisfying UX rule 1
      (language switcher discoverable without reading the current UI
      language).
- [ ] The language dropdown lists each option as an **autonym** ("Deutsch",
      "日本語", "Русский", …) — UX rule 2; verified by the existing
      `LANGUAGES` map in `src/frontend/src/env/i18n.ts`, which this PR does
      not modify.
- [ ] Changing language or currency from the Settings page works exactly as it
      did from the menu (persists and updates the UI / exchange rate).
- [ ] The **currency** selector no longer appears anywhere in the user menu.
- [ ] The **language** selector appears in the user menu **only when logged
      out**, and not when signed in.
- [ ] The **theme/appearance** selector still appears in the user menu when
      signed in (unchanged).
- [ ] `MenuCurrencySelector.svelte` is deleted and has no remaining references;
      `MenuLanguageSelector.svelte` is retained.
- [ ] `settings.text.preferences` exists in `en.json`, i18n types are
      regenerated, and `$i18n.settings.text.preferences` type-checks.
- [ ] `npm run format`, `npm run lint -- --max-warnings 0`, `npm run check`, and
      `npm run test` all pass.

---

## Post-Merge (per workflow Step 7 — Post-merge cleanup)

- Update `docs/ai/PRODUCT.md` to describe the Settings-page Preferences card and
  the logged-out-only language switcher in the menu. (PRODUCT.md currently has
  no language/currency/menu entry to reconcile.)
- This spec has no asset folder to remove.
