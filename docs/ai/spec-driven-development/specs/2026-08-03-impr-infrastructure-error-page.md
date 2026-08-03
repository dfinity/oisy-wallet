# Spec: Graceful handling of infrastructure errors

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Motivation

When the Internet Computer HTTP gateway is unreachable, OISY surfaces the failure as a raw error toast. Users report seeing messages like:

> Failed to load user data from reward canister. / Failed to fetch HTTP request: Load failed

> Error while loading the profile. Please refresh the page to have the full experience. / Failed to fetch HTTP request: Load failed

Three separate problems are visible in those two lines.

1. **The appended detail is developer text, not user text.** `Failed to fetch HTTP request: …` is agent-js's own wording (`@dfinity/agent` `errors.js`, `AgentFetchError#toString`), and `Load failed` is WebKit's message for a rejected `fetch`. Neither tells a user anything actionable; together they read like a crash.
2. **A blocking failure is presented as a dismissable toast.** The profile failure happens during app initialization. `LoaderUserProfile.svelte` gates the whole loader tree behind `$userProfileLoaded`, so when the profile never loads the user is left on a skeleton with a toast floating over it. The toast even advises "Please refresh the page", which is the one thing a toast cannot do for them.
3. **These failures are invisible in analytics.** There is no event that says "a user could not reach the IC". An outage is only observable as an absence of other events, which is exactly when we most want a signal.

A fourth point shapes the copy. The frontend **cannot tell** an IC-side outage from the user's own connectivity — an offline laptop, a captive-portal wifi, or a mobile tab that was backgrounded long enough to drop its connection all produce this identical error. So the wording must describe the symptom ("OISY can't reach the network") and must not assert a cause ("our infrastructure is down").

## Goals

- Classify "the IC is unreachable" once, centrally, instead of at each call site.
- Replace the blocking profile-load failure with a dedicated full-page state that explains the situation and offers the two actions that actually help: **reload** and **log out**.
- Let a curious or support-assisted user expand the underlying technical detail, without putting it in front of everyone by default.
- Give non-blocking background failures calmer copy, and stop appending raw agent-js text to them.
- Emit one dedicated Plausible event for exceptional errors of this kind, so an outage is directly observable on the dashboard.

## Non-goals

- **No retry, backoff, or reconnection logic.** The page offers a manual reload; it does not poll or auto-recover. Automatic recovery is a separate concern (see the related work on the ETH fee recovery path).
- **No escalation to the full page from mid-session failures.** A wallet that has finished loading keeps working; a background query that fails gets a toast, not a takeover. Only the blocking init path reaches the page. (Deliberate: a threshold-based escalation would need a counter and a window, and risks stealing a session that would have recovered on its own.)
- **No change to the signer / chain-fusion-signer error paths.** Those have their own classification and copy work in flight (PR #13145).
- **No offline detection via `navigator.onLine`.** It reports link state, not reachability, and is misleading behind captive portals.
- **No new dependency, no new top-level folder.**

## Part 1 — Classify the error centrally

**Where:** `src/frontend/src/lib/utils/error.utils.ts`.

Add one predicate alongside the existing `isVersionMismatchError`:

- `isNetworkUnreachableError(err: unknown): boolean`

**Match on agent-js's structured taxonomy, not on the message text.** `@dfinity/agent` exports a typed error hierarchy (`AgentError` with a `kind` from `ErrorKindEnum`, and an error `code`), and the two outage shapes that matter sit in _different_ kinds:

| Failure                                                          | Thrown as                               | `kind`      |
| ---------------------------------------------------------------- | --------------------------------------- | ----------- |
| `fetch` itself rejected — offline, DNS, connection refused, CORS | `TransportError` / `HttpFetchErrorCode` | `Transport` |
| Gateway answered with an HTTP error — 502/503/429                | `ProtocolError` / `HttpErrorCode`       | `Protocol`  |

The screenshot in the Motivation is the first row. The second row is a **boundary-node outage**, which is at least as common — and matching only `kind === Transport` would silently miss it. So the predicate covers both:

- any `AgentError` whose `kind` is `Transport`; **and**
- an `AgentError` carrying `HttpFetchErrorCode` or an `HttpErrorCode` whose `status` is a gateway-level failure (5xx, or 429).

Keep the `Failed to fetch HTTP request` string marker as a **fallback only**, for errors that crossed a boundary (worker `postMessage`, re-wrapping) and lost their prototype, so `instanceof` no longer holds. Structured check first, marker second.

**Deliberately excluded:** `TimeoutWaitingForResponseErrorCode` (thrown as `ProtocolError` / `UnknownError`). A polling timeout can equally mean a slow canister rather than an unreachable network, and treating it as an outage would take the app over on a merely slow call. Likewise, a canister that answers with a **reject** is not a network error and keeps its existing handling.

## Part 2 — Blocking init failure → a full-page state

### Where the failure is raised

`loadUserProfile` (`src/frontend/src/lib/services/load-user-profile.services.ts`) currently catches any unknown error, fires `toastsError` with `settings.error.loading_profile`, and returns `{ success: false, err: 'unknown' }`. Its two callers then react:

- `LoaderUserProfile.svelte` — handles only `signups-closed`; on `unknown` it does nothing, so the `$userProfileLoaded` gate stays shut and the user sits on the skeleton.
- `initLoader` (`src/frontend/src/lib/services/loader.services.ts`) — calls `await signOut({})`.

### The change

Introduce a third failure reason, `'network-unreachable'`, returned when `isNetworkUnreachableError(err)` holds. On that reason `loadUserProfile` shows **no toast** and signs the user **out of nothing** — it records the failure in a new store and lets the UI take over:

- **New store** `src/frontend/src/lib/stores/infrastructure-error.store.ts` — holds the current infrastructure error (the failed operation plus the sanitised detail text) or `undefined`. It is set on failure and reset when a subsequent attempt succeeds, so a recovered session does not keep a stale page.
- **New component** `src/frontend/src/lib/components/auth/InfrastructureErrorPage.svelte` — a sibling of `LockPage.svelte`, reusing its full-page shell (the `fixed inset-0 … bg-page` wrapper and the centred `max-w-md` `bg-surface` card with `OisyWalletLogoLink`). It is **not** a refactor of `LockPage`: the lock page keeps its own imagery and sign-in buttons untouched, and the shared look is achieved by matching its markup, not by extracting a base component.
- **Render site** `src/frontend/src/routes/(app)/+layout.svelte` — a new branch next to the existing `{#if $isAuthLocked}<LockPage />`. Lock keeps precedence: a user who deliberately locked the wallet should see the lock page, and unlocking is what triggers loading in the first place.

Rendering at layout level (rather than inside `Loaders`) is what makes this work: the page replaces the app instead of floating over the skeleton that `$userProfileLoaded` is holding shut.

### What the page contains

- The OISY logo, so it reads as OISY and not as a browser error page.
- A heading and a short explanation, phrased as a reachability problem with an unknown cause, mentioning that it may be the connection or the network and that funds are unaffected.
- **Reload** as the primary action (`window.location.reload()`).
- **Log out** as the secondary action, styled like the lock page's logout button (`signOut({ resetUrl: true, source: … })`).
- A collapsed **technical details** section using the existing `src/frontend/src/lib/components/ui/Collapsible.svelte`, revealing the sanitised error text (routed through the existing `replaceIcErrorFields` / `formatIcCallError` helpers, so no IC request IDs are shown) and the operation that failed. Collapsed by default.

Because the user is signed in whenever this page can appear (profile loading requires an identity), both actions are meaningful.

### Behaviour this replaces

The `await signOut({})` on `initLoader`'s unknown-error path is **preserved for genuinely unknown errors** and skipped for `'network-unreachable'` — being thrown back to the landing page is a reasonable answer to a real bug, but a hostile one to a dropped wifi connection, because it discards the session for something a reload would fix.

## Part 3 — Non-blocking failures → calmer copy

**Where:** `src/frontend/src/lib/services/reward.services.ts` (`getUserRoles`, `getRewards`).

These are background queries; the wallet works without them. Keep them as toasts, but when `isNetworkUnreachableError(err)` holds, show a short connection-problem message and **omit `err`**, so `toastsError` does not append the agent-js text. Any other error keeps today's behaviour verbatim.

The mechanism is a small helper in `src/frontend/src/lib/stores/toasts.store.ts` — the same shape as `toastsSignerUnavailableOr` in PR #13145 — that shows the calm message when the predicate matches and otherwise defers to a caller-supplied fallback. (Reconciliation with #13145 is a pending decision below.)

## Part 4 — One Plausible event for exceptional errors

**Where:** `src/frontend/src/lib/enums/plausible.ts`, `src/frontend/src/lib/services/analytics.services.ts`, `docs/ai/frontend/analytics.md`.

Per `docs/ai/frontend/analytics.md` §3 this is an event **family**, not a counter — it has more than two call sites and a severity dimension — so it is a `PLAUSIBLE_EVENTS` member fired through a single typed function (pattern B).

- `PLAUSIBLE_EVENTS.EXCEPTIONAL_ERROR = 'exceptional_error'` — deliberately generic, so future "the app could not do its job" conditions reuse it instead of each minting a counter.
- A new `PLAUSIBLE_EVENT_CONTEXTS.INFRASTRUCTURE` member.
- A new subcontext enum for the failing operation (`user_profile`, `user_roles`, `rewards`), so the dashboard can group by what broke.
- `PLAUSIBLE_EVENT_ERROR_SEVERITIES` currently has only `MAJOR`, while §4 of the analytics doc already documents `blocker` / `critical` / `major` / `minor`. Add the missing members and use `blocker` for the init failure (user cannot use the wallet) and `major` for the background ones (degraded, still usable).
- Metadata: `event_context`, `event_subcontext`, `result_status: error`, `result_error` (our own message), `result_error_text` (the sanitised raw text), `result_error_severity`, and an error code identifying the class of failure.

Privacy (§6): the only free text emitted is the sanitised agent-js transport message, which carries no principal, address, or user content. No identity, no amounts.

The event fires from the classification point, once per failed operation — not from the component, so it is not tied to whether the page happens to render.

## i18n

New keys under the existing `init` block in `src/frontend/src/lib/i18n/en.json` (the failure is init-scoped, and `init.error` already hosts the initialization failures): an `init.unavailable` sub-block for the page's heading, explanation, details label, reload label and logout label, plus the short connection message for Part 3 in `init.error`.

The 14 other locales (`ar`, `cs`, `de`, `es`, `fr`, `hi`, `it`, `ja`, `ko-KR`, `pl`, `pt`, `ru`, `vi`, `zh-CN`) get the keys synced as empty strings by `npm run i18n`, and `mergeWithFallback` serves the English value for any empty translation — so this PR ships English copy everywhere and a follow-up i18n PR supplies the translations. Keep the copy short regardless: the `compare-sizes` CI gate sums raw + gzipped across all 16 locale chunks, so verbose strings multiply into the bundle budget 16×.

`settings.error.loading_profile` moves to `init.error` as part of this work — the string was never a settings concern (this is the correction that PR #12693 was opened for; see below).

## Tests

- `error.utils.spec.ts` — `isNetworkUnreachableError` against a real agent-js transport message, a canister reject, a plain `Error`, and non-`Error` values.
- `load-user-profile.spec.ts` — the new `'network-unreachable'` reason: store set, no toast, no sign-out; and the existing unknown-error path unchanged.
- `loader.services.spec.ts` — `initLoader` does not sign out on `'network-unreachable'` and still does on `'unknown'`.
- `reward.services.spec.ts` — calm message and no appended detail on a transport error; existing behaviour on any other error.
- The new analytics function — event name, full metadata per severity, and that optional fields are absent rather than `undefined` (analytics doc §7).
- `InfrastructureErrorPage.spec.ts` — renders heading and both actions, details collapsed by default and expandable, reload and logout wired. The `test-coverage` CI gate enforces whole-project thresholds, so this component test ships in the same PR.

Visual check in the running app for both themes before the PR is called done.

## PRODUCT.md updates (land with the behaviour change)

Add a short subsection describing the state: when OISY cannot reach the Internet Computer during startup, it shows a full-page notice instead of an error toast, offering reload and log out, with technical details available on demand; funds are unaffected; background data that fails to load shows a brief connection message and the wallet stays usable. State explicitly that OISY does **not** auto-retry, so a future reader can tell "excluded on purpose" from "forgotten".

## Relationship to open PRs

- **PR #12693** (`refactor(frontend): improve error handling when user profile loading fails`, draft since 2026-05-07) touches exactly this path: it moves `settings.error.loading_profile` → `init.error.loading_profile` and makes the unknown-error path sign the user out via `errorSignOut`. **This spec supersedes it.** The i18n move is absorbed here; the deterministic sign-out is deliberately _not_ carried over for the transport-error case, which is the whole point of the page. #12693 should be closed when this lands.
- **PR #13145** (`fix(frontend): friendly toast when chain-fusion signer is unavailable`, draft) already establishes the "classify, then show calm copy, then emit a coded event with a severity" pattern for the signer, including a `PLAUSIBLE_EVENT_CODES` enum. That machinery is **not on `main`**. This work stays standalone on `main` and mirrors the naming so whichever lands second reconciles cheaply rather than diverging.

## Open questions (facts to confirm)

_Both questions originally raised here were resolved while writing the spec; kept with their answers so the reasoning is not lost._

- ~~Does agent-js produce other transport-failure shapes we should match?~~ **Resolved:** yes — a gateway HTTP error (502/503) is a `ProtocolError`, not a `TransportError`, so a single marker or a single `kind` check would have missed the most common outage mode. Folded into Part 1, which now matches the structured taxonomy across both kinds and keeps the string marker only as a lost-prototype fallback.
- ~~Should `loadAddresses` failing in `initLoader` route to the same page?~~ **Resolved: not in this scope.** `loadAddresses` (`src/frontend/src/lib/services/addresses.services.ts`) returns a bare `{ success: false }` — the three underlying address services swallow their errors and never surface an error object, so there is nothing to classify. Routing it to the page would first require plumbing the cause up through `loadBtcAddressMainnet` / `loadEthAddress` / `loadSolAddressMainnet`, which is a larger refactor than this change should carry. Worth a follow-up: a transport failure there produces the same dead end (`signOut({})`) that this spec is fixing one level up.

## Pending decisions (facts are clear — we just need to decide)

_All three were decided before implementation started._

- **Error-code property.** _Resolved: `result_error_code`._ It is already documented in analytics doc §4, and it avoids introducing `PLAUSIBLE_EVENT_CODES` in a second open branch while #13145 still carries it. If #13145 lands first, migrating this event to `event_code` is a one-line rename.
- **i18n placement of the page copy.** _Resolved: a dedicated `init.unavailable.*` sub-block_, so the page's copy reads as one unit instead of scattering across `init.text` and `init.error`. The short Part 3 connection message stays in `init.error`, where the other initialization failures live.
- **Whether translations ship in this PR or a follow-up.** _Resolved: English first, translations in a follow-up i18n PR._ Verified safe: `npm run i18n` syncs the new keys into the 14 other locale files as empty strings, and `mergeWithFallback` (`src/frontend/src/lib/utils/i18n.utils.ts`) substitutes the English value for any nullish-or-empty translation at runtime. So non-English users see English copy — never blank labels — until the follow-up fills them in. This also keeps the `compare-sizes` gate light for this PR.
