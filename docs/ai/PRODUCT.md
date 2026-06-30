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

### Chain-fusion-signer call tracking (`cfs_sign`)

Every paid chain-fusion-signer call fires a `cfs_sign` Plausible event on **both** success and error. The calls are wrapped at the single API chokepoint `src/frontend/src/lib/api/signer.api.ts` via the `withCfsSignTracking()` helper, so address/balance reads as well as the signing operations (ETH transaction / prehash / personal-sign, BTC sign / send, Schnorr, generic ECDSA) are all covered.

| Attribute                                | Value                                                                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event_context`                          | `signer` (`PLAUSIBLE_EVENT_CONTEXTS.SIGNER`)                                                                                                                   |
| `event_subcontext`                       | the called signer method (`PLAUSIBLE_EVENT_SUBCONTEXT_CFS`, e.g. `eth_sign_transaction`)                                                                       |
| `result_status`                          | `success` / `error`                                                                                                                                            |
| `result_duration_in_seconds`(`_rounded`) | measured wall-clock duration of the call                                                                                                                       |
| `token_network`                          | derived from the method prefix (`eth` / `btc` / `sol`); omitted for chain-agnostic generic calls                                                               |
| `result_error` / `result_error_text`     | mapped message / full raw error text (error only)                                                                                                              |
| `result_error_severity`                  | `blocker` when OISY's backend cannot pay the signer (it is out of cycles — a `SignerCanisterPaymentError`); `critical` for any other signer error (error only) |

The `blocker` severity makes the backend-out-of-cycles outage — which blocks signing for **every** user — visible on dashboards before support tickets arrive. Tracking is fire-and-forget: `withCfsSignTracking` always re-throws so it never swallows the underlying error or interrupts a send.

---

## Exchange-rate sourcing

OISY prices tokens against USD (and, for non-USD display currencies, derives an FX rate by cross-referencing BTC). Prices come from two layers that work together rather than as an either/or.

**Backend is the primary source.** When backend exchange rates are enabled, the price worker (`src/frontend/src/lib/workers/exchange.worker.ts`) asks the backend for the caller's token set. The backend prices native tokens plus the caller's priceable custom tokens via CoinGecko (primary) and ICPSwap (supplemental, ICRC-only). By design this is a subset: tokens CoinGecko doesn't cover and ICPSwap can't supplement come back without a price and are simply absent from the backend response.

**The frontend fills the gaps.** Rather than showing no price for those tokens, the worker then runs its own providers, but **only for the tokens the backend returned without a price** — the missing ERC-20 / SPL / ICRC tokens and any unpriced native singles. It fetches just that missing subset (skipping any category that has nothing missing, and skipping the provider step entirely when the backend priced everything), then merges the provider results into the backend response with **the backend winning on every collision**. The derived ERC-4626 prices are recomputed from the merged ERC-20 prices. When backend rates are disabled, the frontend takes the unchanged full-provider path.

**The fill excludes CoinGecko by default.** `COINGECKO_FALLBACK_PROVIDER_ENABLED` (in `src/frontend/src/env/rest/coingecko.env.ts`, default `false`) governs CoinGecko's participation in the backend-mode fill only: the CoinGecko-only categories (natives, ERC-20, SPL) are skipped entirely and the ICRC gaps are filled via the ICPSwap/Kong cascade alone. The flag is separate from `COINGECKO_PROVIDER_ENABLED` (which stays on and governs the backend-disabled full-provider path), and the BTC-cross FX rate for non-USD display currencies keeps using CoinGecko in both modes — the backend provides no FX substitute.

**Per-provider kill-switches exist in both layers.** Each price provider has a hardcoded enable flag, flipped by editing code rather than runtime config — a code-level kill-switch per provider. The backend exposes two Rust `const` flags (`COINGECKO_PROVIDER_ENABLED`, `ICPSWAP_PROVIDER_ENABLED`); the frontend exposes three `*_PROVIDER_ENABLED` consts in `src/frontend/src/env/rest/` (`COINGECKO_PROVIDER_ENABLED`, `ICPSWAP_PROVIDER_ENABLED`, `KONGSWAP_PROVIDER_ENABLED`). KongSwap is frontend-only. The fallback fill goes through the same flag-gated provider helpers, so a disabled frontend provider does not participate in the fill either.

**Backend mode is environment-scoped.** Backend exchange mode is permitted only on LOCAL/STAGING builds (`BACKEND_EXCHANGE_ENABLED` in `src/frontend/src/env/exchange.env.ts`): there the frontend honours the canister's runtime `exchange_rate_enabled` flag and, when on, uses backend-primary sourcing with the frontend fill. On BETA/PROD builds the frontend never queries the canister flag and always takes the full frontend-provider path (CoinGecko primary with the ICPSwap fallback cascade), regardless of the backend's runtime state.

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

---

## WalletConnect

OISY connects to external dApps over WalletConnect (Reown WalletKit). When a dApp proposes a session, OISY advertises one namespace per chain family for which the signed-in user has a loaded address, so each connection can span Ethereum, Solana, and Bitcoin at once. Multiple dApp connections can be open simultaneously (see [Multiple simultaneous connections](#multiple-simultaneous-connections)).

- **Ethereum (`eip155`)** — supports `eth_sendTransaction`, `eth_sign`, `personal_sign`, `eth_signTypedData_v4`, and `eth_signTypedData` (legacy).
- **Solana (`solana`)** — supports `solana_signTransaction`, `solana_signAndSendTransaction`, and `solana_signMessage`, advertised for the mainnet and devnet addresses that are present (including the legacy CAIP-10 namespaces for compatibility).
- **Bitcoin (`bip122`)** — supports `getAccountAddresses`, `signMessage`, and `signPsbt`. The namespace is advertised whenever any BTC address (mainnet, testnet, or regtest) is loaded, with one `bip122:<genesis>` chain and matching `bip122:<genesis>:<address>` account per present network, and the `bip122_addressesChanged` event.

`signPsbt` is **sign-only**: OISY signs the PSBT the dApp provides and returns it, but does not broadcast the resulting transaction itself. Broadcasting is deferred to the dApp (and the `sendTransfer` method is intentionally not offered) so OISY never broadcasts a transaction it cannot fully account for — see the spec's broadcast-atomicity rationale.

### Multiple simultaneous connections

OISY supports **several dApp connections at once**, each independently manageable. Connecting a new dApp leaves the already-connected ones in place, and the "Connected Apps" list shows every live session. Each row's close button disconnects only that dApp; a "Disconnect all" control tears every connection down in one tap. When a dApp ends its own session, only that entry is removed and the others keep working. Incoming sign/send requests route to the correct session by topic across all open connections. Previously connected sessions are restored after a page refresh.

Requests are still handled **one at a time**: while a request from one dApp is under review, a request arriving from another is rejected with a "request skipped" notice. Session proposals are likewise reviewed one at a time — the user adds connections sequentially (scan/paste → review → approve, then repeat).

---

## Bitcoin

### Pending-transaction reservation

While a BTC send initiated through the wallet is unconfirmed, its UTXOs are reserved on the backend so the next send flow cannot pick the same UTXOs and build a conflicting transaction. Reservations are kept per user (the caller's principal) and auto-expire one hour after they are recorded, on the assumption that a still-unconfirmed transaction at that point has failed and the inputs are free again.

The Bitcoin address scoped to a reservation is always **derived from the authenticated principal** (P2WPKH from the threshold-ECDSA-derived public key). The caller cannot specify which address's pending transactions are read, added, or pruned — there is no API surface for that, and there is no support for a single user owning multiple addresses. The reservation system is a self-affecting UX guard; double-spend itself is prevented by Bitcoin consensus.

---

## Buy (OnRamper)

Users can buy crypto with fiat through an embedded OnRamper widget. OnRamper requires the destination wallet addresses in the widget URL to be HMAC-signed so they cannot be tampered with in transit; OISY holds the signing secret in the backend canister (it never reaches the browser) and the frontend asks the backend to sign the URL before loading the widget.

The frontend supplies the wallet addresses it derived, but the backend signs them only after **re-deriving each one from the authenticated caller's principal and confirming it matches** — and it signs its own derived value, not the supplied string. So a caller can only ever obtain a signature over addresses they provably own (a signed OISY widget URL can only route a purchase to the signed-in user), and a frontend/backend derivation discrepancy fails the request loudly rather than signing an address the user may not control. If a supplied address does not match, cannot be derived, or the signing secret is not configured, the widget is shown as unavailable rather than loaded with an unverified URL.
