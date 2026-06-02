# Spec: Track "Learn More" Link Clicks in Plausible

## Goal

Track every "Learn more" link click in Plausible so we can see how often users seek documentation and from which part of the UI.

---

## Background

Oisy uses the `ExternalLink` component (`src/frontend/src/lib/components/ui/ExternalLink.svelte`) throughout the UI for "Learn more" links. This component already supports a `trackEvent` prop that fires a Plausible event on click. Some links (RewardModal, RewardStateModal) already use it; most do not.

Plausible events are fired via `trackEvent()` in `src/frontend/src/lib/services/analytics.services.ts`. Event names live in `src/frontend/src/lib/enums/plausible.ts` (`PLAUSIBLE_EVENTS`) and `src/frontend/src/lib/constants/analytics.constants.ts`.

---

## Event Schema

All "Learn more" clicks fire the existing `open_documentation` event with the following attributes, following the schema defined in the [Plausible Events](https://dfinity.atlassian.net/wiki/spaces/OISY/pages/2534572046/Plausible+Events) Confluence page.

| Attribute            | Value                                                                       |
| -------------------- | --------------------------------------------------------------------------- |
| **Event**            | `open_documentation`                                                        |
| `event_context`      | `learn_more`                                                                |
| `event_subcontext`   | i18n key of the link label (e.g. `lock.text.learn_more`)                    |
| `event_key`          | `link`                                                                      |
| `event_value`        | the destination URL                                                         |
| `source_location`    | component/page name, snake_case (see table below)                           |
| `source_sublocation` | only set when a component has multiple "Learn more" links (see table below) |

---

## Links to Instrument

| Component                    | File                                                                           | `source_location` | `source_sublocation`      | `event_subcontext` (i18n key)         | `event_value` (URL)                     |
| ---------------------------- | ------------------------------------------------------------------------------ | ----------------- | ------------------------- | ------------------------------------- | --------------------------------------- |
| LockPage                     | `src/frontend/src/lib/components/auth/LockPage.svelte`                         | `lock`            | —                         | `lock.text.learn_more`                | hardcoded URL in component              |
| NftImageConsentModal         | `src/frontend/src/lib/components/nfts/NftImageConsentModal.svelte`             | `nft`             | —                         | `nfts.text.learn_more`                | `OISY_NFT_DOCS_URL`                     |
| ReferralCodeModal            | `src/frontend/src/lib/components/referral/ReferralCodeModal.svelte`            | `referral`        | —                         | `referral.invitation.text.learn_more` | `OISY_REFERRAL_URL`                     |
| ScannerInfo (scan link)      | `src/frontend/src/lib/components/scanner/ScannerInfo.svelte`                   | `scanner`         | `scan`                    | `scanner.text.learn_more_about_scan`  | `OISY_SCAN_URL`                         |
| ScannerInfo (pay link)       | `src/frontend/src/lib/components/scanner/ScannerInfo.svelte`                   | `scanner`         | `pay`                     | `scanner.text.learn_more_about_pay`   | `OISY_PAY_URL`                          |
| Settings                     | `src/frontend/src/lib/components/settings/Settings.svelte`                     | `settings_page`   | `hide_micro_transactions` | `settings.text.learn_more`            | `OISY_HIDE_MICRO_TRANSACTIONS_DOCS_URL` |
| SettingsExperimentalFeatures | `src/frontend/src/lib/components/settings/SettingsExperimentalFeatures.svelte` | `settings_page`   | `experimental_features`   | `rewards.text.learn_more`             | `OISY_AI_ASSISTANT_DOCS_URL`            |

> **Note:** `source_location` values use snake_case to match the existing convention in `PLAUSIBLE_EVENT_SOURCE_LOCATIONS` (`activity_page`, `manage_tokens`, `token_details`). New entries are added to that enum.
>
> **Note:** `HarvestAutopilotOverview` has a "Learn more" link that scrolls to an on-page anchor (not an external URL) — exclude it from this change.
>
> **Note:** `SettingsExperimentalFeatures` reuses the `rewards.text.learn_more` i18n key — this is a pre-existing issue, leave it for a separate fix.

---

## Implementation

### 1. Add event constant

The `open_documentation` event already exists as `TRACK_OPEN_DOCUMENTATION` in `src/frontend/src/lib/constants/analytics.constants.ts`. Reuse it. Do not add a new entry to `PLAUSIBLE_EVENTS` in the enum.

### 2. Extend `PLAUSIBLE_EVENT_SOURCE_LOCATIONS`

Add `LOCK = 'lock'`, `NFT = 'nft'`, `REFERRAL = 'referral'`, `SCANNER = 'scanner'` entries so the helper can be type-safe and source locations stay centralised. The existing `SETTINGS_PAGE = 'settings_page'` entry is reused for both settings components.

### 3. Add a shared `buildLearnMoreEvent` helper

`ExternalLink.trackEvent` is a `TrackEventParams` object that the component fires on click. To avoid repeating the full object literal at every usage site, add a factory helper in `src/frontend/src/lib/services/analytics.services.ts` that returns the params:

```ts
export const buildLearnMoreEvent = ({
	sourceLocation,
	sourceSublocation,
	eventSubcontext,
	url
}: {
	sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS;
	sourceSublocation?: string;
	eventSubcontext: string;
	url: string;
}): TrackEventParams => ({
	name: TRACK_OPEN_DOCUMENTATION,
	metadata: {
		event_context: 'learn_more',
		event_subcontext: eventSubcontext,
		event_key: 'link',
		event_value: url,
		source_location: sourceLocation,
		...(nonNullish(sourceSublocation) && { source_sublocation: sourceSublocation })
	}
});
```

### 4. Wire up each ExternalLink

For each component in the table above, pass a `trackEvent` prop to the relevant `ExternalLink`, building the params with `buildLearnMoreEvent(...)`. Example for `LockPage`:

```svelte
<ExternalLink
	href={LOCK_DOCS_URL}
	ariaLabel={$i18n.lock.text.learn_more}
	trackEvent={buildLearnMoreEvent({
		sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.LOCK,
		eventSubcontext: 'lock.text.learn_more',
		url: LOCK_DOCS_URL
	})}
>
	{$i18n.lock.text.learn_more}
</ExternalLink>
```

> `ExternalLink` accepts `trackEvent: TrackEventParams` (`{ name, metadata?, warning? }`) and fires it on click — same pattern as `RewardModal`.

---

## Out of Scope

- Fixing the `SettingsExperimentalFeatures` i18n key (`rewards.text.learn_more` → a proper key)
- `HarvestAutopilotOverview` scroll anchor link
- Already-tracked links in `RewardModal` and `RewardStateModal`

---

## Acceptance Criteria

- [ ] All seven links listed in the table fire an `open_documentation` Plausible event on click.
- [ ] Each event has `event_context = learn_more`, the correct `event_subcontext` i18n key, `event_key = link`, `event_value` = the destination URL, and the correct `source_location`.
- [ ] `ScannerInfo` links additionally set `source_sublocation` (`scan` / `pay`).
- [ ] `Settings` and `SettingsExperimentalFeatures` set `source_sublocation` (`hide_micro_transactions` / `experimental_features`).
- [ ] No existing tracking on `RewardModal` / `RewardStateModal` is changed.
- [ ] `HarvestAutopilotOverview` is not changed.
- [ ] Analytics never throws — errors are caught and do not affect the user flow.
