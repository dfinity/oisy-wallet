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

`getSolTransactions` may receive `exitIfFirstSignatureMatches`. After `fetchSignatures`, if the newest RPC signature matches the newest backend-stored signature (non-pagination loads only), per-signature transaction detail fetching is skipped.

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

## External providers — kill-switch flags

**Every external provider must be behind a boolean kill-switch flag.** Any
feature that talks to a third-party / external data source (price oracle, swap
DEX, RPC, indexer, on-ramp, …) must be able to drop that provider **in code**,
without a config migration, candid change, or redeploy dance — so that in an
emergency (provider outage, abuse, pricing incident, a vendor sunsetting) we can
flip one `const` to `false` in a PR and ship.

This is already the convention; new providers must follow it. Existing examples:

- `ICPSWAP_PROVIDER_ENABLED`, `KONGSWAP_PROVIDER_ENABLED`,
  `COINGECKO_PROVIDER_ENABLED` in
  [`$env/rest/*.env.ts`](../../../src/frontend/src/env/rest/) — price providers.
- `NEAR_INTENTS_SWAP_ENABLED`, `ONESEC_SWAP_ENABLED` — swap providers.
- `swapProviders` ([`$lib/providers/swap.providers.ts`](../../../src/frontend/src/lib/providers/swap.providers.ts))
  carries an `isEnabled` per provider, wired from those flags.

### Rules

1. **Define the flag in `$env`, next to the provider's other env.** Put it in
   the provider's `$env/rest/<provider>.env.ts` (or the relevant `$env/*.env.ts`)
   as a plain hardcoded `const` — **not** an env-parsed value, **not** runtime
   config. It is flipped by editing code in a PR.
2. **Name it like its neighbours.** `<PROVIDER>_PROVIDER_ENABLED` for a
   data/price provider; match the existing `<PROVIDER>_<FEATURE>_ENABLED` shape
   where a feature already uses it (e.g. `*_SWAP_ENABLED`). Default to `true`;
   `false` only means "blocked right now". Add a `//` comment with the _why_ when
   it is off (see `kongswap.env.ts`).
3. **Gate every path that reaches the provider.** All call sites — service, rest,
   worker, and any component branch that renders that provider — must check the
   flag. A disabled provider issues **no** network request and renders **no**
   provider-specific UI (see the `SwapProvider.svelte` `{#if … && *_ENABLED}`
   branches).
4. **Fail soft.** When disabled, short-circuit to the existing "no data" shape
   (`{}` / `undefined` / empty `Vec`), never throw. Other providers in the same
   feature must keep working.

### Multi-provider features — the parent flag

When a feature has **more than one** provider, derive a single feature-level
availability from the **OR** of the per-provider flags (the feature is available
as long as _any_ provider is enabled):

```ts
const SWAP_AVAILABLE = KONGSWAP_PROVIDER_ENABLED || ICPSWAP_PROVIDER_ENABLED;
```

When that parent is `false` (all providers disabled), the feature must degrade
gracefully. **How** is a per-feature decision the spec owns — pick one:

- **Show a placeholder / empty state** (e.g. "temporarily unavailable") if the
  surrounding surface should stay visible, or
- **Hide the feature entirely** (entry point, route, card) if a dead surface is
  worse than its absence.

Don't leave a feature that silently renders nothing or errors when every
provider is off. Decide the degradation explicitly and note it in the spec.

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
- The route-level prerendered backgrounds described in
  [HACKING.md "Routes Styles"](../../../HACKING.md#routes-styles) are the
  preferred way to set route-specific colours.

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
- `console.log` left in committed code (and `console.error` / `.warn` are
  ESLint errors — use `consoleError` / `consoleWarn`).
- An external provider with **no** kill-switch flag, or a flag that only gates
  _some_ of its call sites — see [External providers — kill-switch flags](#external-providers--kill-switch-flags).
- A multi-provider feature that breaks (renders nothing / throws) when all its
  providers are disabled, instead of an explicit placeholder-or-hide decision.
