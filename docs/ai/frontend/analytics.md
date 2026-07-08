# Analytics & event tracking (Plausible)

How OISY emits product analytics, and the rules for adding a new event. Read this
before wiring any `trackEvent` call. This doc is the canonical analytics reference;
it sits under the frontend docs alongside
[`stack-and-patterns.md`](./stack-and-patterns.md) and the
[`workflows/`](./workflows/) guides.

> **Golden rule.** Analytics is _non-critical, anonymous, and never a source of
> truth about a user_. A tracking call must never throw into a user flow, and an
> event's properties must never carry anything that could identify a person or
> leak a secret. When in doubt, emit less.

> **Canonical reference.** This document plus the `enums/plausible.ts` code are
> the source of truth for events and their property keys. The shared property
> vocabulary in §4 was consolidated here from the team's earlier Plausible notes;
> there is no separate per-event registry to keep in sync. Event _names_ live in
> the code (`PLAUSIBLE_EVENTS` / the `TRACK_*` constants); the property _schema_
> lives in §4. When they disagree, the code is current state (AGENTS.md truth
> hierarchy) — reconcile this doc to it.

---

## 1. How it's wired (the moving parts)

| Concern             | Lives in                                                                                                                                                                                               | Notes                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Feature flag        | [`$env/plausible.env.ts`](../../../src/frontend/src/env/plausible.env.ts) → `PLAUSIBLE_ENABLED`                                                                                                        | Backed by `VITE_PLAUSIBLE_ENABLED`. Lets us disable analytics even in prod-like builds.                                    |
| Domain              | `plausible.env.ts` → `PLAUSIBLE_DOMAIN`                                                                                                                                                                | Resolved per environment (prod / beta / staging / audit / signer subdomains). `null` disables tracking.                    |
| Tracker load        | [`analytics-wrapper.ts`](../../../src/frontend/src/lib/services/analytics-wrapper.ts)                                                                                                                  | Lazy `import('@plausible-analytics/tracker')`. **Browser-only** — the tracker relies on browser APIs and breaks under SSR. |
| The one entry point | [`analytics.services.ts`](../../../src/frontend/src/lib/services/analytics.services.ts) → `trackEvent`                                                                                                 | Everything funnels through here.                                                                                           |
| Event names         | [`enums/plausible.ts`](../../../src/frontend/src/lib/enums/plausible.ts) (`PLAUSIBLE_EVENTS`) and [`constants/analytics.constants.ts`](../../../src/frontend/src/lib/constants/analytics.constants.ts) | See §3.                                                                                                                    |
| Metadata vocabulary | `enums/plausible.ts`                                                                                                                                                                                   | Contexts, subcontexts, source locations, result statuses, modifiers, keys. See §4.                                         |
| Test mock           | [`tests/mocks/plausible-tracker.mock.ts`](../../../src/frontend/src/tests/mocks/plausible-tracker.mock.ts)                                                                                             | Used by every analytics `*.spec.ts`.                                                                                       |

`initPlausibleAnalytics()` is called once on the client; it is a no-op when the
flag is off, the domain is null, we're not in the browser, or the tracker is
already loaded. You never call it from feature code.

---

## 2. The only entry point: `trackEvent`

```ts
import { trackEvent } from '$lib/services/analytics.services';
import type { TrackEventParams } from '$lib/types/analytics';

// TrackEventParams = { name: string; metadata?: Record<string, string>; warning?: string }
trackEvent({
	name: PLAUSIBLE_EVENTS.SOME_EVENT,
	metadata: {
		event_context: PLAUSIBLE_EVENT_CONTEXTS.SOME_CONTEXT,
		result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
	}
});
```

Non-negotiable facts about `trackEvent`:

- **It never throws.** The body is wrapped in `try/catch`; a tracking failure is
  swallowed (debug-logged only under `LOCAL` / `STAGING`). Do not add your own
  try/catch around it, and never `await` it into a critical path — it is
  synchronous and fire-and-forget.
- **It respects the flag.** When `PLAUSIBLE_ENABLED` is false or the tracker
  isn't loaded, the call is a no-op. Feature code must behave identically whether
  analytics is on or off.
- **Metadata is `Record<string, string>`.** All values are strings. Numbers,
  booleans, dates → stringify at the call site (`String(n)`, `'true'`, ISO
  string). Build the object with conditional spreads so absent fields are simply
  omitted, never `undefined`:

  ```ts
  metadata: {
  	event_modifier: modifier,
  	...(nonNullish(errorCode) && { result_error_code: errorCode })
  }
  ```

Prefer `nonNullish` / `notEmptyString` from `@dfinity/utils` for the guards
(commandment 5: always typed, never `any`).

---

## 3. Where event names live — enum vs. flat constant

Two homes exist. Pick by shape, and **never inline a raw string literal** as an
event name or a metadata value.

### `PLAUSIBLE_EVENTS` enum — structured event families

Use for a feature that has **several actions and/or a success/error lifecycle**
that you want to see as _one_ event distinguished by metadata. Examples:
`TOKEN_MANAGE`, `LIMIT_ORDER`, `TRANSACTION_FILTER`, `ONRAMPER_OPEN`. The action
rides in `event_subcontext` / `event_modifier`, the outcome in `result_status` —
so you get one event name, not `foo_create_success` / `foo_create_error` /
`foo_delete_success` / … multiplying out. This is the **preferred** pattern for
any new feature area (see §5, pattern B).

### `analytics.constants.ts` flat `TRACK_*` constants — simple counters

Use for a **single, self-contained count** where a structured family would be
overkill: `sign_in_success`, `wallet_connect`, `welcome_open`. The constant _is_
the event name (a snake_case string). These are grouped by domain with a comment
header. Fine for one-shot funnels; reach for the enum pattern the moment you have
more than ~2 related actions.

> Rule of thumb: **> 2 related actions, or any success/error lifecycle → enum
> family + domain service (pattern B). One isolated ping → flat constant
> (pattern A).**

Extend the existing enum / constants file in place — respect the closed
structure (commandment 7). Don't create a parallel naming scheme.

---

## 4. Metadata vocabulary (reuse the enums)

Property _keys_ are a small shared schema so dashboards can filter and group
across features. Property _values_ come from the enums in
[`enums/plausible.ts`](../../../src/frontend/src/lib/enums/plausible.ts). Reuse an
existing member; if none fits, **add a member to the right enum** rather than
inlining a literal.

The schema organises every property into five groups — **Event**, **Source**,
**Result**, **Token**, and **Token2**. The tables below are the naming contract.
Where a value comes from a code enum it is noted;
otherwise it is a free string built at the call site. Keep the names exactly and
stringify all values (§2).

> **Only the properties that fit the event.** The five groups are a _menu_, not a
> checklist — an event carries the subset that is meaningful in its context and
> omits the rest (via conditional spreads, so absent keys never appear as
> `undefined`). Don't pad an event with empty or "N/A" fields, and don't invent a
> value just to fill a column. Rough guide:
>
> - A **UI toggle / filter change** → mostly **Event** + **Source** (e.g.
>   `event_modifier`, `event_key`, `source_location`). No Token, no Result beyond
>   `success`.
> - A **backend action with an outcome** (send, save, delete) → **Event** +
>   **Result** (`result_status`, and error fields only on failure).
> - A **token operation** → add **Token**; a **two-token flow** (swap / trade) →
>   add **Token2**.
> - `result_error*` fields appear **only** when `result_status` is `error`.
>
> The test for each property: "would an analyst filtering on this learn something
> true about this event?" If not, leave it out.

Repeatable keys use a numeric suffix (`event_key`, `event_key2`, …;
`event_value`, `event_value2`, …; `source_detail`, `source_detail2`, …).

### Event — what happened

| Property                          | Description                                            | Examples                                                          | Value source                                              |
| --------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------- |
| `event_context`                   | Section / status / form the event belongs to           | `nft`, `send`, `earn`                                             | `PLAUSIBLE_EVENT_CONTEXTS`                                |
| `event_subcontext`                | More granular context (subsection, wizard step, field) | `Harvest Autopilot`                                               | `PLAUSIBLE_EVENT_SUBCONTEXT_*`                            |
| `event_trigger`                   | What triggered the event                               | `auto`, `click`                                                   | free string                                               |
| `event_provider`                  | Third-party provider                                   | `velora`, `liquidium`, `OISY Trade`                               | free string / provider const                              |
| `event_modifier`                  | "Direction" for two-way events                         | `enable` / `disable`, `deposit` / `withdraw`, `create` / `cancel` | `PLAUSIBLE_EVENT_FILTER_MODIFIERS` or feature-local union |
| `event_key` (`event_key2`, …)     | Event-specific key                                     | `episode`, `type`                                                 | `PLAUSIBLE_EVENT_EVENTS_KEYS` / free string               |
| `event_value` (`event_value2`, …) | Event-specific value                                   | `s1e4`, `address`                                                 | free string                                               |
| `side`                            | Order side (trade events)                              | `buy` / `sell`                                                    | feature-local union                                       |
| `order_type`                      | Order time-in-force (trade events)                     | `FOK` / `GTC`                                                     | feature-local union                                       |
| `price`                           | Limit price, quote per base (trade events)             | `8.42`                                                            | number → string (full precision)                          |

### Source — where it came from

| Property                              | Description                                                                        | Examples                          | Value source                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------ |
| `source_location`                     | Primary UI location                                                                | `Navigation`, `User menu`, `send` | `PLAUSIBLE_EVENT_SOURCE_LOCATIONS`               |
| `source_sublocation`                  | Sub-location within it                                                             | `Address picker`                  | `PLAUSIBLE_EVENT_SOURCE_LOCATIONS` / free string |
| `source_detail` (`source_detail2`, …) | Extra source detail                                                                | `form` / `review`, `cancel` / `x` | free string                                      |
| `source_path`                         | Human-readable `location / sublocation / …` concatenation for at-a-glance scanning |                                   | built at call site                               |
| `source_link`                         | Associated link                                                                    |                                   | free string                                      |

### Result — how it ended

| Property                             | Description                     | Examples                                   | Value source                       |
| ------------------------------------ | ------------------------------- | ------------------------------------------ | ---------------------------------- |
| `result_status`                      | Outcome                         | `success` / `error` / `cancel`             | `PLAUSIBLE_EVENT_RESULT_STATUSES`  |
| `result_duration_in_seconds`         | Runtime, if available           | `0.15489`                                  | number → string                    |
| `result_duration_in_seconds_rounded` | Rounded runtime                 | `2`                                        | number → string                    |
| `result_error`                       | Our own error text              | `NFT sending failed`                       | sanitised string (§6)              |
| `result_error_severity`              | Severity band                   | `blocker` / `critical` / `major` / `minor` | `PLAUSIBLE_EVENT_ERROR_SEVERITIES` |
| `result_error_code`                  | Error code                      | `407`                                      | string                             |
| `result_error_text`                  | Full raw error text we received | `Error parsing …`                          | sanitised string (§6)              |

> Legacy: `result_error_toast_level` / `result_error_toast_key` are
> **deprecated** — don't add them to new events.

### Token — the involved token

| Property          | Examples                                  | Notes                                          |
| ----------------- | ----------------------------------------- | ---------------------------------------------- |
| `token_network`   | `icp`, `btc`, `eth`, `base`, `arb`, `sol` |                                                |
| `token_address`   | `0x38239…`                                | public chain data                              |
| `token_standard`  | `erc-20`                                  |                                                |
| `token_symbol`    | `USDC`                                    |                                                |
| `token_name`      | `USD Stablecoin`                          |                                                |
| `token_id`        |                                           | needed for NFTs                                |
| `token_amount`    | `20`                                      | see §6 — avoid amounts that could de-anonymise |
| `token_usd_price` | `1.00001`                                 |                                                |
| `token_usd_value` | `20.00002`                                | see §6                                         |

### Token2 — the second involved token

Same fields as **Token**, prefixed `token2_` — for flows with two tokens (swap,
trade, deposit/withdraw): `token2_network`, `token2_address`, `token2_standard`,
`token2_symbol`, `token2_name`, `token2_id`, `token2_amount`, `token2_usd_price`,
`token2_usd_value`. By convention the primary/base token is `token_*` and the
quote/second token is `token2_*` (see `trackLimitOrder`).

> **Code vs. schema naming.** A few code enums use adjacent names for the same
> idea — e.g. `result_error_message` in code maps to this doc's
> `result_error_text`, and `result_error_type` is a code-side classifier not in
> the tables above. When adding events, prefer the **schema** names above and
> reconcile any drift (code wins on current-state conflicts per the AGENTS.md
> hierarchy, but the two should be made to agree).

---

## 5. The two implementation patterns

### Pattern A — inline counter (simple)

For a one-off, fire the flat constant directly from the component / service:

```ts
import { TRACK_WELCOME_OPEN } from '$lib/constants/analytics.constants';
import { trackEvent } from '$lib/services/analytics.services';

trackEvent({ name: TRACK_WELCOME_OPEN });
```

### Pattern B — domain analytics service (preferred for features)

For a feature area, add a `<feature>-analytics.services.ts` that exports **one
typed `track<Feature>` function** funnelling into a single `PLAUSIBLE_EVENTS`
member. This centralises the payload shape so every call site stays in sync.
Model it on [`token-manage-analytics.services.ts`](../../../src/frontend/src/lib/services/token-manage-analytics.services.ts)
and [`trading-analytics.services.ts`](../../../src/frontend/src/lib/services/trading-analytics.services.ts):

```ts
export interface TrackFooParams {
	modifier: FooModifier; // the action
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES; // the outcome
	// …non-personal attributes, all optional via conditional spread
	error?: string;
}

export const trackFoo = ({ modifier, resultStatus, error }: TrackFooParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.FOO,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.FOO,
			event_modifier: modifier,
			result_status: resultStatus,
			...(notEmptyString(error) && { result_error: error })
		}
	});
};
```

**Why one event, not many:** a single `foo` event with `event_modifier` +
`result_status` beats a cartesian explosion of `foo_create_success`,
`foo_delete_error`, … It keeps the enum small and the dashboard groupable. Only
fall back to distinct flat constants when the actions are genuinely unrelated
one-off pings (e.g. `welcome_open` vs. `wallet_connect`). Two enum families for
one feature are fine when the flows differ — e.g. `personal_note` (lifecycle) and
`personal_note_share` (the share funnel) share a context but track different journeys.

**Firing point / lifecycle:** for async flows, fire `executing` (or a
`submitted` counter) when the action starts, then `success` / `error` from the
outcome (the poller or the awaited result) — mirroring swap / trading /
liquidium. For a synchronous UI toggle, fire once with `success`.

**Return-vs-fire:** if the event must fire on a child's DOM event (e.g. a click
on `ExternalLink`), build and _return_ the `TrackEventParams` from a helper and
hand it to the component, as `buildLearnMoreEvent` does — rather than firing
inside the helper.

---

## 6. Privacy — the hard invariants

These are not guidelines. A PR that violates them does not merge.

1. **No secrets, ever.** Never put a private key, vetKD-derived key, share token,
   share key, seed, auth token, or ciphertext into metadata.
2. **No user content.** Never emit note text, message bodies, contact names, or
   any free-text the user authored. The note-share and transaction-filter code
   ship _no value_ for contacts precisely to avoid this.
3. **No PII / de-anonymising joins.** No principal, email, IP, or a combination
   of fields that singles out a user. Public chain data (network, token symbol /
   address / name) is fine; a raw amount that could fingerprint a specific user
   is not — prefer bucketed or omit.
4. **Sanitise errors.** Strip IC request IDs and any embedded identifiers from
   error strings before they become `result_error*`. Omit the field when empty
   (`notEmptyString`).
5. **English, locale-independent labels.** Human-readable labels resolve against
   the bundled `en.json` (see `resolveEnglishLabel` / `replaceOisyPlaceholders`),
   never the user's locale, so dashboards stay consistent and no locale leaks.
6. **Mind the surface.** Events that fire on the logged-out `(public)` pages are
   anonymous by construction — keep them that way; don't smuggle in anything the
   authenticated app knows.

---

## 7. Testing

Every analytics service ships a spec under
[`src/frontend/src/tests/lib/services/`](../../../src/frontend/src/tests/lib/services/)
(see `token-manage-analytics.services.spec.ts`, `trading-analytics.services.spec.ts`).
Mock the tracker with [`plausible-tracker.mock.ts`](../../../src/frontend/src/tests/mocks/plausible-tracker.mock.ts)
and assert:

- the exact event `name`;
- the full `metadata` shape for each action × outcome;
- that optional fields are **absent** (not `undefined`) when their input is nullish;
- that no forbidden field (content / secret / PII) appears.

Run the frontend gates before opening the PR: `npm run format`,
`npm run lint -- --max-warnings 0`, `npm run check`, `npm run test`.

---

## 8. Checklist — adding a new event

1. Decide pattern **A** (isolated counter → flat `TRACK_*` constant) or **B**
   (feature family → `PLAUSIBLE_EVENTS` member + `<feature>-analytics.services.ts`).
2. Add the event name to the right home; reuse or extend the metadata enums —
   no inline string literals.
3. Attach only the properties meaningful to this event (§4) — the subset that
   fits its context, not the whole menu; keep values `Record<string, string>`
   and build with conditional spreads so unused keys are omitted, not `undefined`.
4. Choose firing points and `result_status` timing (executing → success/error).
5. Run the §6 privacy checklist against every property.
6. Add / extend the `.spec.ts` (name + metadata + omission + privacy assertions).
7. Run the quality gates.
8. **Keep the §4 schema current.** If you added a new property _key_ (not just a
   new value), add it to the right group's table above so the schema stays
   complete and dashboards can discover it.
9. **Meta-update (commandment):** if you introduced a new pattern, enum family,
   or metadata key, update _this doc_ in the same PR, add a pointer in the
   [`AGENTS.md`](../../../AGENTS.md) "Where to look (frontend)" table if it's a
   new topic, and update [`docs/ai/PRODUCT.md`](../PRODUCT.md) if user-visible
   behaviour changed.
