This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec — Allow multiple simultaneous WalletConnect connections

- **Improvement:** Let a user keep several WalletConnect (Reown WalletKit) dApp connections open at once, instead of the current one-at-a-time limit.
- **Status:** Draft for implementation in Claude Code

---

## 1. Motivation

Today a user can only have **one** WalletConnect connection open at a time.
Connecting to a second dApp silently drops the first, and the "Connected Apps"
list — which already renders as a list and offers a per-row close button — can in
practice only ever show one entry, and closing it tears down everything.

This is an app-layer restriction, not a library one. Reown WalletKit is a
singleton (`globalWalletKit` in
`src/frontend/src/lib/providers/wallet-connect.providers.ts`) and natively
supports many concurrent sessions — `getActiveSessions()` already returns a
`Record<string, SessionTypes.Struct>` keyed by topic. OISY's own code is what
collapses everything to a single connection. We want users to connect, say,
Uniswap and Liquidium simultaneously and manage each independently.

## 2. Scope

Remove the three app-layer choke points that force a single connection, make the
"Connected Apps" list update reactively, and make the per-row close button
disconnect **only** that one app.

### In scope

1. Connecting a new dApp must **not** disconnect already-connected dApps.
2. Per-session disconnect — the close button on a row in the sessions modal
   disconnects only that session (topic), leaving the others connected.
3. A single dApp ending its session (WalletKit `session_delete`) must remove only
   that one session, not tear down the whole listener while others remain.
4. The "Connected Apps" list reflects add/remove of sessions reactively.
5. Incoming sign/send requests continue to route to the correct session (by
   topic) across all open connections.
6. A "Disconnect all" control in the sessions modal tears down every
   connection at once (preserving today's one-tap teardown).

### Out of scope

- **Concurrent request handling.** The existing guard in `onSessionRequest`
  (`src/frontend/src/lib/services/wallet-connect-handlers.services.ts`) that
  skips a new request while another review modal is open is **kept as-is**. With
  multiple connections, requests from different dApps are still handled one at a
  time (the second is rejected with the existing "skipping request" toast). A
  proper request queue is a possible fast-follow, not part of this change.
- **Concurrent session proposals.** Proposals are still reviewed one at a time
  via the single `walletConnectProposalStore`. The user adds connections
  sequentially (scan/paste → review → approve, then repeat). No change to the
  proposal/review flow.
- Any change to the per-chain namespace building (`eip155` / `solana` / `bip122`)
  — multi-connection is orthogonal to which chains a session spans.
- The reconnect-after-refresh path already supports multiple persisted sessions
  (see §3.4); no behavioural change intended there beyond what falls out of the
  shared helpers.

## 3. Background — why it is single-connection today

The relevant pieces:

- **Provider:** `src/frontend/src/lib/providers/wallet-connect.providers.ts`
  (`WalletConnectClient`, the `globalWalletKit` singleton, `disconnect`,
  `#disconnectActiveSessions`, `getActiveSessions`).
- **Services:** `src/frontend/src/lib/services/wallet-connect.services.ts`
  (`connectListener`, `initListener`, `disconnectListener`, `resetListener`).
- **Handlers:** `src/frontend/src/lib/services/wallet-connect-handlers.services.ts`
  (`onSessionDelete`, `onSessionRequest`).
- **Store:** `src/frontend/src/lib/stores/wallet-connect.store.ts`
  (`walletConnectListenerStore`, `walletConnectProposalStore`).
- **UI:** `src/frontend/src/lib/components/wallet-connect/WalletConnectSessionsModal.svelte`
  (the "Connected Apps" list) and `WalletConnectSession.svelte` (the
  reconnect/lifecycle component).

There are **three** distinct choke points, each of which must be addressed:

### 3.1 Connecting a new dApp destroys the current one

`connectListener` → `initListener()` begins with `await disconnectListener()`,
then calls `WalletConnectClient.init({ … })` with the **default `cleanSlate:
true`**, whose `#disconnectActiveSessions()` disconnects every active session.
So pairing connection #2 wipes connection #1 twice over (once via
`disconnectListener`, once via `cleanSlate`).

### 3.2 One `session_delete` resets the whole listener

When a dApp ends its session, WalletKit fires `session_delete` (for a single
topic). The `onSessionDelete` callbacks wired in `connectListener` and
`WalletConnectSession.svelte` call `resetListener()`, which sets the listener
store to `undefined` — tearing down the subsystem for **all** sessions even if
others are still live.

### 3.3 The per-row close button is all-or-nothing

In `WalletConnectSessionsModal.svelte` the list already iterates
`Object.values(listener.getActiveSessions())`, but every row's close button calls
the same `disconnect()` → `disconnectListener()` → provider `disconnect()`, which
disconnects **all** sessions **and** all pairings. There is no per-topic
disconnect on the `WalletConnectListener` interface
(`src/frontend/src/lib/types/wallet-connect.ts`).

### 3.4 What already works (do not regress)

The reconnect path in `WalletConnectSession.svelte` (`reconnect()`) already uses
`cleanSlate: false` and keeps the listener whenever `getActiveSessions()` is
non-empty. So **restoring multiple persisted sessions after a refresh already
works** — only the _active add_ (§3.1) and _per-session remove_ (§3.2, §3.3)
force the single-connection behaviour. The fix should converge the "add" path
onto the same multi-session-friendly assumptions the reconnect path already
makes.

## 4. Implementation plan

> Follow `AGENTS.md` + `CLAUDE.md`: read each file before editing, reuse over
> rebuild, no new top-level folders, no new deps, run the quality gates before
> declaring done. Targeted edits only.

### 4.1 Provider — add a per-session disconnect

In `WalletConnectClient` (and the abstract `WalletConnectListener` in
`src/frontend/src/lib/types/wallet-connect.ts`), add:

```ts
abstract disconnectSession(topic: string): Promise<void>;
```

Implement it in the provider by calling the WalletKit method the existing
all-sessions teardown already uses, scoped to one topic:

```ts
disconnectSession = async (topic: string) =>
	await this.#walletKit.disconnectSession({
		topic,
		reason: getSdkError('USER_DISCONNECTED')
	});
```

Keep the existing `disconnect()` (all sessions + pairings) — it is still the
right behaviour for full teardown (sign-out, `oisyDisconnectWalletConnect`
window event). This change only **adds** a narrower option.

### 4.2 Reuse the existing listener when adding a connection

Rework `initListener` in
`src/frontend/src/lib/services/wallet-connect.services.ts` so that adding a
connection does not destroy existing ones:

- If a listener already exists in `walletConnectListenerStore`, **reuse it** —
  do not call `disconnectListener()`, do not re-init. Handlers are already
  attached (handlers live on the singleton WalletKit emitter), so the existing
  listener can pair the new URI directly. Return the existing listener.
- If no listener exists, create one with **`cleanSlate: false`** (not the
  current default `true`) so any sessions persisted from a previous tab/refresh
  survive, mirroring `reconnect()`.

`connectListener` then calls `pair(uri)` on the returned listener as it does
today. Because the listener is reused, `attachHandlers` should not be re-run if
it is already attached (guard against double-attach, or make `attachHandlers`
idempotent — it already calls `detachHandlers()` first, so re-attaching the same
callbacks is safe; confirm during implementation).

> **Verify (see §6):** `WalletConnectClient.init` runs `clearLocalStorage()`
> (removing `wc@*` keys) **unconditionally**, independent of `cleanSlate`. The
> reconnect path tolerates this (sessions are restored from WalletKit's own
> IndexedDB store, not those keys), but since the new "add" path may now run
> `init` with `cleanSlate: false` while sessions are live, confirm this localStorage
> clear does not drop active sessions. The safest design — reusing the existing
> in-memory listener for adds (above) — avoids calling `init` at all on the add
> path, sidestepping the question; the `cleanSlate: false` change only matters
> for the cold-start case where there is no listener yet.

### 4.3 Track sessions in a reactive store

The modal currently derives `sessions` from `listener.getActiveSessions()`. With
a **persistent** listener, the listener reference no longer changes when a
session is added or removed, so the `$derived` list would go stale. Introduce a
reactive source of truth for the UI:

- Add a `walletConnectSessionsStore` (writable `SessionTypes.Struct[]` or
  `Record<string, SessionTypes.Struct>`) to
  `src/frontend/src/lib/stores/wallet-connect.store.ts`.
- Add a small `syncSessions()` helper in the services that reads
  `listener.getActiveSessions()` into the store. Call it:
  - after a successful `approveSession` (new session added),
  - after a per-session disconnect (§4.4),
  - on `session_delete` (§4.5),
  - after `reconnect()` seeds persisted sessions,
  - on `resetListener()` / `disconnectListener()` (clear it).
- `WalletConnectSessionsModal.svelte` reads `$walletConnectSessionsStore`
  instead of calling `getActiveSessions()` directly.

Consider deriving `walletConnectPaired` (in
`src/frontend/src/eth/stores/wallet-connect.store.ts`) from "listener present"
as today; whether it should instead track "≥1 session" is a minor decision —
keep current behaviour unless it causes a UI regression.

### 4.4 Service + UI — per-session disconnect

- Add `disconnectSession(topic)` to
  `src/frontend/src/lib/services/wallet-connect.services.ts`: look up the
  listener, call `listener.disconnectSession(topic)`, then `syncSessions()`. If
  no sessions remain afterwards, fall through to `disconnectListener()` so the
  subsystem is torn down cleanly when the last app is removed.
- In `WalletConnectSessionsModal.svelte`, change each row's close button to call
  `disconnectSession(session.topic)` instead of the global `disconnect()`. Show
  the existing "disconnected" toast. The list updates from
  `walletConnectSessionsStore`.
- Add a **"Disconnect all"** control to the modal toolbar
  (`ContentWithToolbar` snippet, next to the existing close button) that calls
  the global `disconnect()` path (`disconnectListener()`), shown only when ≥1
  session is connected. This preserves today's one-tap teardown alongside the
  new per-row disconnect.

### 4.5 Handlers — single `session_delete` must not tear down the rest

In `onSessionDelete`
(`src/frontend/src/lib/services/wallet-connect-handlers.services.ts`) and its
callbacks in `connectListener` / `WalletConnectSession.svelte`: after a delete,
call `syncSessions()` and only `resetListener()` when **no** sessions remain.
WalletKit's `session_delete` payload carries the deleted `topic`; thread it
through if helpful, or simply re-query `getActiveSessions()` to decide. Keep the
"session ended" toast.

### 4.6 i18n

Existing strings (`wallet_connect.info.disconnected`,
`wallet_connect.info.session_ended`) cover the per-session case. Add one new
string for the "Disconnect all" button label (e.g.
`wallet_connect.text.disconnect_all`). No other copy changes expected.

## 5. Acceptance criteria

1. With one dApp connected, connecting a second dApp leaves the first connected;
   the "Connected Apps" list shows **both**.
2. Each row's close button disconnects **only** that app; the others stay
   connected and the list updates immediately (no modal reopen needed).
3. When a connected dApp ends its session from its side, only that entry
   disappears; other connections keep working.
4. Disconnecting the **last** remaining app tears down the subsystem cleanly
   (listener reset, `walletConnectPaired` false), with no leftover pairings.
   The "Disconnect all" control does the same in one tap regardless of how many
   apps are connected.
5. Sign/send requests from any open connection route to and respond on the
   correct session (correct topic).
6. After a page refresh, all previously open sessions are restored (existing
   reconnect behaviour, now ≥1, unchanged).
7. Sign-out / the `oisyDisconnectWalletConnect` window event still disconnects
   **all** sessions and pairings.
8. EVM, Solana, and BTC single-connection flows are unchanged
   (regression-safe).
9. Quality gates pass: `npm run format`, `npm run lint -- --max-warnings 0`,
   `npm run check`, `npm run test`.

## 6. Open questions (facts to confirm)

1. **`clearLocalStorage()` vs. live sessions.** Confirm that
   `WalletConnectClient.init`'s unconditional `wc@*` localStorage purge does not
   drop active/persisted sessions when run with `cleanSlate: false` while a
   connection is live. The recommended design (reuse the in-memory listener for
   adds, §4.2) avoids re-`init` on the add path, but verify the cold-start case.
2. **`attachHandlers` idempotency on reuse.** Confirm re-pairing on an existing
   listener does not require re-attaching handlers, and that `attachHandlers`'s
   `detachHandlers()`-first behaviour makes any re-attach safe.
3. **`session_delete` topic availability.** Confirm the WalletKit
   `session_delete` event payload exposes the `topic` so removal can be precise
   rather than a full re-query (re-query is an acceptable fallback).
4. **Per-session event emission.** `#emitInitialBtcAddresses` already iterates
   all active sessions; confirm emitting on approval of connection #2 does not
   adversely re-emit to connection #1 (it is idempotent for OISY's static
   address — noted in code — but worth a glance with multiple live sessions).

## 7. Resolved decisions

1. **Global "Disconnect all" control — yes, add it.** Surface an explicit
   "Disconnect all" button in the sessions modal toolbar (one new i18n string),
   alongside the per-row disconnect. Preserves today's one-tap teardown. See
   §4.4 / §4.6 and acceptance criterion 4.
2. **`walletConnectPaired` semantics — keep current ("listener present").** Do
   not switch to "≥1 active session" for v1 unless QA surfaces a stale indicator
   state.
3. **Concurrent request UX — keep the "skip while busy" guard for v1.** Handling
   one request at a time matches normal user behaviour; a proper request queue is
   a tracked fast-follow (remains out of scope here — see §2).

## 8. Testing

Mirror and extend existing suites:

- `src/frontend/src/tests/lib/providers/wallet-connect.providers.spec.ts` — new
  `disconnectSession(topic)` disconnects only that topic; `init` with existing
  sessions (cleanSlate false) does not disconnect them.
- `src/frontend/src/tests/lib/services/wallet-connect.services.spec.ts` —
  `initListener` reuses an existing listener instead of tearing it down; new
  `disconnectSession` service path; `syncSessions` updates the store; last-app
  disconnect falls through to full teardown.
- `src/frontend/src/tests/lib/stores/wallet-connect.store.spec.ts` — new
  sessions store.
- `src/frontend/src/tests/lib/components/wallet-connect/WalletConnectSessionsModal.spec.ts`
  — multiple sessions render; per-row close disconnects only that topic; list
  updates reactively from the sessions store.
- Manual E2E: connect two dApps (e.g. the Reown sample dApp + a real DEX),
  confirm both work, close one, confirm the other still signs; refresh and
  confirm both restore.

## 9. Post-merge

Update `docs/ai/PRODUCT.md` (the **WalletConnect** section) in the same PR: the
current text says "a single connection can span Ethereum, Solana, and Bitcoin at
once" — extend it to state that **multiple** simultaneous dApp connections are
supported, each independently manageable from the Connected Apps list, per the
spec-driven workflow's Step 4 — Build (Claude Code).
