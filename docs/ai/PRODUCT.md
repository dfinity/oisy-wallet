# OISY Wallet — Product Description

This document is the living description of OISY's product behaviors. It is read by Claude Code at the start of every session to provide context for implementation work.

---

## What is OISY

OISY is a browser-based, network-custodial, multi-chain wallet powered by the Internet Computer's chain fusion technology. It lets users receive, hold, and send native ICP, ICRC-1, ETH, ERC-20, and BTC without browser extensions or mobile apps. Keys are never held by a single entity — they are generated and managed using threshold ECDSA across ICP replica nodes.

Users authenticate via Internet Identity (WebAuthn), making OISY cross-device by default. The entire application — frontend and backend — is served from the chain.

---

## Navigation

The primary navigation is a desktop **sidebar** and a mobile **bottom bar** that share one set of destinations arranged by a grouped information architecture: **Portfolio**, **Finance**, and **More**. The grouping is intentionally different per form factor — the mobile bar has limited slots, so Notes earns a top-level slot there while NFTs lives in the More group; on desktop NFTs sits in Portfolio and Notes lives in More.

- **Portfolio** — Assets, NFTs, Activity.
- **Finance** — Trade, Earn, Borrow.
- **More** — Notes, Explore, Rewards, Settings.

On **desktop** every section is laid out at once under a non-interactive heading (**Portfolio** / **Finance** / **More**); nothing is hidden behind a tap and there is no "menu-open" state. There is exactly **one** "current page" signal and it is blue; it always lands on the actual page the user is on, never on two things at once.

- **NFTs is a first-class destination.** It has its own page (`/nfts/`) reached from a dedicated nav item, and is **no longer** a tab inside Assets. As a standalone page it shows **no Tokens / Earning / Trading tab bar** — only its own header (search, refresh, sort, settings) — while the other Assets pages keep their tabs. On that page the hero shows a **total NFT count** (e.g. "12 NFTs") with **per-network count pills** (e.g. "ICP · 8") instead of a fiat balance — an NFT portfolio has no single fiat figure — and the total matches the rendered list. Privacy mode does not hide these counts.
- **Finance destinations.** **Earn** (`/earn/`) is a standalone destination, distinct from the Earning tab inside Assets. **Trade** and **Borrow** carry a **`NEW`** tag and — since each has a single provider today — route **directly to that provider's page**, skipping the intermediate category page: Trade to the **OISY TRADE** provider page (`/providers/oisy-trade/`), Borrow to the Liquidium provider page (`/providers/liquidium/`). The Assets **Trading** tab (`/trading/`) remains a distinct surface. Trade and Earn each appear only while their feature flag is on.
- **Notes** is reachable directly from the navigation (in addition to the user menu). For now it opens the Notes modal rather than a page, so it never takes the blue "current page" treatment (a Notes page is a planned follow-up).
- **Rewards** is no longer a top-level item; it lives in the More group, while its content also lives inside the Earn page.

On **mobile** the bottom bar has five slots: **Assets · Activity · Finance · Notes · More**. **Finance** is a raised center **cradle** (layers icon) and **More** is the right-hand entry; each opens a **bottom sheet** of its children (Finance: Trade / Earn / Borrow; More: NFTs / Explore / Rewards / Settings) under the group name. The bar **stays visible while a sheet is open** so the opened entry can show its state: a **grey** "pressed" fill when the sheet is open over another page (the current page keeps its blue), and a **blue** treatment when the entry owns the current page — with the active child marked inside the sheet. Tapping the open entry again, the backdrop, or any destination closes the sheet. (These open-state signals are mobile-only; desktop shows every group at once with no "menu-open" state.)

The desktop sidebar's logo header and social-links footer remain a follow-up.

---

## Analytics

OISY uses [Plausible](https://plausible.io/) for privacy-friendly, cookieless analytics. Plausible is initialized once at app boot via the `@plausible-analytics/tracker` npm package. All events are fired through the central `trackEvent()` function in `src/frontend/src/lib/services/analytics.services.ts`, which wraps the tracker in a try/catch so analytics never disrupts the user flow.

The event schema and conventions are documented in [`docs/ai/frontend/analytics.md`](frontend/analytics.md) — the canonical reference — alongside the `PLAUSIBLE_*` enums in `src/frontend/src/lib/enums/plausible.ts`. Common attributes include `event_context`, `event_key`, `event_value`, `source_location`, `source_sublocation`, and the derived `source_path`.

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
| LiquidiumInfoBox                     | `liquidium`       | —                         |

**Excluded:** `HarvestAutopilotOverview` / `LiquidiumProviderHero` (scroll anchor, not an external link), `DappsCarouselSlide` / `DappCard` (buttons with no href), `RewardModal` / `RewardStateModal` / `Rewards.svelte` (tracked separately with custom reward event names).

**Deferred to a follow-up:**

- `Erc20Icp` — uses a custom `IconInfo` and a scoped white-text style block that `ExternalLink` cannot represent without a custom-icon slot.
- "Learn more" / "Read more" links embedded as raw `<a>` tags inside i18n strings rendered via `<Html text={...}>` / `{@html}` — they cannot be wired through `ExternalLink.trackEvent` without an i18n refactor (split the string at a placeholder and render the link separately) or a delegated click handler. Known cases: `activity.info.hidden_micro_transactions`, `core.warning.standalone_mode`, `tokens.warning.trust_token`.

### Personal notes tracking

The [Personal notes](#personal-notes) feature emits two structured Plausible events, both under `event_context: personal_notes` and content-free — no event ever carries the note text, a note id, the share token, the share key, or PII. Both follow the domain-service pattern (the action in `event_modifier`, the outcome in `result_status`) described in [`analytics.md`](frontend/analytics.md).

**`personal_note`** — the note lifecycle. Every event also carries `source_location: notes`.

| `event_modifier` | Fires when             | `result_status`     | Extra                                                                         |
| ---------------- | ---------------------- | ------------------- | ----------------------------------------------------------------------------- |
| `create`         | a note is created      | `success` / `error` | `event_value: first_note` on the user's first note; `result_error` on failure |
| `edit`           | a note is edited       | `success` / `error` | `result_error` on failure                                                     |
| `delete`         | a note is deleted      | `success` / `error` | `result_error` on failure                                                     |
| `open`           | the Notes modal opens  | `success`           | —                                                                             |
| `view`           | a note's preview opens | `success`           | —                                                                             |

**`personal_note_share`** — the [share](#sharing-a-note) funnel, a single event covering both the creator and the recipient, under `event_subcontext: share`. The step rides in `event_modifier`; `source_location` is `share_dialog` for creator steps and `recipient_page` for recipient steps.

| `event_modifier` | Side      | Fires when                         | Extra                                                                          |
| ---------------- | --------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| `open`           | creator   | the share dialog opens             | —                                                                              |
| `open`           | recipient | the link page opens                | —                                                                              |
| `create`         | creator   | a share link is created            | `single_use`, `expiry` (e.g. `7d`), `result_status`, `result_error` on failure |
| `reveal`         | recipient | the note is revealed               | `single_use`                                                                   |
| `copy`           | recipient | the revealed note is copied        | —                                                                              |
| `close`          | recipient | the revealed note is dismissed     | —                                                                              |
| `unavailable`    | recipient | the link is dead / expired / used  | —                                                                              |
| `discover`       | recipient | the "Discover OISY" CTA is clicked | `source_detail` (`outro` / `unavailable`)                                      |

Recipient-side steps fire on the logged-out public share page and stay anonymous. This consolidates six former flat `note_share_*` events into one; dashboards filter the funnel by `event_modifier` / `source_location`.

### Trading tracking

The [OISY Trade](#finance-destinations) DEX flows emit two structured Plausible events, both under `event_context: trading` with `event_provider: OISY Trade`, following the domain-service pattern (the action in `event_modifier`, the outcome in `result_status`). They carry only public chain data — token symbols, amounts, limit prices, and USD values — never a principal or PII. USD values are exact (`amount × exchange-rate price`), consistent with the `swap_offer` (Velora) event.

**`limit_order`** — placing and cancelling a limit order.

| `event_modifier` | Fires when           | `result_status`                 | Properties                                                                                                                                                                                        |
| ---------------- | -------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create`         | an order is placed   | `executing` → `success`/`error` | `token_symbol`/`token2_symbol` (base/quote), `side`, `order_type`, `token_amount`, `price`, `token_usd_price`/`token2_usd_price`, `token_usd_value`/`token2_usd_value`; `result_error` on failure |
| `cancel`         | an order is canceled | `executing` → `success`/`error` | same block minus `order_type` (the order view carries no time-in-force)                                                                                                                           |

**`deposit_withdraw`** — moving assets in and out of a trading venue's custody account. Venue-agnostic: `event_provider` names the venue.

| `event_modifier` | Fires when          | `result_status`                 | Properties                                                                                      |
| ---------------- | ------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `deposit`        | funds are deposited | `executing` → `success`/`error` | `token_symbol`, `token_amount`, `token_usd_price`, `token_usd_value`; `result_error` on failure |
| `withdraw`       | funds are withdrawn | `executing` → `success`/`error` | same                                                                                            |

---

## Tokens

### Curated tokens vs. metadata-only tokens

OISY ships a curated set of token definitions. Most are **curated tokens**: they appear in the manage-tokens list (so a user can enable them), a subset is enabled by default for new users, and they are selectable elsewhere in the wallet (including as swap destinations).

A definition can instead be marked **metadata-only** (`metadataOnly: true`). A metadata-only token is **not** surfaced by default — it is absent from the manage-tokens list, is never enabled by default, and is not offered as a swap destination. Its curated metadata (name, symbol, decimals, icon, tags, token-group membership) is still used to **enrich a token the user imports manually**: importing that exact ledger / contract address resolves the curated details and places the token in its group, exactly as a curated token would. In short: known to OISY, but surfaced only if the user explicitly adds it.

The tokens added for the 1Sec (OneSec) swap integration are metadata-only:

- On **ICP**, the 1Sec-bridged **USDC** (`53nhb-haaaa-aaaar-qbn5q-cai`) and **USDT** (`ij33n-oiaaa-aaaar-qbooa-cai`).
- On the **EVM** chains (Ethereum, Arbitrum, Base), **BOB**, **CHAT**, and **GLDT**.

A new user does not see any of these in the wallet; a user who wants one imports it by its ledger canister ID / contract address, after which it appears with full metadata and inside its token group.

ICP on the same EVM chains is intentionally **not** metadata-only: some users may already hold a balance in it, and marking it metadata-only would remove it from the default curated token set (potentially hiding that balance unless they explicitly import it). ICP stays curated and suggested there.

---

## Activity

### IC transactions and Index-canister outages

For tokens on the Internet Computer, balances and transaction history come from two different canisters: the balance from the token's Ledger canister, the history from its Index canister. OISY refreshes both every 30 seconds.

The two are treated independently, because only one of them is essential. If the Ledger canister cannot be reached the sync fails and the balance is dropped, since a wrong balance is worse than none. If the **Index** canister cannot be reached — it does not answer, or it answers with data OISY can tell is stale, which happens when it runs low on cycles and silently stops following the ledger — the balance still updates normally and the transactions already loaded stay on screen. OISY keeps retrying on the regular 30-second cycle; there is no separate back-off and no point at which it gives up for the session.

The user is only told about it once the problem looks real rather than transient: a warning appears on the Activity page after **three consecutive** failed checks for a token (roughly 90 seconds), listing the affected tokens, and disappears as soon as one check succeeds. Because the check succeeds or fails per token, a single misbehaving token does not implicate the others.

The same warning appears on the token's own page, above its transaction list — naming only that token, and labelling the list as stale rather than replacing it, since what was loaded before the outage is still worth showing. The warning can be dismissed, and the dismissal is remembered **per token and for that outage only**, and is shared between the two places: dismissing it on the token page also stops that token being named on the Activity page. Dismissing it while token A is failing does not silence token B failing later — the warning returns naming only B. And once A's Index canister answers again, A is forgotten, so a fresh outage of A is surfaced again rather than staying hidden for the rest of the session. The dismissal lives in the browser session, not in the user's profile: it is about the outage in front of them, not a lasting preference. Tokens are identified by their ledger canister ID rather than their symbol, so two tokens that happen to share a symbol are never confused for one another.

This is distinct from a token whose issuer provides **no** Index canister at all. There is nothing to retry there and no history will ever load, so that case shows its own notice, which the user can dismiss permanently per token — that one _is_ a lasting preference, and is stored in the user profile.

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

## Personal notes

Signed-in users have a private list of free-text **personal notes**, reached from a **Notes** item in the user menu placed directly **after Contacts**. The item opens a Notes modal that lists the user's notes newest-first, with a client-side **search** field to filter them; tapping a note opens a **read-only view**, and add, edit, and delete are all supported.

A note is a free-standing memo — it is **not** attached to any transaction, address, token, or network. Each note is body text plus created/updated timestamps; there is no **stored** title (the list and read-only view show the note's first line in bold as a de-facto title), and no rich text, attachments, tags, or folders.

- **End-to-end encrypted via vetKeys.** Notes are encrypted in the browser before they leave the device and decrypted in the browser on read, so the canister and the node providers only ever store and see **ciphertext**. A per-user symmetric key is derived via vetKD (one key per principal) and cached as a non-extractable `CryptoKey` in memory for the session only — never persisted to disk — so it is derived once per session and discarded on reload or sign-out. One user cannot read or write another user's notes.
- **Lazy loading.** Nothing loads at wallet startup. The notes (and the per-user key) are fetched, derived, and decrypted on the **first** open of the Notes modal; the decrypted notes are cached for the session, so re-opening is instant.
- **Limits.** A note holds up to **2,000 characters** (counted in Unicode code points, so any language / script / emoji is supported), enforced client-side; the backend independently rejects oversized ciphertext. Empty or whitespace-only notes cannot be saved. A user may keep up to **1,000 notes**; at the cap, creating a new note is refused (and the UI disables "Add note") while editing and deleting existing notes still work — no note is ever evicted.
- **Timestamps** are stored as UTC and displayed in the user's local timezone: a never-edited note reads "Created …", an edited note "Updated …" (and rises to the top, since the list sorts by last update).
- **Safe rendering.** Note text is rendered as plain text (auto-escaped, never as HTML), with line breaks handled by CSS and bidi/control characters neutralized on display, so a note cannot execute scripts or reorder surrounding UI. In the read-only view, `http`/`https` URLs become safe links that open in a new tab (`rel="noopener noreferrer"`); no other scheme is linkified.
- **Delete asks for confirmation** (the same pattern as deleting a contact): a "Delete note" prompt naming the note (its first ~15 characters, bold) and warning "This action cannot be undone.", shown as a dialog on desktop and a bottom sheet on mobile, with Cancel / Delete note. A single note that fails to decrypt shows an inline error with a Retry action without affecting the others. If the whole list cannot be loaded — e.g. the encryption-key service is temporarily rate-limited — the modal shows a "temporarily unavailable" state with a Retry action rather than an empty list.

The editor step deliberately has **no (X) and ignores backdrop clicks** — only Cancel or Save exits it — so unsaved text cannot be lost to an accidental dismissal; the list and empty states close normally via X, Close, or the backdrop.

The lifecycle (create / edit / delete, opening the surface, and opening a note's preview) is tracked via the `personal_note` Plausible event — see [Analytics → Personal notes tracking](#personal-notes-tracking).

### Sharing a note

From an open note, the user can create a **share link** that lets anyone holding the link read that one note — no OISY account required. Sharing is always initiated by the user, per note.

- **A snapshot, not a live view.** A share captures the note **as it is at creation**; editing or deleting the note afterwards does not change what an existing link shows. Sharing an updated version means creating a new link.
- **The canister never sees the note.** The note is encrypted in the browser with a fresh per-share key, and only opaque ciphertext is uploaded. The key travels **inside the link itself** and is never sent to OISY, so only someone with the full link can read the note — OISY and the node providers cannot. There is no server-side copy in the clear, so losing the link means losing access.
- **Abuse-resistant by design.** The link carries a random, unguessable identifier, so shares can't be found by guessing; opening a single-use link is rate-limited on the backend; and an expired, already-used, or unknown link all return the **same** "unavailable" response, so links can't be probed to learn which ones exist. Creating shares is itself rate-limited and capped per user.
- **Expiry and single-use.** The creator picks how long the link stays valid — **1 hour, 24 hours, 7 days, or 30 days** — and can optionally make it **single-use**, so it stops opening after it has been viewed once. Expiry is enforced by the backend.
- **No revocation.** Once shared, OISY cannot recall or revoke a link; it simply stops working after it expires or, for a single-use link, after its first view.
- **Limit.** A user may hold up to **100 active share links** at a time. At the cap the Share dialog disables link creation and explains that links free up as they expire or are used; existing shares are never evicted.

The share funnel — dialog open, link created, and the recipient's open / reveal / copy / close / unavailable / discover steps — is tracked via the `personal_note_share` Plausible event; see [Analytics → Personal notes tracking](#personal-notes-tracking).

---

## WalletConnect

OISY connects to external dApps over WalletConnect (Reown WalletKit). When a dApp proposes a session, OISY advertises one namespace per chain family for which the signed-in user has a loaded address, so each connection can span Ethereum, Solana, and Bitcoin at once. Multiple dApp connections can be open simultaneously (see [Multiple simultaneous connections](#multiple-simultaneous-connections)).

- **Ethereum (`eip155`)** — supports `eth_sendTransaction`, `eth_sign`, `personal_sign`, `eth_signTypedData_v4`, and `eth_signTypedData` (legacy).
- **Solana (`solana`)** — supports `solana_signTransaction`, `solana_signAndSendTransaction`, and `solana_signMessage`, advertised for the mainnet and devnet addresses that are present (including the legacy CAIP-10 namespaces for compatibility). For `solana_signMessage`, OISY decodes the base58 message and shows the decoded text for review when possible (falling back to the raw value if decoding fails), then returns the base58-encoded Ed25519 signature.
- **Bitcoin (`bip122`)** — supports `getAccountAddresses`, `signMessage`, and `signPsbt`. The namespace is advertised whenever any BTC address (mainnet, testnet, or regtest) is loaded, with one `bip122:<genesis>` chain and matching `bip122:<genesis>:<address>` account per present network, and the `bip122_addressesChanged` event.

### Simulated preview of a Solana transaction

Before a Solana `signTransaction` / `signAndSendTransaction` review renders, OISY asks the network to **simulate** the request and shows what it would do **to the user's own accounts**: the native SOL change on the user's address (which absorbs the transaction and priority fees), the per-mint SPL token changes across the user's token accounts, and — separately and as a warning — any change to who controls one of those accounts.

That last part is the reason the preview exists in the form it does. Handing a token account to a new owner, granting a delegate, granting a close authority, or reassigning the account to a different program moves no balance at all: the account keeps exactly the tokens it had. A preview built on amounts alone would show nothing and imply the request is harmless, so OISY diffs the owner, delegate, close-authority and owning-program fields as well as the amounts.

Simulation also sees what a static decode structurally cannot. Effects produced inside cross-program invocations do not exist in an unsigned message, so no decoder can read them; running the message reveals them as account changes.

The preview is deliberately **not** a safety verdict. It runs against the network's state at the current slot, and a program can behave differently when the transaction actually executes, so the review always says so and never claims a transaction is safe or verified. It is also **not** a substitute for the existing checks: a transaction OISY cannot review faithfully is still refused outright, whatever a simulation says about it.

Scope is deliberately narrow. The preview reports only the user's own accounts, never the counterparty's; and it is **best effort** — if the simulation fails, is unsupported, is too slow, or reports that the transaction would itself fail, the review renders with exactly the information it would have shown anyway, with no error and no preview. It never blocks a user from seeing or rejecting a request. For an approval, the spender is shown as before.

### Sources and destinations of a Solana transaction

The same review answers "where is this going?" with two lists rather than one address. **Sources** holds the accounts the transaction spends from, and **Destinations** the accounts it pays into. The two rules are asymmetric on purpose: Sources holds the sources of transfers **the user's account is the source of**, while Destinations holds the destinations of transfers the user's account is **either the source or the destination** of. So a counterparty paying into a pool is never listed as a source, and the user appears as a source only when value genuinely leaves one of their accounts. A plain send yields exactly one entry in each list; a swap yields several, because every leg the user is on one side of contributes its destination.

That asymmetry is what makes a swap describable at all. The leg that pays the user out puts one of the **user's own** accounts among the destinations, which is how the review shows what the user receives and not only what they spend. Such an entry is **marked as the user's own account**, so it does not read as a counterparty. Sources, by contrast, is hidden when it holds nothing but the wallet the review already names, since repeating it says nothing.

Only transfers count. Creating an associated token account, changing an authority, setting a compute budget, or approving a spender contributes to neither list (an approval keeps its own spender row). Accounts are listed by the **wallet that owns them** wherever OISY knows it, because SPL transfers name token accounts and nobody recognises their own associated token account.

The lists are built from the same simulation as the preview above, which is the only way to see a routed swap: such a swap performs every one of its transfers inside cross-program invocations, which do not exist in the unsigned message at all. When there is no simulation to build them from, OISY falls back to the instructions the message states itself **and says that the lists are partial**. That warning is not optional: without it, a routed swap would show two empty lists for a transaction that moves several amounts, and an empty list reads as an answer rather than as a gap.

Showing several addresses does not make a self-contradicting transaction showable. A transaction whose instructions **disagree** about source, destination, payer, token or action type is still refused outright, exactly as before. Several addresses that agree about what happened is a swap; instructions that disagree about what happened is something OISY cannot state faithfully at all.

The lists currently appear on the WalletConnect sign review. Showing them on an executed transaction in the activity list is a follow-up.

`signPsbt` is **sign-only**: OISY signs the PSBT the dApp provides and returns it, but does not broadcast the resulting transaction itself. Broadcasting is deferred to the dApp (and the `sendTransfer` method is intentionally not offered) so OISY never broadcasts a transaction it cannot fully account for — see the spec's broadcast-atomicity rationale.

### Starting a pairing from the scanner

A WalletConnect pairing is started from the universal scanner by scanning (or pasting) a pairing code. The scanner accepts two forms: a bare `wc:` URI, and an OISY WalletConnect deep-link URL that wraps it — `<OISY host>/wc/?uri=<url-encoded wc: uri>`. When a deep-link URL is scanned, OISY unwraps the inner `uri` and pairs with it. The URL form is only unwrapped when its host is **OISY's own domain** for the running environment (`oisy.com` in production); a `uri` param carried by any other host is never treated as a pairing. A well-formed WalletConnect deep-link URL whose host is a different domain shows a dedicated "this link is for a different domain" error rather than the generic invalid-code message, so the user understands the link was valid but pointed elsewhere.

### Multiple simultaneous connections

OISY supports **several dApp connections at once**, each independently manageable. Connecting a new dApp leaves the already-connected ones in place, and the "Connected Apps" list shows every live session. Each row's close button disconnects only that dApp; a "Disconnect all" control tears every connection down in one tap. When a dApp ends its own session, only that entry is removed and the others keep working. Incoming sign/send requests route to the correct session by topic across all open connections. Previously connected sessions are restored after a page refresh.

Requests are still handled **one at a time**: while a request from one dApp is under review, a request arriving from another is rejected with a "request skipped" notice. Session proposals are likewise reviewed one at a time — the user adds connections sequentially (scan/paste → review → approve, then repeat).

---

## Ethereum

### Transaction fees

When an Ethereum send or approval flow is open, OISY fetches the current network gas fee and keeps it current for as long as the flow stays open. If the wallet is backgrounded — common on mobile, where switching apps, locking the screen, or bouncing between a dApp and OISY during a WalletConnect approval suspends the tab — the fee fetch can be interrupted. OISY recovers on its own: it re-fetches the fee when the wallet returns to the foreground, and retries transient fetch failures automatically, so a send is not left permanently unable to proceed.

A transaction is never submitted without a resolved fee: every Ethereum send path refuses to proceed until the fee is available.

The fee a send quotes is what the transaction is **expected to cost**, not the most it could cost. Ethereum charges the network's own base fee plus whatever tip the sender adds, and refunds the difference between that and the ceiling the sender authorised; it also refunds gas the transaction did not use. Quoting the ceiling would overstate the price, often close to double for a token transfer, because the ceiling deliberately carries headroom for a base-fee rise and because token transfers pad their gas limit. The ceiling still decides whether a send is **affordable**: the balance checks and the "max" amount button hold the user to the worst case, so a send can never start out payable and end up short. When the network does not report a base fee, the quote falls back to the ceiling, since overstating the cost is safer than showing none. The send flow and WalletConnect transaction requests quote an expected cost; swap, convert and stake still quote the maximum. This is currently limited to local and staging builds: beta and production still quote the maximum everywhere, unchanged.

### Transaction priority

An Ethereum or EVM send lets the user pick how fast it should confirm: **slow**, **standard** or **fast**. This is currently limited to local and staging builds; beta and production keep the previous single-speed form. Standard is the default and the recommendation, and the choice lasts for that one send rather than being remembered. Each option is priced against the same transaction, so the amounts differ only by the tip the sender is willing to add, which is the part of the fee they actually control. Picking a different speed re-prices from the sample already in hand rather than asking the network again, so the quoted fee updates immediately. Whatever is chosen is what gets signed. On a small screen the options open in a sheet; on a large one they expand in place. Where the network reports no choice, the row does not appear and the send behaves as it did before. The same choice is offered when a connected dApp asks the wallet to sign a transaction, on every request type it can ask for, since the speed is a property of the transaction rather than of what the transaction does. There the options are priced against the gas limit the dApp asked for, which is the limit that gets signed, so they agree with the fee quoted beneath them. Swaps, conversions and staking still use the standard speed.

---

## Bitcoin

### Pending-transaction reservation

While a BTC send initiated through the wallet is unconfirmed, its UTXOs are reserved on the backend so the next send flow cannot pick the same UTXOs and build a conflicting transaction. Reservations are kept per user (the caller's principal) and auto-expire one hour after they are recorded, on the assumption that a still-unconfirmed transaction at that point has failed and the inputs are free again.

The Bitcoin address scoped to a reservation is always **derived from the authenticated principal** (P2WPKH from the threshold-ECDSA-derived public key). The caller cannot specify which address's pending transactions are read, added, or pruned — there is no API surface for that, and there is no support for a single user owning multiple addresses. The reservation system is a self-affecting UX guard; double-spend itself is prevented by Bitcoin consensus.

---

## Swap

### Chain Fusion as a swap provider

Turning ETH into ckETH, a twinned ERC-20 into its ckERC-20 counterpart, or BTC into ckBTC is offered inside the Swap modal as an ordinary provider named **Chain Fusion**, competing on rate with ICPSwap, KongSwap, Velora, NEAR Intents and 1Sec. Selecting ETH as the pay token puts ckETH among the receive options; selecting ckETH puts ETH among them, and the same holds for every ck twin whose native side is on **Ethereum mainnet** — the only network where the ck helper contracts are deployed. USDC on Base or Arbitrum therefore gets no Chain Fusion offer, because a ckUSDC deposit made there could never be minted.

**Bitcoin joins the swap universe through this provider, and in production only through it.** Before Chain Fusion, a user holding BTC opened Swap and saw no offers at all: no DEX in the list quotes a Bitcoin pair. Bitcoin now appears as a pay token with ckBTC as its sole receive option, and ckBTC offers BTC back alongside whatever the IC DEXes and 1Sec quote. In production the pairing is Bitcoin↔ICP only: Bitcoin never reaches Ethereum or Solana in the network filter, because no provider there can take it. On local and staging, NEAR Intents also serves Bitcoin (see [NEAR Intents as a Bitcoin swap provider](#near-intents-as-a-bitcoin-swap-provider-local-and-staging)).

The offer carries no slippage: a ck conversion is deterministic, so the rate is 1:1 apart from fees, and the form's fee section itemizes those fees one row at a time rather than as a single sum — the provider sheet carries no fees, only the provider's identity and the minimum amount the minter imposes. Two cases are worth calling out:

- A **ckERC-20 withdrawal** is the one case that charges in a _third token_ — the minter's Ethereum gas is paid in ckETH — so the fee list names it separately and the form blocks Review when the user's ckETH balance cannot cover it.
- A **BTC deposit**'s fee depends on the user's own coins, since the Bitcoin network fee falls out of which UTXOs a deposit of that size has to spend. When those coins cannot fund the deposit — the balance is short, the confirmations are not in yet, or another send has already reserved the inputs — no offer appears at all, and the form explains which of those it is rather than quoting a fee the send would then refuse. A deposit is also held to the same minimum amount as a plain Bitcoin send, below which the output would be un-relayable dust.

The quoted receive amount is what the minter actually credits, which is **not** always what the Convert flow shows. Two directions are not 1:1: a **BTC deposit** loses the minter's KYT fee (Convert quotes it 1:1 and is wrong — a 1 000-satoshi deposit mints 900), and a **ckBTC withdrawal** loses the Bitcoin network and minter fees. Everything else is 1:1, with its fees charged on top. Either way the fee breakdown lists every component that costs something, and its total is the user's whole cost of the conversion — the part paid out of balance plus the part withheld from what lands.

The pre-existing **Convert** flow is unchanged and still reachable from a token's own page. Both paths coexist; the two mechanisms are identical, only the entry point, the presentation and — for a BTC deposit — the honesty of the quoted amount differ.

### NEAR Intents as a Bitcoin swap provider (local and staging)

Behind `NEAR_INTENTS_BTC_SWAP_ENABLED` (`src/frontend/src/env/rest/near-intents.env.ts`, on for local and staging builds, off in production), NEAR Intents also serves Bitcoin. Native BTC then appears as a pay token toward the NEAR Intents destination chains (Ethereum, Arbitrum, Base, BSC, Polygon and Solana mainnets), competing with the Chain Fusion ckBTC offer, and EVM and Solana tokens quote toward BTC, with the payout going to the user's own BTC address. A destination whose address the user does not hold yet is simply not quoted, so a quote can never pay out to a wrong-chain address.

Funds cannot move before the user has acknowledged the NEAR Intents terms of service, exactly as in the EVM and Solana wizards. A BTC-source swap broadcasts the deposit transaction and becomes an **active user transaction at the moment of broadcast**, not when the flow finishes: a BTC broadcast is irreversible, so the swap is tracked even if a later step throws, and the global poller drives it to success or failure across modal close, refresh and logout, identically to the EVM and Solana NEAR Intents swaps. The spent UTXOs stay reserved while the deposit is pending, so a concurrent send cannot double-spend them.

What this deliberately does not do: no BTC testnet or regtest support (mainnet only, like the rest of NEAR Intents), and no production enablement. With the flag off, production behavior is byte-for-byte the previous sections.

### Cross-session settlement

Every ck conversion outlives the modal. Once the user's funds have left their wallet the conversion becomes an **active user transaction**: a backend-persisted row that keeps settling with the modal closed, survives a tab close, a refresh and a logout, and resumes polling on next login from what it stored rather than from anything held in memory. This is a capability the Convert flow has never had — there, a conversion's progress dies with the modal.

How settlement is observed differs by direction, because the minters answer different questions:

- A **withdrawal** (ckETH → ETH, ckERC-20 → ERC-20, ckBTC → BTC) is exact. The minter is asked about the withdrawal directly, keyed on the ledger burn index it returned. Note that a freshly submitted withdrawal is unknown to its minter until it indexes the request, which is treated as "still in flight" and never as a failure — a terminal verdict cannot be taken back. A withdrawal the minter reimburses is reported as failed, as soon as that is decided rather than when the refund lands.
- An **Ethereum mint** (ETH → ckETH, ERC-20 → ckERC-20) has no per-deposit status endpoint, so it is followed the same way the Convert flow's pending "virtual" transaction is: the deposit counts as in flight for as long as the minter has not yet scanned past the Ethereum block it landed in, and the helper contract's deposit log is what confirms, once the minter has, that there was a deposit to mint at all. A transaction that reverted, or that mined without producing a deposit log for this user, is reported as failed rather than quietly counted as a success.
- A **Bitcoin deposit** (BTC → ckBTC) is the one conversion the app has to _finish_, not merely watch: the ckBTC minter credits nothing until someone asks it to look at the deposit address, so a deposit whose tab was closed before its confirmations landed would otherwise sit there indefinitely. The row therefore asks the minter to mint once the deposit has enough confirmations — sparingly, since OISY already does this for every enabled ckBTC wallet, and the request is harmless to repeat — and takes the minter's own answer as the verdict: minted, or rejected because the Bitcoin checker flagged the coins or they were too small to cover the check fee. A deposit that is confirmed but not yet minted, and any failure to reach the minter, leave the conversion in flight so the next attempt retries.

When a row reaches a terminal state it refreshes the wallet and reports into the **swap** analytics funnel — not the convert one — exactly once, including when it finalizes across a page refresh.

---

## Buy (OnRamper)

Users can buy crypto with fiat through an embedded OnRamper widget. OnRamper requires the destination wallet addresses in the widget URL to be HMAC-signed so they cannot be tampered with in transit; OISY holds the signing secret in the backend canister (it never reaches the browser) and the frontend asks the backend to sign the URL before loading the widget.

The frontend supplies the wallet addresses it derived, but the backend signs them only after **re-deriving each one from the authenticated caller's principal and confirming it matches** — and it signs its own derived value, not the supplied string. So a caller can only ever obtain a signature over addresses they provably own (a signed OISY widget URL can only route a purchase to the signed-in user), and a frontend/backend derivation discrepancy fails the request loudly rather than signing an address the user may not control. If a supplied address does not match, cannot be derived, or the signing secret is not configured, the widget is shown as unavailable rather than loaded with an unverified URL.
