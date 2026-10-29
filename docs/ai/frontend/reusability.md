# Reusability — Catalog & Rules

> **Before you create, search.** This page is the answer to "is there
> already something for that?". Keep it up to date as part of the
> [meta-update rule](../governance.md#meta-update-rule): every PR that adds
> a reusable building block adds a row here.

> Building a mockup or wireframe rather than shipping code? The same
> catalog applies: see [`../visual-artifacts.md`](../visual-artifacts.md).

## The reuse rule

1. **Search first.** Use `Grep` / `Glob` (or your tool's equivalent) for
   the nearest concept before inventing one.
2. **Reuse if it fits.** Even at 80% — extend it if needed, with props.
3. **Extract if it doesn't.** If two places now do similar things, extract
   to one of the catalog locations below and update both call sites in
   the same PR (still atomic — one logical change: "consolidate X").
4. **Add a row here.** Don't make the next agent re-discover it.

## Where reusable things live

| Layer                                | Path                                                                 | What goes there                                                                                                                    |
| ------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Generic UI primitives**            | `$lib/components/ui/`                                                | App-local primitives, incl. the vendored ones (Modal, Toast, BottomSheet, LoaderSpinner, Popover, Input, …).                       |
| **App-wide presentational**          | `$lib/components/common/`                                            | Tiny shared blocks: `List`, `ListItem`, `ListItemButton`, `Divider`, `MaxBalanceButton`, `ModalHero`, `ModalListItem`, `QrButton`. |
| **Feature components (cross-chain)** | `$lib/components/<feature>/`                                         | Cross-chain feature surfaces (auth, send, receive, swap, contact, hero, ai-assistant, settings, …). See list below.                |
| **Chain-specific components**        | `$btc / $eth / $evm / $icp / $sol / $icp-eth /components/<feature>/` | UI specific to a chain.                                                                                                            |
| **Cross-cutting utils**              | `$lib/utils/<concern>.utils.ts`                                      | Pure helpers usable across chains.                                                                                                 |
| **Chain-specific utils**             | `<chain>/utils/<concern>.utils.ts`                                   | Pure helpers specific to one chain.                                                                                                |
| **Cross-cutting constants**          | `$lib/constants/<concern>.constants.ts`                              | App-wide constants & enums.                                                                                                        |
| **Cross-cutting services**           | `$lib/services/`                                                     | Side-effectful operations shared across chains.                                                                                    |
| **Stores / derived (cross)**         | `$lib/stores/`, `$lib/derived/`                                      | Cross-chain reactive state.                                                                                                        |
| **Stores / derived (per-chain)**     | `<chain>/stores/`, `<chain>/derived/`                                | Chain-local reactive state.                                                                                                        |
| **REST clients**                     | `$lib/rest/`                                                         | CoinGecko, Blockstream, kongswap, icpswap, near-intents, harvest, …                                                                |
| **Providers**                        | `$lib/providers/`                                                    | Long-lived providers (auth, swap, wallet-connect).                                                                                 |
| **Workers**                          | `$lib/workers/`                                                      | Web workers (auth, exchange) — schedule via `$lib/schedulers/`.                                                                    |
| **Mocks / fixtures**                 | `$tests/mocks/`, `$tests/fixtures/`                                  | First check before writing a new mock.                                                                                             |

## Catalog (current — keep this honest)

> Edit this section in any PR that adds, renames, or removes an entry
> matching one of these buckets. Don't list every component — list things
> agents are most likely to re-create by accident.

### Layout, chrome, navigation

| Component / module                      | Where                                          | Use it for                     |
| --------------------------------------- | ---------------------------------------------- | ------------------------------ |
| `Banner`, `Footer`, `Menu`, `Back`      | `$lib/components/core/`                        | App-shell chrome.              |
| `LanguageDropdown`                      | `$lib/components/core/LanguageDropdown.svelte` | Locale selector.               |
| `MenuAddresses`, `MenuLanguageSelector` | `$lib/components/core/`                        | Top-bar menus.                 |
| `LockOrSignOut`                         | `$lib/components/core/LockOrSignOut.svelte`    | Lock / sign-out user controls. |
| `IntervalLoader`                        | `$lib/components/core/IntervalLoader.svelte`   | Periodic refresh loader.       |

`Button` keeps its child snippet mounted while loading, hiding it behind the existing spinner.
Stateful children such as `IconSwap` retain their state when loading ends. If a state icon
changes during loading, retain its displayed state until loading ends so the transition
does not finish while the children are invisible (see `NftHideButton`).

### Common building blocks

| Component                               | Where                             | Use it for                                                                                                                                                |
| --------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `List`, `ListItem`, `ListItemButton`    | `$lib/components/common/`         | Vertical lists of items.                                                                                                                                  |
| `ListItemCheckbox`                      | `$lib/components/common/`         | Multi-select row; renders its own `<li>`. Sized by the menu-row properties: 36 px in a dropdown (44 px on touch), 48 px in a sheet.                       |
| `MenuControlRow`                        | `$lib/components/core/`           | A labelled control in the user menu (theme, language): the label on the row inset, the control's box on the panel inset.                                  |
| `Dropdown` and its triggers             | `$lib/components/ui/`             | `Dropdown` for a picker (modal on phones), `ModalFilterButton` for a filter opening a step or popover, `MultiSelectDropdown` for multi-select.            |
| `Divider`                               | `$lib/components/common/`         | Section separator. Don't roll your own border.                                                                                                            |
| `MaxBalanceButton`                      | `$lib/components/common/`         | "Max" button on amount inputs.                                                                                                                            |
| `ModalHero`, `ModalListItem`            | `$lib/components/common/`         | Modal headers and modal list items.                                                                                                                       |
| `QrButton`                              | `$lib/components/common/`         | "Scan QR" entry-point button.                                                                                                                             |
| `Copy`                                  | `$lib/components/ui/`             | Copy-to-clipboard icon button. Confirms on the button (check for 2 s plus a screen-reader status), no toast. `ReceiveCopy` wraps it.                      |
| `IconSwap`                              | `$lib/components/ui/`             | Animated swap between two icons on a state change (copy → check, eye → eye-off). Both stay mounted and cross-fade, so the swap can reverse mid-way.       |
| `Spinner`                               | `$lib/components/ui/`             | OISY visor Trace. Inherits text colour; CSS-length `size`, opt-in `inline` footprint. Trace keeps moving under reduced motion.                            |
| `LoaderSpinner`                         | `$lib/components/ui/`             | Wrapper around `Spinner` preserving `tiny` / `small` / `medium` and `inline`. No separate SVG or motion.                                                  |
| `ProgressSteps`                         | `$lib/components/ui/`             | Step list inside `InProgress`. Its active step uses a 15 px arc, not the visor, which is unreadable at that size: the one exception to `Spinner`.         |
| `press` / `press-icon`                  | `lib/styles/global.scss`          | Press for any text or card button (0.98) / icon-size control (0.96) that is not a `Button` / `ButtonIcon`. Same rule as theirs.                           |
| `row-feedback`                          | `lib/styles/global.scss`          | Full-width row: 10 % hover, 20 % at once while pressed, no shrink, ignoring presses on controls inside it.                                                |
| `pressed:` / `child-pressed:`           | `lib/styles/global.scss`          | Variants behind `row-feedback`: pressed on the element itself / on a wrapper whose direct child is the button (`LogoButton`).                             |
| `parent-pressed:`                       | `lib/styles/global.scss`          | Paints the direct child of a pressed `display: contents` button, so keyboard presses show too (`Transaction`).                                            |
| `hit-area`                              | `lib/styles/global.scss`          | 40 × 40 px tap target around a small control without changing its look; cap with `[--hit-area:...]` where neighbours are closer.                          |
| `hit-area-touch`                        | `lib/styles/global.scss`          | With `hit-area`: 44 px under `pointer: coarse`, for the icon triggers of menus and dropdowns. Add `relative` as for `hit-area`.                           |
| `decorative-motion`                     | `lib/styles/global.scss`          | On a decorative illustration's root: stops its animations under reduced motion. Not for progress indicators.                                              |
| `text-brand-hover`                      | `theme-variables.ts`              | Link hover and pressed colour (blue-800 light, blue-300 dark), built into `Button link`, `ButtonIcon`, `ExternalLink` and breadcrumbs.                    |
| `press-icon-in-group`                   | `lib/styles/global.scss`          | The icon-size press while the `group` ancestor is held, for a child that must shrink instead of its button.                                               |
| `HelpToggle`                            | `ui/HelpToggle.svelte`            | Info icon that shows and hides an explanation: tap area, press, `aria-expanded`, "Info" label.                                                            |
| `GoToButton`                            | `$lib/components/common/`         | "Go to X" success CTA (label + testId + onclick); base for `GoToTradeButton`/`GoToEarnButton`/`GoToBorrowButton`.                                         |
| `FirstTimeDestinationWarning`           | `$lib/components/send/`           | Warning that no send to an address is on record; gates its consumer's action when given an `onConfirm` callback.                                          |
| `WalletConnectScamWarning`              | `$lib/components/wallet-connect/` | The security-risk notice on a WalletConnect sign or send review whose request Verify flags as a scam (`acceptedContext`); that review offers Reject only. |
| `Loader*` and `loaders/`                | `$lib/components/loaders/`        | Loaders, suspense boundaries, skeletons.                                                                                                                  |
| `icons/`                                | `$lib/components/icons/`          | Project's icon set.                                                                                                                                       |
| `Collapsible`, `CollapsibleBottomSheet` | `$lib/components/ui/`             | Shared disclosure; `disabled` closes and blocks it. Forward `{ open, disabled }` into custom sheet triggers.                                              |
| `SwapProvider`                          | `$lib/components/swap/`           | `isForm` opts into Smart Swap activity/branding; review/default callers keep the static provider presentation.                                            |
| `BestRateBadge`                         | `$lib/components/ui/`             | Filled best-rate indicator. `styleClass` defaults to `mt-1`; centered form rows can opt into `mt-0` without changing other callers.                       |
| `SwapProviderAnimation`                 | `$lib/components/swap/`           | Right-aligned loop of the asked providers, then the `swapProviderPool`; reveals the real winner once; reduced motion built in.                            |
| `SwapFeeRow`                            | `$lib/components/swap/`           | A swap form's fee row: slides in, shows a "Total fee" skeleton during a foreground comparison, cross-fades to the form's fees.                            |

`Logo` defaults to lazy loading and its existing readiness opacity/fade, with transitions
suppressed on iOS. Set `animateReadiness={false}` when a parent owns the whole reveal;
`loading="eager"` forwards an eager policy to shared `Img`. `SwapProviderAnimation` uses
both for its sharp/soft logo copies without making quote publication wait for images.

The pre-hydration loader in `src/frontend/src/app.html` mirrors `Spinner` because it must
render before the Svelte bundle loads. `tests/app.spec.ts` checks their geometry and dash
pattern stay aligned. Keep its 30-second animation cap and the existing auth-initialization
removal boundary; pause its nested animation through `--spinner-play-state` before the
next-frame removal in the root layout. The layout fallback uses the same 48px footprint
and stays hidden while the pre-hydration loader exists, avoiding two overlapping traces.

### Cross-chain feature folders

These folders own substantial domain UI and tend to grow. **Look here before
adding a new top-level feature**:

`about`, `address`, `address-book`, `agreements`, `ai-assistant`, `auth`,
`balances`, `buy`, `carousel`, `contact`, `convert`, `core`, `currency`,
`dapps`, `earning`, `exchange`, `fee`, `get-token`, `guard`, `hero`,
`info`, `license-agreement`, `manage`, `navigation`, `networks`, `nfts`,
`onramper`, `open-crypto-pay`, `pay`, `privacy-policy`, `qr`, `receive`,
`referral`, `rewards`, `scanner`, `send`, `settings`, `share`, `signer`,
`sprinkles`, `stake`, `swap`, `terms-of-use`, `tokens`, `transactions`,
`vaults`, `vip`, `wallet-connect`, `welcome`.

Add new feature folders only if your concern doesn't fit any of the above.

### Stores / derived worth knowing

| Module                                                          | Where                              | Purpose                                |
| --------------------------------------------------------------- | ---------------------------------- | -------------------------------------- |
| `i18n.store`                                                    | `$lib/stores/i18n.store`           | Reactive translations.                 |
| `auth.store`, `auth.derived`                                    | `$lib/stores/`, `$lib/derived/`    | Auth identity + derived guards.        |
| `toasts.store`                                                  | `$lib/stores/toasts.store`         | All user-visible toasts.               |
| `busy.store`, `busy.derived`                                    | `$lib/stores/`, `$lib/derived/`    | Global busy indicator.                 |
| `modal.store`, `modal.derived`                                  | `$lib/stores/`, `$lib/derived/`    | Modal stack.                           |
| `currency.store`, `currency-exchange.store`, `currency.derived` | `$lib/stores/`, `$lib/derived/`    | Currency + FX state.                   |
| `balances.store`, `balances.derived`                            | `$lib/stores/`, `$lib/derived/`    | Balances per token.                    |
| `tokens.constants`, `*-tokens.derived`                          | `$lib/constants/`, `$lib/derived/` | Default + enabled tokens per chain.    |
| `network.derived`, `networks.derived`                           | `$lib/derived/`                    | Active network + chain predicates.     |
| `swap-amounts.store`, `swap-quote-activity.store`               | `$lib/stores/`                     | Accepted offers; pricing participants. |

### Constants worth knowing

| File                                              | Where             | Notes                                                       |
| ------------------------------------------------- | ----------------- | ----------------------------------------------------------- |
| `app.constants.ts`                                | `$lib/constants/` | App-wide identifiers, env helpers.                          |
| `tokens.constants.ts`, `swap.constants.ts`        | `$lib/constants/` | Default tokens; swap params.                                |
| `routes.constants.ts`                             | `$lib/constants/` | Route paths — never hard-code routes.                       |
| `test-ids.constants.ts`                           | `$lib/constants/` | All `data-tid` test IDs go here.                            |
| `transition.constants.ts`, `screens.constants.ts` | `$lib/constants/` | Motion timings (`MOTION_*`, `SLIDE_*`) / breakpoint tokens. |

### Common utils

| Util                                                                      | Where                             | Purpose                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format.utils`, `bigint.utils`, `array.utils`, `json.utils`               | `$lib/utils/`                     | Generic formatting helpers.                                                                                                                                                                                                                                                                                                                                                 |
| `i18n.utils` (incl. `replacePlaceholders`)                                | `$lib/utils/`                     | i18n string interpolation.                                                                                                                                                                                                                                                                                                                                                  |
| `string.utils` (`truncateUtf8Bytes`)                                      | `$lib/utils/`                     | Cuts text to a UTF-8 byte limit without splitting a character — for limits the backend measures in bytes, such as an active-transaction row's `error` and ref values (`ACTIVE_USER_TRANSACTION_*_MAX_BYTES`), which a character count overruns on non-ASCII text.                                                                                                           |
| `console.utils` (`consoleError`, `consoleWarn`)                           | `$lib/utils/`                     | The only allowed console wrapper.                                                                                                                                                                                                                                                                                                                                           |
| `error.utils`, `assert-amount.utils`, `validation` helpers                | `$lib/utils/`, `$lib/validation/` | Error & input validation.                                                                                                                                                                                                                                                                                                                                                   |
| `network.utils`, `networks.utils`                                         | `$lib/utils/`                     | Network ID predicates, `findEvmNetworkByChainId`.                                                                                                                                                                                                                                                                                                                           |
| `evm-source-tx.utils`, `evm-source-tx.services`                           | `$lib/utils/`, `$lib/services/`   | What the source chain says about an EVM transaction an active-transaction row tracks: receipt and confirmed nonce, with `replaced` only after two consecutive observations (`readEvmSourceTxOutcome`). Use it from any EVM swap poller rather than reading receipts by hand, with the one `confirmedNonceByChainId` the loader creates per tick.                            |
| `wallet-connect.utils` (`acceptedContext`)                                | `$lib/utils/`                     | Whether a WalletConnect proposal or request may be approved, from Verify's `isScam` verdict. Chain-agnostic: every review reads it from here.                                                                                                                                                                                                                               |
| `wallet-connect.utils` (`getWalletConnectChainName`)                      | `$lib/utils/`                     | The network name for a WalletConnect CAIP-2 chain (`eip155`, `solana`, `bip122`), or the chain itself when OISY has no network for it.                                                                                                                                                                                                                                      |
| `token-id.utils`                                                          | `$lib/utils/`                     | Backend `TokenId` ↔ app token (`toBackendTokenId`, `tokenIdKey`), and `findTokenByBackendTokenId` for the token a row's stored `TokenId` refers to.                                                                                                                                                                                                                         |
| `token.utils` (`buildIcTokenLabels`)                                      | `$lib/utils/`                     | One unambiguous display label per IC ledger: the display symbol, plus the shortened ledger id wherever another ledger shares that symbol or spells out a suffixed label as its symbol. Build it once over every token the user can pick from and pass it down — labels computed per filtered list can present an impostor as unique. Never hand-roll symbol disambiguation. |
| `swap-tokens-filter.utils`                                                | `$lib/utils/`                     | The swap provider identifier space. `nativeSwapTokenIdentifier` is the one way to key a contract-less token (native ETH / SOL / BTC) — the category sets have no network dimension, so a bare symbol collides across chains. Never hand-roll it.                                                                                                                            |
| `nav.utils`, `before-navigate.utils`, `before-unload.utils`               | `$lib/utils/`                     | Navigation hooks.                                                                                                                                                                                                                                                                                                                                                           |
| `transitions.utils` (`fade`, `fly`, `slide`, `scale`, `blur`, `backdrop`) | `$lib/utils/`                     | Svelte's transitions and their parameter types, with OISY's timings and reduced motion built in. Lint refuses `svelte/transition` elsewhere.                                                                                                                                                                                                                                |
| `clipboard.utils`, `device.utils`, `events.utils`                         | `$lib/utils/`                     | Browser plumbing.                                                                                                                                                                                                                                                                                                                                                           |
| `css.utils` (`toCssUrl`)                                                  | `$lib/utils/`                     | A URL as a CSS `url()` value, quoted and escaped. Use it for every URL that goes into an inline style or a `style:` directive; a URL we do not author must never be interpolated into one unquoted.                                                                                                                                                                         |
| `derived-memo.utils`, `certified-store.utils`                             | `$lib/utils/`                     | Store helpers.                                                                                                                                                                                                                                                                                                                                                              |

A swap provider without a token list answers `getSupportedDestinations` with a wildcard
instead of a set: `{}` in its own registry's category (Velora), or `{ <category>: 'any' }`
in another one (LI.FI's EVM → Solana). `computeReceiveSupportedTokens` in
`swap-tokens-filter.utils` counts either as a provider for that category without a list.

### Chain-specific utils worth knowing

| Util                                                                                             | Where                           | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sol-transfer-parties.utils`                                                                     | `$sol/utils/`                   | Transfer legs and the Sources / Destinations rules. One derivation for the WalletConnect review and the activity list; adapters onto both instruction mappers live here, do not re-derive parties per surface.                                                                                                                                                                                                                                                                                                                                                                                          |
| `sol-simulation.services` (`simulateSolTransaction`)                                             | `$sol/services/`                | What a Solana message would do to the user's accounts, from a simulation: deltas, control changes, the accounts it creates and closes. Best effort by default, as the WalletConnect review needs. A flow that signs exactly the bytes it simulates passes `replaceRecentBlockhash: false` (an expired blockhash fails the run) and `consistentSnapshot: true` (pre-state and run read at one slot, so nothing else reaching the accounts is folded in).                                                                                                                                                 |
| `sol-source-tx.utils`, `sol-source-tx.services`                                                  | `$sol/utils/`, `$sol/services/` | What the network says about a Solana transaction an active-transaction row tracks: its signature status (a verdict only once `confirmed`), then, without one, whether its blockhash can still land, read at or past a slot where it was valid (`minContextSlot`, since a node running behind calls a blockhash it has not seen invalid) and confirmed by a status read at or past it, with `expired` only after two consecutive observations (`readSolSourceTxOutcome`). The Solana counterpart of `evm-source-tx`: use it from any Solana swap poller rather than reading statuses by hand.            |
| `sol-rent.utils`                                                                                 | `$sol/utils/`                   | `rentExemptMinimumFor`: an account's rent-exempt reserve for any size, scaled from the chain's reserve for a token account (`getSolCreateAccountFee`). Solana lowers rent in steps, so never hard-code a lamport price.                                                                                                                                                                                                                                                                                                                                                                                 |
| `eth-error.utils` (`isDefinitiveTransactionRefusal`)                                             | `$eth/utils/`                   | Whether a broadcast failed because the node refused the transaction outright (insufficient funds, an invalid transaction), as opposed to an answer that can hide a transaction taken all the same (`already known`, `nonce too low`) or a transport failure. Decide from it before deleting anything recorded for a transaction.                                                                                                                                                                                                                                                                        |
| `eth-error.utils` (`isBroadcastRetriable`)                                                       | `$eth/utils/`                   | Whether broadcasting the same signed transaction again could still send it: neither refused outright nor answered as already in (`already known`, `nonce too low`). Identical bytes cannot be sent twice, so use it to retry a broadcast rather than signing anew.                                                                                                                                                                                                                                                                                                                                      |
| `sol-error.utils` (`isSolSendRefusal`, `isSolNodeUnhealthy`, `isSolTransactionAlreadyProcessed`) | `$sol/utils/`                   | Whether the node refused to send a Solana transaction before forwarding anything (a failed preflight simulation, a node too far behind the cluster, a transaction it cannot read), whether it was too far behind (send the same bytes again: another node may take them), or whether it found the transaction already processed, which is its landing. `isSolSendRefusal` does not count a `SwapBroadcastOutcomeUnknownError`, a refusal that came after an attempt that may have been relayed: use it to decide whether a send's tracking row can go, as `isDefinitiveTransactionRefusal` does on EVM. |
| `fee.services` (`getL1DataFee`)                                                                  | `$eth/services/`                | The OP-stack L1 data fee upper bound, `undefined` off OP-stack chains. Pass `unsignedTxSize` for a transaction that carries calldata: the default bounds a transfer.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `swap.services` (`swap`, `beforeBroadcast`)                                                      | `$eth/services/`                | Signs and broadcasts a swap transaction, sending the same bytes again while the outcome is unknown; `beforeBroadcast` runs between the two with the signed hash and nonce, for a flow that must record the transaction before it can move funds.                                                                                                                                                                                                                                                                                                                                                        |
| `swap.services` (`waitForSwapAllowance`)                                                         | `$lib/services/`                | The allowance poll after an approval, before a swap is sent: use it rather than another retry shape.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### REST + workers

| Module                                                                                       | Where           | Purpose                   |
| -------------------------------------------------------------------------------------------- | --------------- | ------------------------- |
| `coingecko.rest`                                                                             | `$lib/rest/`    | Spot / token prices.      |
| `blockchain.rest`, `blockstream.rest`                                                        | `$lib/rest/`    | BTC explorer endpoints.   |
| `kongswap.rest`, `icpswap.rest`, `near-intents.rest`, `harvest.rest`, `open-crypto-pay.rest` | `$lib/rest/`    | Swap providers + harvest. |
| `lifi.rest`                                                                                  | `$lib/rest/`    | LI.FI quotes (SDK-based). |
| `exchange.worker`, `auth.worker`                                                             | `$lib/workers/` | Background polling.       |

### Per-provider swap quote cache

Every swap provider is re-quoted every `SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS`. A provider
whose rate limit cannot take that cadence throttles inside its own quote service; the fan-out
stays unchanged. The precedent is `fetchLifiSwapQuote` (`$lib/services/lifi-swap.services.ts`):

- One module-level entry `{ key, result, settledAt? }`. `key` is the serialised request, and
  `result` is the promise rather than its value, so a request still in flight is shared, however
  long it takes.
- The interval runs from `settledAt`, not from the request: the same key gets the cached answer,
  a failure or "no route" included, until the interval has passed since it settled. Any other
  key fetches immediately and replaces the entry.
- Give the request a timeout (`AbortSignal.timeout`, as `xrpl.rest` does): a request that never
  settles would otherwise pin the entry, and hold back every other provider's offer, since the
  swap form shows its offers once all providers have answered.
- Serialise the key from your own request object, and hand an SDK that writes into its argument
  a copy.
- Export a reset (`resetLifiQuoteCache`) as the test seam, as `clearNearIntentsTokensCache` does.
- Only display quotes go through the cache. A quote that is executed is requested again from the
  REST layer directly.

## When to extract a new shared block

Extract when **all** are true:

- The same shape (markup or function signature) exists in ≥ 2 places.
- The variation is small enough to express as props.
- The new abstraction has a name a non-author would recognise.

Don't extract speculatively for a single caller. The added indirection
costs more than the duplication.

## When to introduce a new top-level concept

Almost never. The taxonomy is closed. If you genuinely think a new bucket
is needed (e.g. a new feature folder under `$lib/components/`), surface it
in the PR description and ask the human owner before doing it.

## Landing artwork

`Img` defaults to lazy loading; above-the-fold artwork can explicitly opt into `loading="eager"`. Supply intrinsic dimensions to reserve layout space. The landing uses static asset URLs and a deliberately slower, one-time 300ms entrance (12px upward movement, 4px blur, opacity), staggered by 100ms per section. It starts on mount without waiting for artwork; keyboard focus reveals controls immediately. Feature-card wrappers animate only translation to preserve descendant backdrop blur. Reduced motion uses `MOTION_REDUCED_FADE_DURATION` (100ms) without stagger; feature cards stay still. Reveal focused controls with visual overrides, preserving the animation timeline so it cannot replay on blur.

## Overlay keyboard behavior

`overlayFocus` in `$lib/utils/overlay.utils.ts` is the shared Svelte action for
blocking popovers, modal dialogs and dismissible bottom sheets. It enters focus,
contains Tab and programmatic focus, handles Escape only on the topmost overlay,
and preserves child autofocus. It restores a connected opener through the overlay return chain, including when a popover closes while its child modal opens. Confirmation popups and the global busy overlay participate in the same stack. Busy uses `priority: 'high'` to keep keyboard focus above later-mounted dialogs, matching its visual layer. Overlays at the same priority keep their mounting order; dismissing Busy activates the most recent remaining dialog and preserves the original opener for final focus restoration.
Regions drawn above overlays that must stay reachable carry `data-overlay-reachable`
(the toasts): focus may enter them, and Tab crosses from the overlay's last control into
them and back. Escape is ignored while an input method is composing.
The panel that carries the action has `tabindex="-1"` and `outline-none`, so a
click on its empty space keeps focus in the overlay without a ring around the panel.
Use dialog semantics for mixed controls; do not assign `role="menu"` without
implementing menu-item navigation.

`Toggle` accepts `showLabel` for a full-row labelled switch. Use this instead of
putting a switch inside a clickable row. Selection buttons expose `aria-pressed`
through `Button.pressed` or the selectable list primitives.

Token rows and navigation entries use an inset keyboard focus outline so rounded and scrolling list containers cannot clip it. Token-group headers pass their expanded state through `TokenCard` and `LogoButton` to the native button.

## Consistent app menu surfaces

Popover panels share `--overlay-box-shadow` with modals: a translucent edge and layered depth in light mode, a subtle white edge in dark mode. Do not add solid panel borders; retain real dividers and keyboard focus outlines. Bottom sheets retain their separate `--bottom-sheet-box-shadow`. Popovers restore a system-color border in forced-colors mode, where shadows are suppressed.

Use the opt-in `menu-surface` class for app menus built from existing list, logo and navigation buttons. Shared styles in `global/menus.scss` define 48px minimum rows (24px line-height plus 12px vertical padding, without button borders or inter-row gaps), 16px labels, 12px vertical / 8px horizontal padding, 8px row corners and inset keyboard focus. Use `menu-heading`, `menu-row-label`, and `menu-divider` within that surface. Network logos remain brand assets; action icons use the existing Lucide set. Theme changes temporarily suppress transitions through `data-theme-changing`, then restore them after painting the new theme.

Row density comes from `--menu-row-min-height`, `--menu-row-padding-block` and `--menu-row-padding-inline` (`global/variables.scss`, 48 / 12 / 8 px), so a denser host changes the numbers without restating the row selectors.

### Dropdown triggers

Every dropdown trigger except the native `Select` uses `.dropdown-button` (`DropdownButton`, `ModalFilterButton`, `MultiSelectDropdown`). The shared rule in `global/button.scss` owns its whole look: 40 px (44 px under `pointer: coarse`), 16 px medium text, the border colour, the open state (`opened`, announced with `aria-expanded`), the pressed fill and the chevron, `IconExpandMore` in `.dropdown-chevron`, which turns over while open. Set only the `border` class in markup: a `border-*` colour utility would out-rank the open-state border, because `button.scss` is in the base layer.

### Dropdown panels

Pickers, filters and short option menus open a `Popover` (or `ResponsivePopover`) with `dropdown`, which `Dropdown` and `MultiSelectDropdown` set themselves: an 8 px inset, 36 px rows with a 12 px inset in line with the search text, a 40 px `InputSearch` (through the `--input-padding-*` and `--input-block-gap` hooks in `InputBase`), an inset focus ring and no row dividers. Under `pointer: coarse` rows and search grow to 44 px. Rows keep their own hover, pressed and focus fill (`row-feedback`: the hover fades in over 150 ms, the pressed fill shows at once), and menu rows keep their text colour on hover. Build the content from `menu-surface` rows, `ListItemButton` or `ListItemCheckbox`; do not override row sizes per component. Icon triggers of these menus keep their look and add `relative hit-area hit-area-touch` for a 44 px tap area on touch screens. The user menu is a dropdown too: its labelled controls use `MenuControlRow`, and its buttons and dividers sit on the 8 px panel inset. A picker opened from a row renders inline but keeps its own rows: a modal (the phone form) gets full-size rows back. On phones, `ResponsivePopover` and `Dropdown` with `asModalOnMobile` switch to a sheet or modal at their `Responsive` breakpoints; a bare `Popover` stays a popover, with 44 px rows on touch.
