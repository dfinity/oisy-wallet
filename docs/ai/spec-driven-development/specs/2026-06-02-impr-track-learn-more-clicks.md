# Spec: Track "Learn More" Link Clicks in Plausible

## Goal

Track every "Learn more" link click in Plausible so we can see how often users seek documentation and from which part of the UI.

---

## Background

Oisy uses the `ExternalLink` component (`src/frontend/src/lib/components/ui/ExternalLink.svelte`) throughout the UI for "Learn more" links. This component already supports a `trackEvent` prop that fires a Plausible event on click. Some links already use it; most do not.

Plausible events are fired via `trackEvent()` in `src/frontend/src/lib/services/analytics.services.ts`. Event names live in `src/frontend/src/lib/enums/plausible.ts` (`PLAUSIBLE_EVENTS`) and `src/frontend/src/lib/constants/analytics.constants.ts`.

---

## Event Schema

All "Learn more" clicks fire the existing `open_documentation` event with the following attributes, following the schema defined in the [Plausible Events](https://dfinity.atlassian.net/wiki/spaces/OISY/pages/2534572046/Plausible+Events) Confluence page.

| Attribute            | Value                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Event**            | `open_documentation`                                                                                                               |
| `event_context`      | `learn_more`                                                                                                                       |
| `event_subcontext`   | i18n key of the link label (e.g. `lock.text.learn_more`)                                                                           |
| `event_key`          | `link`                                                                                                                             |
| `event_value`        | the destination URL                                                                                                                |
| `source_location`    | component/page name, snake_case (see table below)                                                                                  |
| `source_sublocation` | only set when a component has multiple "Learn more" links (see table below)                                                        |
| `source_path`        | slash-joined human-readable identity: `<source_location> / <source_sublocation?> / <English label>` (see note below for resolution) |

---

## Links to Instrument

| Component                            | File                                                                                              | `source_location` | `source_sublocation`      | `event_subcontext` (i18n key)          | `event_value` (URL)                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------- | ------------------------- | -------------------------------------- | --------------------------------------- |
| LockPage                             | `src/frontend/src/lib/components/auth/LockPage.svelte`                                            | `lock`            | —                         | `lock.text.learn_more`                 | hardcoded URL in component              |
| NftImageConsentModal                 | `src/frontend/src/lib/components/nfts/NftImageConsentModal.svelte`                                | `nft`             | —                         | `nfts.text.learn_more`                 | `OISY_NFT_DOCS_URL`                     |
| ReferralCodeModal                    | `src/frontend/src/lib/components/referral/ReferralCodeModal.svelte`                               | `referral`        | —                         | `referral.invitation.text.learn_more`  | `OISY_REFERRAL_URL`                     |
| ScannerInfo (scan link)              | `src/frontend/src/lib/components/scanner/ScannerInfo.svelte`                                      | `scanner`         | `scan`                    | `scanner.text.learn_more_about_scan`   | `OISY_SCAN_URL`                         |
| ScannerInfo (pay link)               | `src/frontend/src/lib/components/scanner/ScannerInfo.svelte`                                      | `scanner`         | `pay`                     | `scanner.text.learn_more_about_pay`    | `OISY_PAY_URL`                          |
| Settings                             | `src/frontend/src/lib/components/settings/Settings.svelte`                                        | `settings_page`   | `hide_micro_transactions` | `settings.text.learn_more`             | `OISY_HIDE_MICRO_TRANSACTIONS_DOCS_URL` |
| SettingsExportData                   | `src/frontend/src/lib/components/settings/SettingsExportData.svelte`                              | `settings_page`   | `export_data`             | `settings.text.learn_more`             | `OISY_EXPORT_DATA_DOCS_URL`             |
| SettingsExperimentalFeatures         | `src/frontend/src/lib/components/settings/SettingsExperimentalFeatures.svelte`                    | `settings_page`   | `experimental_features`   | `rewards.text.learn_more`              | `OISY_AI_ASSISTANT_DOCS_URL`            |
| WelcomeModal                         | `src/frontend/src/lib/components/welcome/WelcomeModal.svelte`                                     | `welcome`         | —                         | `rewards.text.learn_more`              | `OISY_REWARDS_URL`                      |
| EarningHeader                        | `src/frontend/src/lib/components/earning/EarningHeader.svelte`                                    | `earn`            | —                         | `core.text.learn_more`                 | `OISY_EARN_URL`                         |
| SignerSignIn                         | `src/frontend/src/lib/components/signer/SignerSignIn.svelte`                                      | `signer`          | —                         | `core.text.learn_more`                 | `OISY_SIGNER_CONNECT_DOCS_URL`          |
| RewardsRequirements                  | `src/frontend/src/lib/components/rewards/RewardsRequirements.svelte`                              | `rewards`         | `requirements`            | `rewards.text.learn_more`              | `reward.learnMoreHref` (dynamic prop)   |
| TransactionsFilterContactsEmptyState | `src/frontend/src/lib/components/transactions/filter/TransactionsFilterContactsEmptyState.svelte` | `transactions`    | —                         | `core.text.learn_more`                 | hardcoded URL in component              |
| Erc20Icp                             | `src/frontend/src/lib/components/core/Erc20Icp.svelte`                                            | `erc20_icp`       | —                         | `hero.text.learn_more_about_erc20_icp` | `ERC20_ICP_REPO_URL`                    |

> **Note:** `source_location` values use snake_case to match the existing convention in `PLAUSIBLE_EVENT_SOURCE_LOCATIONS` (`activity_page`, `manage_tokens`, `token_details`). New entries are added to that enum.
>
> **Note:** `HarvestAutopilotOverview` has a "Learn more" link that scrolls to an on-page anchor (not an external URL) — exclude it from this change.
>
> **Note:** `DappsCarouselSlide` and `DappCard` use `dapps.alt.learn_more` only as an `aria-label` on a `<button>` with no href — these are not "Learn more" links and are excluded.
>
> **Note:** `Rewards.svelte` already tracks its "Learn more" link with a custom `TRACK_REWARD_LEARN_MORE` event — leave it untouched.
>
> **Note:** `SettingsExperimentalFeatures` reuses the `rewards.text.learn_more` i18n key — this is a pre-existing issue, leave it for a separate fix.
>
> **Note:** `Settings` and `SettingsExportData` both use `settings.text.learn_more` as their `event_subcontext`. They remain distinguishable in analytics via `source_sublocation` (`hide_micro_transactions` vs `export_data`).
>
> **Note:** `source_path` is a derived dashboard-ergonomics field. The English label is resolved from the bundled `src/frontend/src/lib/i18n/en.json` via the `event_subcontext` key (always English, regardless of the user's locale, so dashboards stay consistent), then run through `replaceOisyPlaceholders` so tokens like `$oisy_short` become `OISY`. If the key fails to resolve, the label segment is omitted. Examples: `settings_page / export_data / Learn more`, `scanner / pay / Learn more about OISY Pay`, `lock / Learn more`.

---

## Implementation

### 1. Add event constant

The `open_documentation` event already exists as `TRACK_OPEN_DOCUMENTATION` in `src/frontend/src/lib/constants/analytics.constants.ts`. Reuse it. Do not add a new entry to `PLAUSIBLE_EVENTS` in the enum.

### 2. Extend `PLAUSIBLE_EVENT_SOURCE_LOCATIONS`

Add entries for all new `source_location` values used in the table above (`lock`, `nft`, `referral`, `scanner`, `welcome`, `earn`, `signer`, `rewards`, `transactions`) so the helper remains type-safe and source locations stay centralised. The existing `SETTINGS_PAGE = 'settings_page'` entry is reused for the three settings components.

### 3. Add a shared `buildLearnMoreEvent` helper

`ExternalLink.trackEvent` is a `TrackEventParams` object that the component fires on click. To avoid repeating the full object literal at every usage site (13 in total), add a factory helper in `src/frontend/src/lib/services/analytics.services.ts` that returns the params:

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
}): TrackEventParams => {
	const label = resolveEnglishLabel(eventSubcontext);
	const source_path = [sourceLocation, sourceSublocation, label].filter(nonNullish).join(' / ');

	return {
		name: TRACK_OPEN_DOCUMENTATION,
		metadata: {
			event_context: 'learn_more',
			event_subcontext: eventSubcontext,
			event_key: 'link',
			event_value: url,
			source_location: sourceLocation,
			...(nonNullish(sourceSublocation) && { source_sublocation: sourceSublocation }),
			source_path
		}
	};
};
```

`resolveEnglishLabel` is a small private helper that walks the dot-path against the bundled `en.json` and runs the result through `replaceOisyPlaceholders`. Call-site signatures are unchanged.

### 4. Convert raw `<a>` tags to `ExternalLink`

`TransactionsFilterContactsEmptyState` uses a raw `<a>` tag instead of `ExternalLink`. Convert it to `ExternalLink` first (with `color="blue"`, `iconVisible={false}` to match the existing blue, icon-less inline link), then add the `trackEvent` prop.

### 5. Wire up each ExternalLink

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
- `DappsCarouselSlide` / `DappCard` button elements
- Already-tracked links in `RewardModal`, `RewardStateModal`, and `Rewards.svelte`
- `Erc20Icp` (`src/frontend/src/lib/components/core/Erc20Icp.svelte`): uses a custom `IconInfo` icon and a scoped white-text style block that `ExternalLink` cannot represent without a custom-icon slot. Defer until either `ExternalLink` gains an icon slot or the design changes.
- **Documentation links embedded as raw `<a>` tags inside i18n strings** (rendered via `<Html text={...}>` / `{@html}`) cannot be wired through `ExternalLink.trackEvent` without either an i18n refactor (split the string at a placeholder and render the link separately in the component) or a delegated click handler. Known cases:
  - `activity.info.hidden_micro_transactions` — "Learn more" → `docs.oisy.com/.../filter-for-small-transactions` (in `HiddenMicroTransactionsInfoBox`)
  - `core.warning.standalone_mode` — "Read more" → `docs.oisy.com/.../saving-oisy-web-app-to-your-device`
  - `tokens.warning.trust_token` — "here" → external MetaMask docs

  Defer to a follow-up spec; the refactor approach affects every locale of the touched key and should be planned separately.

---

## Acceptance Criteria

- [ ] All 13 links listed in the table fire an `open_documentation` Plausible event on click.
- [ ] Each event has `event_context = learn_more`, the correct `event_subcontext` i18n key, `event_key = link`, `event_value` = the destination URL, and the correct `source_location`.
- [ ] Each event includes a `source_path` field that joins `source_location`, optional `source_sublocation`, and the English-resolved label with ` / `, with OISY placeholders expanded.
- [ ] `ScannerInfo` links set `source_sublocation` (`scan` / `pay`).
- [ ] `Settings`, `SettingsExportData`, and `SettingsExperimentalFeatures` set `source_sublocation` (`hide_micro_transactions` / `export_data` / `experimental_features`).
- [ ] `RewardsRequirements` sets `source_sublocation = requirements`.
- [ ] `TransactionsFilterContactsEmptyState` is converted from a raw `<a>` tag to `ExternalLink` before tracking is added.
- [ ] No existing tracking on `RewardModal`, `RewardStateModal`, or `Rewards.svelte` is changed.
- [ ] `HarvestAutopilotOverview` is not changed.
- [ ] Analytics never throws — errors are caught and do not affect the user flow.
