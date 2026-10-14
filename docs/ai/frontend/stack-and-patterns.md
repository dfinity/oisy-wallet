# Stack & Patterns

Idiomatic patterns for the **SvelteKit 2 + Svelte 5 + TypeScript +
Tailwind v4** stack. If a pattern here disagrees with code in `src/`, the
code wins (truth hierarchy in [governance.md](../governance.md)). Update
this page in the same PR — that's the
[meta-update rule](../governance.md#meta-update-rule).

## Chain transaction loads — redundant external calls

### Native ETH (Etherscan / Infura)

Incremental `startBlock` comes from backend `newestBlockIndex + 1` when user-transaction persistence is enabled, otherwise from the maximum `blockNumber` already in `ethTransactionsStore` so refresh does not always reset to `startBlock: 0`. When `startBlock > 0`, the client compares Infura’s latest block to that cursor; if the chain tip is still before the next block to fetch, the Etherscan history request is skipped.

### Solana (RPC signatures and details)

Solana history is loaded from the chain only, per network: `getSolSignatures` pages through one merged list of the signatures of every source (the wallet and the associated token account of each enabled token), and `resolveSolSignatures` fetches and derives each signature once, however many sources returned it; the sources that returned a signature decide which tokens its record belongs to. `SolWalletScheduler` runs one worker per network; each tick, its head check asks every source for its newest page and resolves only the signatures newer than the newest one it has already resolved, so when no source has anything newer a tick costs one `getSignaturesForAddress` call per source and no `getTransaction`. Older history comes from the pagers in `sol-history-pagers.services.ts`: one per network for the Activity list, one per token for the token's own page, each keeping its own cursor. The backend user-transaction cache is written per token but never read for Solana, because its copy cannot carry what a row is shown from (see "Solana history" in `docs/ai/PRODUCT.md`). `fetchTransactionDetailForSignature` caches finalized details per network, so a signature already derived is not fetched again once finalized.

## Token identity — key by `TokenId`

Whenever a `TokenId` is in scope, identify, compare and key tokens by it.
Do not invent a second key next to one that already exists.

- `TokenId` is a `Symbol`, so it is unique per token
  ([`$lib/validation/token.validation.ts`](../../../src/frontend/src/lib/validation/token.validation.ts)),
  and the token stores deliberately reuse the existing Symbol when re-setting
  an entry with the same identifier
  ([`$lib/stores/custom-tokens.store.ts`](../../../src/frontend/src/lib/stores/custom-tokens.store.ts),
  [`$icp/stores/certified-icrc.store.ts`](../../../src/frontend/src/icp/stores/certified-icrc.store.ts)).
  It therefore survives a store reload, and is re-created only on a full reset
  — `resetAll()` after a failed certified update, or the page reload on
  sign-out.
- **Compare the object, never its description.** `TokenId.description` _is_ the
  ticker — it comes from `parseTokenId(symbol)`
  ([`$eth/utils/erc20.utils.ts`](../../../src/frontend/src/eth/utils/erc20.utils.ts),
  [`$icp/utils/icrc.utils.ts`](../../../src/frontend/src/icp/utils/icrc.utils.ts)).
  Two distinct contracts on the same network can share a ticker, so a ticker is
  not unique and is not a key.
- No `TokenId` reachable? Key on the stable asset identifier — contract address
  / ledger canister ID / canister ID, e.g. `getTokenIdentifier` from
  [`$lib/utils/identifier.utils.ts`](../../../src/frontend/src/lib/utils/identifier.utils.ts)
  — combined with the network. Never the ticker.

## Svelte — runes for new code

The repo is **Svelte 5**. For new code, default to runes (`$state`,
`$derived`, `$effect`, `$props`, `$bindable`).

A large existing Svelte-store graph lives in `$lib/derived/`,
`$lib/stores/`, and per-chain `*/derived/` and `*/stores/` folders. It
predates the runes migration. **Read from it freely; do not migrate it
in unrelated PRs.** Author new reactive state as runes; only fall back to
`writable` / `readable` / `derived` from `svelte/store` when extending an
existing store graph in place (see [Svelte stores — when to reuse them](#svelte-stores--when-to-reuse-them)
below).

Inside a component, prefer the rune syntax for new code:

| Use (new code)                                                                                     | Don't use (Svelte 4 in new code)              |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Separate `interface Props { … }` + `let { … }: Props = $props()` (see [Props shape](#props-shape)) | `export let foo`                              |
| `let count = $state(0)`                                                                            | plain `let` for component-local reactive vars |
| `let total = $derived(price * qty)`                                                                | `$: total = price * qty`                      |
| `$effect(() => { /* I/O */ })`                                                                     | side-effect via `$:`                          |
| `<button onclick={fn}>`                                                                            | `on:click`                                    |
| `{#snippet}` + `{@render}`                                                                         | named `<slot>` for new code                   |
| `let { value = $bindable() }: Props = $props()`                                                    | top-level `bind:value` in callee              |

### Props shape

Always declare props as a **named `interface Props`** above the
destructuring. This keeps the shape easy to read, easy to extend, and
easy to reuse in tests / sibling components:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { OptionAmount } from '$lib/types/amount';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount?: number;
		onConvert: () => void;
		cancel: Snippet;
	}

	let { sendAmount, receiveAmount, onConvert, cancel }: Props = $props();
</script>
```

- One `interface Props` per component, declared at the top of the
  `<script>` after imports.
- Required props first, optional (`?:`) and defaulted ones after.
- Two-way bindings use `$bindable()` on the destructure side; the
  interface still declares the field normally.
- Don't inline the type literal into `$props()` for new code — it makes
  the destructuring line unreadable as soon as you have more than two
  or three props.

**Don't rewrite legacy components in unrelated PRs.** Atomicity first.
Migration PRs are welcome but must be `refactor(frontend): migrate <X> to
runes` and contain no behaviour change.

### Effect hygiene

- Never read state inside an `$effect` and write it back without a guard —
  it loops. Use `untrack(...)` or restructure to `$derived`.
- Prefer `$derived` over `$effect`. An `$effect` is for I/O (DOM, network,
  storage). Computation belongs in `$derived` / `$derived.by`.
- The repo ships a reactivity-debug Vite plugin that counts every
  `$effect` / `$derived.by` / store-`derived` recomputation in non-`ic`
  environments. See [HACKING.md "Debugging Reactivity"](../../../HACKING.md#debugging-reactivity).
  When you suspect a runaway, use `__oisyReactivityDebug.printTop()` in
  the browser console.

### Svelte stores — when to reuse them

The following cross-route values are already expressed as Svelte stores.
**Consume the existing store; do not re-implement these as runes:**

- Auth / identity state (`$lib/stores/auth.store`,
  `$lib/derived/auth.derived`).
- Translations (`$lib/stores/i18n.store`).
- Toasts, modals, busy-state (`$lib/stores/toasts.store`,
  `modal.store`, `busy.store`).
- Per-chain enabled tokens / networks (`$<chain>/derived/...`).

When extending an existing store graph (e.g. a new `derived([a, b], …)`
composed from those stores), match the surrounding shape. For brand-new
cross-route state with no neighbour to follow, prefer a rune-based module
(`*.svelte.ts`).

## TypeScript

- **No `any`.** Use `unknown` and narrow.
- **No `as unknown as X`** to launder types. Either fix the type, or write
  a narrowing function.
- **No non-null assertion (`!`)** on values that can actually be null —
  use `isNullish` / `nonNullish` from `@dfinity/utils`, optional chaining,
  or an explicit guard with an early return / error.
- **`Option<T>` wrapper** — the local rule `local-rules/use-option-type-wrapper`
  enforces using the project's `Option<T>` (or undefined-discriminated
  shape) over bare `T | null | undefined`. Search the surrounding code for
  the shape and follow it.
- **Discriminated unions** for typed `Result<T>` flows; prefer the existing
  `@dfinity/zod-schemas` `Result` shape where it's already used.
- **Type imports**: prefer `import type { … }` for types-only;
  `prettier-plugin-organize-imports` will sort them.
- **Schemas first.** When data crosses a boundary (network, storage,
  worker), validate with the matching `zod` schema from `$lib/schema/`,
  `$<chain>/schema/`, or `$env/schema/`.
- **`BigInt` zero**: forbidden literal `0n` (eslint). Use the project's
  `ZERO` constant — `grep -r "export const ZERO" src/frontend/src/lib/constants/`
  to find it.

## Service / data flow

```
Component (.svelte)
  ↳ <chain or feature> services (.services.ts)        orchestration, toasts, i18n
       ↳ $lib/api/*            wrappers around $declarations/backend  (IC actor)
       ↳ $lib/canisters/*      typed canister calls
       ↳ $lib/rest/*           CoinGecko / Blockstream / kongswap / icpswap / …
       ↳ $lib/providers/*      long-lived providers (auth client, swap providers)
       ↳ $lib/workers/*        web workers (auth, exchange)
```

- Components do **not** call `fetch` directly. Always go through the
  matching service / rest / api module.
- A `*.services.ts` function should:
  - Accept a typed input.
  - Toast on user-visible errors via `$lib/stores/toasts.store` (or the
    `notification.services` wrappers).
  - Pull strings from `$lib/stores/i18n.store` (`get(i18n).…` outside
    `.svelte`).
  - Never throw to the caller for expected user errors — return an
    informative result and toast.
- Worker-bound logic lives in `$lib/workers/` and is scheduled via
  `$lib/schedulers/`.

Example (compressed from
[`$lib/services/exchange.services.ts`](../../../src/frontend/src/lib/services/exchange.services.ts)):

```ts
import { Currency } from '$lib/enums/currency';
import { simplePrice } from '$lib/rest/coingecko.rest';

export const exchangeRateUsdToCurrency = async (
	currency: Currency
): Promise<{ rate: number; fx24hChangeMultiplier: number }> => {
	if (currency === Currency.USD) {
		return { rate: 1, fx24hChangeMultiplier: 1 };
	}
	// fetch via simplePrice(...) and derive fx multipliers
};
```

## Stores, derived, runes — when to use which

| Need                                           | Use                                                                                                                                                | Where it lives                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Component-local mutable value                  | `$state`                                                                                                                                           | Inside the component                                                   |
| Component-local computed value                 | `$derived` / `$derived.by`                                                                                                                         | Inside the component                                                   |
| Side effect (DOM, network, subscription)       | `$effect` (or `onMount` for true mount work)                                                                                                       | Inside the component                                                   |
| Value shared by 2+ components in the same page | Pass via props / snippets                                                                                                                          | —                                                                      |
| Value shared across routes                     | `*.svelte.ts` rune-state module by default; [reuse the existing store graph](#svelte-stores--when-to-reuse-them) when one already covers the value | `$lib/stores/`, `<chain>/stores/`, `$lib/derived/`, `<chain>/derived/` |
| Cached server data                             | The matching `*.services.ts` owns the cache                                                                                                        | —                                                                      |

Avoid duplicating server state into a local store — fetch via the service
layer and let the service own caching.

## Tailwind v4 + design tokens

- **Use the project's tokens / utilities.** Look at neighbours before
  inventing classes. No raw hex (`bg-[#0f0]`), no inline `style="color:…"`.
- **Class order** is auto-sorted by `prettier-plugin-tailwindcss`. Don't
  bikeshed it.
- **Variants & responsive:** prefer Tailwind variants (`md:`, `dark:`,
  `data-[active=true]:`) over JS branches.
- **Hover in SCSS:** write `@include interaction.hover { … }`
  (`lib/styles/mixins/_interaction.scss`), not a bare `&:hover`, so a tap
  on a touch screen doesn't leave the hover colour on. Tailwind's `hover:`
  variant already does this.
- The route-level prerendered backgrounds described in
  [HACKING.md "Routes Styles"](../../../HACKING.md#routes-styles) are the
  preferred way to set route-specific colours.

## Press feedback

Everything that can be pressed shows it while held. Pick the treatment by
what the element is, and use the shared rule, never hand-written
`active:scale-*` or `active:bg-*`:

| Element                                                 | Use                                                          | Effect                                            |
| ------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| `Button` (any `colorStyle`, unless `link`)              | nothing, it is built in                                      | shrinks to 0.98                                   |
| `ButtonIcon`                                            | nothing, it is built in                                      | shrinks to 0.96                                   |
| Any other text button, or a whole-card button           | `press`                                                      | shrinks to 0.98                                   |
| Any other icon-size control (close, help, toggle icons) | `press-icon` (+ `hit-area` if under 40 px)                   | shrinks to 0.96                                   |
| A full-width row (list item, transaction, contact)      | `row-feedback`                                               | 10 % blue on hover, 20 % while pressed, no shrink |
| A wrapper that paints the row around its `<button>`     | `hover:bg-brand-subtle-10 child-pressed:bg-brand-subtle-20`  | as `row-feedback`, on the wrapper                 |
| Something the press would only distract on              | `static` prop (`Button`, `ButtonIcon`), or no utility at all | nothing                                           |

`press` and `press-icon` are utilities in `lib/styles/global.scss`, built
on the same `press` mixin and the same two scales (`$press-scale-text`,
`$press-scale-icon` in `lib/styles/mixins/_button.scss`) the shared buttons
use, so changing a value there changes it everywhere. They skip disabled,
`loading` and `no-press` elements, and reduced motion never scales.

`row-feedback`, also in `global.scss`, is a colour change, not a shrink: it
is not built on the press mixin, and `no-press` does not turn it off. A row
button can therefore opt out of the shrink with `static` and keep the fill,
as `ListItemButton` does.

Wide things shrink less (0.98) than small ones (0.96) because the same
scale takes far more pixels off a full-width element; full-width rows don't
shrink at all.

The shared buttons (`button.scss`) and `row-feedback` rows change colour in
150 ms ease-out; use the same for new feedback. A subtle OISY-blue fill
presses one step past its hover (`brand-subtle-10` → `-20`, or `-20` → `-30`),
and a state that stays on, such as an open popover's button, may go a step
further. Success, error and other palettes keep their own steps.

### Small controls: `hit-area`

Anything you can tap that is under 40 × 40 px gets `hit-area`: an `::after`
of at least 40 × 40 px around it, so it is easy to hit without looking
bigger. Two tap areas must never overlap; where a neighbour sits closer,
cap it: `[--hit-area:2rem]`, or one axis with `[--hit-area-x:...]` /
`[--hit-area-y:...]` (`[--hit-area-x:0px]` grows it only up and down). It
does not set `position`: add `relative` unless the control is already
`absolute` or `fixed`.

### Pitfalls

- **`:active` reaches every ancestor** of the pressed element. A row with a
  copy icon or a toggle inside it would light up when the icon is pressed;
  `row-feedback`, `pressed:` and `child-pressed:` exclude that, plain
  `active:` does not.
- **`display: contents` buttons paint nothing.** Put `row-feedback` on the
  element inside (as `Transaction` and `TipHistory` do).
- **`scale` makes the element the containing block** of its absolutely
  positioned children. If a child is positioned against something further
  out (the mobile bar's Finance circle), scale the child, not the element
  (`group-active:scale-[0.96]`).
- **A `transition-*` utility replaces the base transition,** which carries
  `scale`. Buttons already have `scale` in theirs; anything else, or a
  button with its own transition, lists it: `transition-[color,scale]`.
- **Custom variants must not start with `has-`** (Tailwind 4 reads `has-*`
  as its built-in compound variant), and **must not nest `:has()` inside
  `:has()`** (invalid CSS: the browser drops the whole rule). Check a new
  variant actually lands in the stylesheet.
- **Hover in SCSS** goes through `@include interaction.hover { … }` (see
  above); in Tailwind, `hover:` is already guarded.
- **iOS Safari applies `:active` on a tap only when the page has a touch
  listener.** The root layout (`routes/+layout.svelte`) registers a passive
  no-op `touchstart` on the document for that; it is not dead code.
- **Nested buttons:** a control inside a clickable row stops propagation
  (`e.stopPropagation()`), or its click also runs the row's.

## Icons

The codebase uses several icon sources (Lucide, Tabler, Iconly, custom
SVGs under `lib/icons/` and `<chain>/assets/`). Match what the surrounding
component uses. Never re-implement an icon that already exists.

- Decorative icons → `aria-hidden="true"`.
- Icon-only buttons → must have `aria-label` (or visible text via
  `sr-only`).

## Auth, security, HTML safety

- Auth flows go through `@icp-sdk/auth` and the helpers in
  `$lib/services/auth.services` and `$lib/providers/auth-client.providers`.
- Any HTML coming from backend / user input must be sanitized before
  `{@html …}`.
- Text authored by a third party — e.g. a consent message built from data a
  relying party supplies — goes through `sanitizeUntrusted` (`untrusted` prop
  on `Html` / `Markdown`), which keeps only the markup Markdown can produce.
  Never render it inside a `<form>` that drives a sensitive action.
- External links: `target="_blank"` requires `rel="noopener noreferrer"`.
- Threshold-signature operations are routed through the chain-fusion
  signer canister — not implemented here. See
  [SIGNER_DOMAINS.md](../../../SIGNER_DOMAINS.md) for the architecture.

## Performance

- Wrap expensive work in `$derived.by` (cached) or in a `derived(...)`
  Svelte store, not in the render path.
- `{#each items as item (item.id)}` with a stable key.
- Lazy-load heavy modules with dynamic `import()` inside an `$effect` /
  event handler when they aren't needed on first paint (see e.g. the
  route-level CSS pattern in HACKING.md).
- The reactivity-debug plugin is your friend — use it before guessing.

## Anti-patterns (do not do these)

- `export let foo` in new code.
- Inline type literal in `$props()` (`let { … }: { … } = $props()`).
  Use a named `interface Props` instead — see
  [Props shape](#props-shape).
- Reactive `$:` statements in new code.
- Reaching into `document.querySelector` to mutate Svelte-managed DOM.
- Catching an error and silently swallowing it; always toast or propagate.
- Hard-coding strings, hex colours, magic numbers in components.
- "Just one more `any`" — there is no "just one more".
- Adding a wrapper component that only re-exports another component.
- `target="_blank"` without `rel="noopener noreferrer"`.
- `{@html …}` without sanitisation.
- Keying or matching a token by its ticker (including `TokenId.description`)
  when the `TokenId` object itself is in scope.
- `console.log` left in committed code (and `console.error` / `.warn` are
  ESLint errors — use `consoleError` / `consoleWarn`).
