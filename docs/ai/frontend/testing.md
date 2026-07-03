# Frontend Testing

Vitest is **not** optional in this repo. Coverage thresholds are enforced
by CI and auto-bumped upward by the
`frontend-update-coverage-thresholds` workflow. Don't lower them.

## What to test

| Add tests for                                                      | Don't bother                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------- |
| Pure utils (`*.utils.ts`) — every public function                  | Re-exports, barrels                                   |
| Service modules (`*.services.ts`) — happy path + each error branch | Generated files (`$declarations`, `i18n.d.ts`, …)     |
| Derived stores (`*.derived.ts`) with non-trivial logic             | Throwaway prototypes                                  |
| Reusable components in `$lib/components/{common,ui,core}/`         | One-off presentational components used in 1 page only |
| Components with logic (any non-trivial branch / event handler)     | —                                                     |
| Workers and schedulers                                             | —                                                     |
| Validation / schema modules                                        | —                                                     |
| Bug fixes (write the regression test that fails on `main`)         | —                                                     |

If you fix a bug, **the PR contains a test that fails on `main` and
passes on your branch**. Otherwise it's an "I think this is fine" PR.

## Where tests live

`src/frontend/src/tests/` mirrors `src/frontend/src/` exactly:

```
src/frontend/src/lib/services/exchange.services.ts
                ↳ src/frontend/src/tests/lib/services/exchange.services.spec.ts

src/frontend/src/btc/services/btc-send.services.ts
                ↳ src/frontend/src/tests/btc/services/btc-send.services.spec.ts
```

- Reusable mocks → `src/frontend/src/tests/mocks/<thing>.mock.ts`.
- Reusable test utilities → `src/frontend/src/tests/utils/<thing>.test-utils.ts`.
- Reusable Svelte-context factories →
  `src/frontend/src/tests/utils/<area>.context.test-utils.ts`. Each exports a
  `mock<Area>ContextEntry(...)` returning a `[key, value]` tuple; assemble them
  with `mockContextMap([...])` from `$tests/utils/context.test-utils` instead of
  hand-rolling a `new Map()` per spec.
- Reusable fixtures → `src/frontend/src/tests/fixtures/<area>/`.
- Test-only types → `src/frontend/src/tests/types/`.

Never put a `.spec.ts` next to the file it tests.

## Stack

- **Vitest 4** + `@testing-library/svelte` + `jsdom`. Configured in
  [`vitest.config.ts`](../../../vitest.config.ts) and
  [`vitest.setup.ts`](../../../vitest.setup.ts).
- **Mocks:** `vitest-mock-extended`, `fake-indexeddb`.
- **Type-check tests:** `npm run check:tests` (uses `tsconfig.spec.json`).
- **e2e:** Playwright at the repo root (`npm run e2e`). See the
  [E2E status](#e2e-status-temporarily-restricted) section below.

## E2E status (temporarily restricted)

> **Default rule for agents (today): do not add new Playwright specs.**
> The e2e suite under [`e2e/`](../../../e2e/) is currently in a
> maintenance-only state due to flakiness in non-trivial flows. Only
> very simple, stable specs are reliable; full suite runs are gated by
> the `run-e2e-snapshots` label and a nightly cron.

What this means for an agent:

- **Don't write new e2e specs** as part of a feature PR unless the user
  explicitly asks. Cover the change with Vitest + component tests
  instead, plus manual repro steps in the PR body's `# Tests` section.
- **Don't expand existing flaky specs.** Fixes that touch e2e are
  welcome but ride in a dedicated `fix(e2e): …` or `test(e2e): …` PR.
- **Snapshots:** if your change is visual and an existing snapshot
  spec covers it, follow the workflow in
  [HACKING.md "E2E visual comparisons"](../../../HACKING.md#e2e-visual-comparisons).
  Snapshot regeneration is its own workflow (`update-snapshots.yml`);
  see also `chore(e2e): Update Playwright E2E Snapshots` PRs in history.
- **Run-on-demand:** apply the `run-e2e-snapshots` label to a PR to
  trigger the full e2e job manually.

> **When the suite is restored:** this section will flip. The
> expectation will become "every user-facing flow has e2e coverage,
> bug fixes include a regression spec, no `test.skip` on `main`". When
> that happens, update this page in the same PR per the
> [meta-update rule](../governance.md#meta-update-rule). The Cursor
> rule [`40-testing.mdc`](../../../.cursor/rules/40-testing.mdc) is a
> thin routing pointer to this page, so no separate update is needed
> there.

## Running

```bash
# All FE tests (single shard locally)
npm run test

# Single file
npm run test -- src/frontend/src/tests/lib/services/exchange.services.spec.ts

# With logging enabled (for debugging)
npm run test:debug

# With coverage
npm run test:coverage
```

CI shards into 20 parallel jobs (see
[`frontend-checks.yml`](../../../.github/workflows/frontend-checks.yml)).
Don't write tests that depend on shard order or filesystem state across
files.

## Conventions

### File shape

Anchored on the real shape of
[`exchange.services.spec.ts`](../../../src/frontend/src/tests/lib/services/exchange.services.spec.ts):

```ts
import { Currency } from '$lib/enums/currency';
import { simplePrice } from '$lib/rest/coingecko.rest';
import { exchangeRateUsdToCurrency } from '$lib/services/exchange.services';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/rest/coingecko.rest', () => ({
	simplePrice: vi.fn(),
	simpleTokenPrice: vi.fn()
}));

describe('exchange.services', () => {
	describe('exchangeRateUsdToCurrency', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should return 1 for USD', async () => {
			await expect(exchangeRateUsdToCurrency(Currency.USD)).resolves.toStrictEqual({
				rate: 1,
				fx24hChangeMultiplier: 1
			});

			expect(simplePrice).not.toHaveBeenCalled();
		});

		it('should query the price for BTC to USD and BTC to currency', async () => {
			await exchangeRateUsdToCurrency(Currency.EUR);
			expect(simplePrice).toHaveBeenCalledExactlyOnceWith({ ids: 'bitcoin' /* … */ });
		});

		// … one `it` per behaviour
	});
});
```

Notes:

- One `describe` per module under test, nested `describe` per public
  function.
- One `it` per behaviour — name it from the user/caller perspective.
- Reset mocks in `beforeEach`. Never let test order matter.
- Reach for the existing `mock*.ts` factories under `$tests/mocks/` before
  building your own. If you build your own, put it in `$tests/mocks/` so
  the next test reuses it.
- For fetch: `vi.stubGlobal('fetch', mockFetch)` + `vi.unstubAllGlobals()`
  in `afterAll`.
- For timers: use `vi.useFakeTimers()` and the helpers in
  `$tests/utils/timers.test-utils.ts`. Never `setTimeout`-based waits.

### What to assert

- **Behaviour, not implementation.** Test the return value, the toast call,
  the rendered text — not internal helper functions.
- **i18n**: when asserting against translated text, import the same key
  the source uses (`get(i18n).<bucket>.<purpose>.<key>`) rather than
  hard-coding the English copy.

### Forbidden in tests

- `it.skip` / `describe.skip` / `it.todo` left on `main`.
- Real network calls. Stub `fetch` with `vi.stubGlobal`.
- `setTimeout`-based waits. Use `vi.useFakeTimers()` or `await waitFor(...)`.
- Console-noise (`console.log` debug output). Remove before commit.
- Hard-coded English copy when an i18n key exists for it.

## Component testing

For Svelte components, use `@testing-library/svelte`:

```ts
import { render, screen } from '@testing-library/svelte';
import { i18n } from '$lib/stores/i18n.store';
import { get } from 'svelte/store';
import MaxBalanceButton from '$lib/components/common/MaxBalanceButton.svelte';

describe('MaxBalanceButton', () => {
	it('renders the max action label', () => {
		render(MaxBalanceButton, {
			props: {/* … */}
		});
		expect(screen.getByRole('button', { name: get(i18n).core.text.max })).toBeInTheDocument();
	});
});
```

Prefer `getByRole`, `getByLabelText`, `getByText` — they exercise the same
semantics as a screen reader.

## Type-check tests

`npm run check:tests` runs `svelte-check` against `tsconfig.spec.json`.
If you add a new test that requires a type-only import, make sure
`tsconfig.spec.json` resolves it. Test files use the `$tests` alias
declared in `vitest.config.ts`.

## Coverage thresholds

Thresholds live under `test.coverage.thresholds` in
[`vitest.config.ts`](../../../vitest.config.ts). They auto-update upward
on `main` via `frontend-update-coverage-thresholds.yml`. Two rules:

- **Don't lower them manually.**
- **If you delete a tested module, expect coverage to dip.** The next
  scheduled `update-coverage-thresholds` run will rebase them downward;
  don't pre-emptively bump them in your PR unless asked.

## When tests are not enough

Some bugs only show up in the browser (CSP, real routing, IC actor
plumbing, etc.). Given the [e2e restriction](#e2e-status-temporarily-restricted):

- **Document manual repro steps** in the PR body's `# Tests` section.
  This is the default for browser-only changes today.
- For visual changes that already have a snapshot spec, follow the
  workflow in [HACKING.md "E2E visual comparisons"](../../../HACKING.md#e2e-visual-comparisons).
- A **new** Playwright spec is allowed only if (a) the user explicitly
  asked, or (b) it is a trivially stable spec mirroring an existing
  one in `e2e/`. Otherwise, capture the manual repro and move on.
