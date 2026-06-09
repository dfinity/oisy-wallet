# OISY Wallet — Product Description

This document is the living description of OISY's product behaviors. It is read by Claude Code at the start of every session to provide context for implementation work.

---

## What is OISY

OISY is a browser-based, network-custodial, multi-chain wallet powered by the Internet Computer's chain fusion technology. It lets users receive, hold, and send native ICP, ICRC-1, ETH, ERC-20, and BTC without browser extensions or mobile apps. Keys are never held by a single entity — they are generated and managed using threshold ECDSA across ICP replica nodes.

Users authenticate via Internet Identity (WebAuthn), making OISY cross-device by default. The entire application — frontend and backend — is served from the chain.

---

## Analytics

OISY uses [Plausible](https://plausible.io/) for privacy-friendly, cookieless analytics. Plausible is initialized once at app boot via the `@plausible-analytics/tracker` npm package. All events are fired through the central `trackEvent()` function in `src/frontend/src/lib/services/analytics.services.ts`, which wraps the tracker in a try/catch so analytics never disrupts the user flow.

The event schema is documented in the [Plausible Events Confluence page](https://dfinity.atlassian.net/wiki/spaces/OISY/pages/2534572046/Plausible+Events). Common attributes include `event_context`, `event_key`, `event_value`, `source_location`, `source_sublocation`, and the derived `source_path`.

### "Learn More" Link Tracking

Every "Learn more" link in the UI fires the `open_documentation` Plausible event on click, using the following attribute values:

| Attribute            | Value                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `event_context`      | `learn_more` (`PLAUSIBLE_EVENT_CONTEXTS.LEARN_MORE`)                                              |
| `event_key`          | `link` (`PLAUSIBLE_EVENT_EVENTS_KEYS.LINK`)                                                       |
| `event_value`        | destination URL                                                                                   |
| `source_location`    | snake_case identifier for the component/page (`PLAUSIBLE_EVENT_SOURCE_LOCATIONS`)                 |
| `source_sublocation` | set only when a page has multiple "Learn more" links                                              |
| `source_path`        | derived dashboard-scannable column: `<source_location> / <source_sublocation?> / <English label>` |

The event payload is built via the `buildLearnMoreEvent()` factory helper in `src/frontend/src/lib/services/analytics.services.ts` and passed as the `trackEvent` prop to the `ExternalLink` component. The helper takes a `labelKey` (an i18n dot-path), uses it to resolve the English label from the bundled `en.json` for `source_path` (with OISY placeholders like `$oisy_short` expanded), and never re-emits the key itself in the payload.

**Tracked links:**

| Component                            | `source_location` | `source_sublocation`      |
| ------------------------------------ | ----------------- | ------------------------- |
| LockPage                             | `lock`            | —                         |
| NftImageConsentModal                 | `nft`             | —                         |
| ReferralCodeModal                    | `referral`        | —                         |
| ScannerInfo (scan)                   | `scanner`         | `scan`                    |
| ScannerInfo (pay)                    | `scanner`         | `pay`                     |
| Settings                             | `settings_page`   | `hide_micro_transactions` |
| SettingsExportData                   | `settings_page`   | `export_data`             |
| SettingsExperimentalFeatures         | `settings_page`   | `experimental_features`   |
| WelcomeModal                         | `welcome`         | —                         |
| EarningHeader                        | `earn`            | —                         |
| SignerSignIn                         | `signer`          | —                         |
| RewardsRequirements                  | `rewards`         | `requirements`            |
| TransactionsFilterContactsEmptyState | `transactions`    | —                         |

**Excluded:** `HarvestAutopilotOverview` (scroll anchor, not an external link), `DappsCarouselSlide` / `DappCard` (buttons with no href), `RewardModal` / `RewardStateModal` / `Rewards.svelte` (tracked separately with custom reward event names).

**Deferred to a follow-up:**

- `Erc20Icp` — uses a custom `IconInfo` and a scoped white-text style block that `ExternalLink` cannot represent without a custom-icon slot.
- "Learn more" / "Read more" links embedded as raw `<a>` tags inside i18n strings rendered via `<Html text={...}>` / `{@html}` — they cannot be wired through `ExternalLink.trackEvent` without an i18n refactor (split the string at a placeholder and render the link separately) or a delegated click handler. Known cases: `activity.info.hidden_micro_transactions`, `core.warning.standalone_mode`, `tokens.warning.trust_token`.

---

## User Preferences

### Language and currency selectors

Signed-in users change their UI **language** and their display **currency** on the **Settings** page (`/settings`), inside a dedicated **Preferences** card placed above the Networks card. Each row pairs the existing dropdown (`LanguageDropdown` / `CurrencyDropdown`) with an icon next to the localized label.

The row icons are theme-adaptive: they inherit the surrounding text colour rather than carrying a hardcoded fill, so they keep visual parity with each other in both light and dark mode.

Two UX rules apply to every rendering of the language switcher, anywhere in the app:

1. **The switcher carries a globe icon next to the localized label.** In oisy that is `IconWorld` — the universally-recognised cue Apple/iOS, browsers, Wikipedia, and Google all use for language selection. A translation-script glyph like `IconLanguage` is the wrong cue (it depicts "translation between scripts", not "language selection") and must not be used.
2. **Every language option in the dropdown is an autonym** — rendered in its own script ("Deutsch" not "German", "日本語" not "Japanese", "Русский" not "Russian"). Enforced by the `LANGUAGES` map in `src/frontend/src/env/i18n.ts`.

### User menu

The user-menu popover (the `IconUser` button) carries a **Language** selector for **logged-out users only** — the Settings page lives behind authentication, so the menu is their only entry point. Signed in, the menu drops the language row; the Settings Preferences card takes over.

The user menu also carries the **theme/appearance** selector when signed in (unchanged).

The **currency** selector does **not** appear in the user menu — it is always reached via the Settings Preferences card.
