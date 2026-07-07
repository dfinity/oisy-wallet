# Reusability — Catalog & Rules

> **Before you create, search.** This page is the answer to "is there
> already something for that?". Keep it up to date as part of the
> [meta-update rule](../governance.md#meta-update-rule): every PR that adds
> a reusable building block adds a row here.

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

### Common building blocks

| Component                            | Where                      | Use it for                                     |
| ------------------------------------ | -------------------------- | ---------------------------------------------- |
| `List`, `ListItem`, `ListItemButton` | `$lib/components/common/`  | Vertical lists of items.                       |
| `Divider`                            | `$lib/components/common/`  | Section separator. Don't roll your own border. |
| `MaxBalanceButton`                   | `$lib/components/common/`  | "Max" button on amount inputs.                 |
| `ModalHero`, `ModalListItem`         | `$lib/components/common/`  | Modal headers and modal list items.            |
| `QrButton`                           | `$lib/components/common/`  | "Scan QR" entry-point button.                  |
| `Loader*` and `loaders/`             | `$lib/components/loaders/` | Loaders, suspense boundaries, skeletons.       |
| `icons/`                             | `$lib/components/icons/`   | Project's icon set.                            |

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

| Module                                                          | Where                              | Purpose                             |
| --------------------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| `i18n.store`                                                    | `$lib/stores/i18n.store`           | Reactive translations.              |
| `auth.store`, `auth.derived`                                    | `$lib/stores/`, `$lib/derived/`    | Auth identity + derived guards.     |
| `toasts.store`                                                  | `$lib/stores/toasts.store`         | All user-visible toasts.            |
| `busy.store`, `busy.derived`                                    | `$lib/stores/`, `$lib/derived/`    | Global busy indicator.              |
| `modal.store`, `modal.derived`                                  | `$lib/stores/`, `$lib/derived/`    | Modal stack.                        |
| `currency.store`, `currency-exchange.store`, `currency.derived` | `$lib/stores/`, `$lib/derived/`    | Currency + FX state.                |
| `balances.store`, `balances.derived`                            | `$lib/stores/`, `$lib/derived/`    | Balances per token.                 |
| `tokens.constants`, `*-tokens.derived`                          | `$lib/constants/`, `$lib/derived/` | Default + enabled tokens per chain. |
| `network.derived`, `networks.derived`                           | `$lib/derived/`                    | Active network + chain predicates.  |

### Constants worth knowing

| File                                              | Where             | Notes                                 |
| ------------------------------------------------- | ----------------- | ------------------------------------- |
| `app.constants.ts`                                | `$lib/constants/` | App-wide identifiers, env helpers.    |
| `tokens.constants.ts`, `swap.constants.ts`        | `$lib/constants/` | Default tokens; swap params.          |
| `routes.constants.ts`                             | `$lib/constants/` | Route paths — never hard-code routes. |
| `test-ids.constants.ts`                           | `$lib/constants/` | All `data-tid` test IDs go here.      |
| `transition.constants.ts`, `screens.constants.ts` | `$lib/constants/` | Animation / breakpoint tokens.        |

### Common utils

| Util                                                        | Where                             | Purpose                           |
| ----------------------------------------------------------- | --------------------------------- | --------------------------------- |
| `format.utils`, `bigint.utils`, `array.utils`, `json.utils` | `$lib/utils/`                     | Generic formatting helpers.       |
| `i18n.utils` (incl. `replacePlaceholders`)                  | `$lib/utils/`                     | i18n string interpolation.        |
| `console.utils` (`consoleError`, `consoleWarn`)             | `$lib/utils/`                     | The only allowed console wrapper. |
| `error.utils`, `assert-amount.utils`, `validation` helpers  | `$lib/utils/`, `$lib/validation/` | Error & input validation.         |
| `network.utils`, `networks.utils`                           | `$lib/utils/`                     | Network ID predicates.            |
| `nav.utils`, `before-navigate.utils`, `before-unload.utils` | `$lib/utils/`                     | Navigation hooks.                 |
| `clipboard.utils`, `device.utils`, `events.utils`           | `$lib/utils/`                     | Browser plumbing.                 |
| `derived-memo.utils`, `certified-store.utils`               | `$lib/utils/`                     | Store helpers.                    |

### REST + workers

| Module                                                                                       | Where           | Purpose                   |
| -------------------------------------------------------------------------------------------- | --------------- | ------------------------- |
| `coingecko.rest`                                                                             | `$lib/rest/`    | Spot / token prices.      |
| `blockchain.rest`, `blockstream.rest`                                                        | `$lib/rest/`    | BTC explorer endpoints.   |
| `kongswap.rest`, `icpswap.rest`, `near-intents.rest`, `harvest.rest`, `open-crypto-pay.rest` | `$lib/rest/`    | Swap providers + harvest. |
| `exchange.worker`, `auth.worker`                                                             | `$lib/workers/` | Background polling.       |

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
