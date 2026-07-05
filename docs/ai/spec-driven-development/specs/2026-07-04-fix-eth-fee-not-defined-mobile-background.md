# Spec: Fix Ethereum gas-fee loss after mobile backgrounding ("Gas fees are not defined")

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Make the Ethereum transaction-fee pipeline **self-heal** so an ETH send/approve flow never gets stuck with an unfetched fee. Today, when OISY is backgrounded on mobile during an ETH send, the per-flow fee store can end up — and _stay_ — `undefined`, because nothing ever re-fetches it. Depending on which send path the user is on, that surfaces as either a **"Gas fees are not defined"** error toast (WalletConnect and AI-assistant paths) or a **permanently disabled Send button** (standard send review). Desktop is unaffected.

Source: user bug report.

> "We are sometimes hitting a 'Gas fees are not defined' error when sending an ETH tx on mobile (desktops fine). I suspect it might be that the fee isn't refetching while the OISY tab is on hold in the background. Is this something you have seen before?"

The reporter's instinct is correct — it is a fee-refresh problem tied to backgrounding — with one important nuance the fix has to account for (see [Manifestation differs by send path](#manifestation-differs-by-send-path)).

---

## Background

### What "Gas fees are not defined" actually means

The Send flow's fee store starts as `undefined` and is **only ever populated by a _successful_ fetch** — there is no code path that resets it to null:

- `src/frontend/src/eth/stores/eth-fee.store.ts:14` — `writable<FeeStoreData>(undefined)`.
- `src/frontend/src/eth/stores/eth-fee.store.ts:19-22` — `setFee` only ever `set`s a defined `TransactionFeeData` object.

So a _stale_ fee is still a non-null object and passes every null check. Hitting "Gas fees are not defined" specifically means **no fetch ever succeeded for that open flow** — not that an existing fee went out of date.

### How the fee is fetched and refreshed

A fresh fee store is created per send flow (`initEthFeeStore()`), wrapped by `EthFeeContext.svelte`, and (re)populated only by these triggers:

1. An initial debounced fetch on mount / when `observe` becomes true — `src/frontend/src/eth/components/fee/EthFeeContext.svelte:333-335` (`onMount`) and `:300-331` / `:348-352` (`obverseFeeData` via the `observe` effect).
2. Throttled events from an Alchemy **WebSocket** "mined transactions" listener — max once per `ETH_FEE_DATA_LISTENER_DELAY` (10 s, `src/frontend/src/eth/constants/eth.constants.ts:3`); wired at `EthFeeContext.svelte:301-310` and `:326-330`.
3. `ckEthMinterInfo` store changes — `EthFeeContext.svelte:354-360`.
4. An imperative `triggerUpdateFee()` for consumers — `EthFeeContext.svelte:365` (used by the stake / swap / liquidium wizards on input; **the standard send flow does not wire it to amount/destination edits**).

The actual fetch (`updateFeeData`, `EthFeeContext.svelte:91`) is a chain of **HTTP RPC** calls to Infura — `getEthFeeDataWithProvider` (`src/frontend/src/eth/services/fee.services.ts:122`, `getFeeData` + suggested fee) plus `safeEstimateGas` — all inside a single `try/catch`.

### The gaps (root cause)

The pipeline has **no recovery mechanism** anywhere:

- **No retry on failure.** On any thrown call, the `catch` shows a _"Cannot fetch gas fee"_ toast (`EthFeeContext.svelte:276-285`, `$i18n.fee.error.cannot_fetch_gas_fee`) and leaves the store untouched. If the store was never set, it stays `undefined`. Nothing schedules a retry.
- **No WebSocket reconnect.** `subscribeAlchemyWs` (`src/frontend/src/eth/providers/alchemy.providers.ts:91`) opens a raw socket (`:100`) with `open`/`message` handlers only — **no `onclose`/`onerror`** (`:138-139`). Once the socket drops, trigger (2) is dead for the rest of the flow; `disconnect()` (`:143-156`) is only ever called intentionally.
- **No visibility / foreground refetch.** The app uses `visibilitychange` in a couple of places (`VipQrCodeModal.svelte:119`, `LoaderActiveUserTransactions.svelte`) but **not** for fees. Returning OISY to the foreground triggers nothing.
- **No polling.** There is no `setInterval` fee refresh anywhere in `src/frontend/src/eth`.

So the _only_ reliable population is the initial mount fetch. If it fails or is interrupted, the fee is stuck `undefined` for the life of that flow, and the user's only recovery is to close and reopen the flow (fresh mount → fresh fetch).

### Why it's mobile-only

On mobile, backgrounding the tab/PWA (app switch, screen lock, an incoming call/notification — and, for WalletConnect, the _inherent_ bouncing between the dApp and OISY) freezes JS, tears down the WebSocket, and the cellular radio makes the Infura HTTP calls far more likely to fail or be interrupted. Combined with "no recovery," the initial fetch fails and never heals.

On desktop the network is stable, the socket typically survives backgrounding, and timers are only throttled (not frozen) — so the initial fetch essentially always lands and stays populated. That asymmetry matches "desktops fine" exactly.

### Manifestation differs by send path

This is the nuance the reporter's mental model misses, and it is why the same root cause looks like two different bugs. **All three ETH send paths consume the same `EthFeeContext` / `feeStore`**, but they treat a null fee differently:

| Path              | Fee source                                                                                                                  | Null-fee behavior                                                                      | Reference                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Standard send** | `EthFeeContext` in `EthSendTokenWizard.svelte`                                                                              | Send button **disabled** (guarded since 2025-01) — no toast; button just never enables | `EthSendReview.svelte:32-37` (`isNullish($storeFeeData)` in `invalid`) → `SendReview.svelte:94` → native `disabled` in `Button.svelte:72` |
| **WalletConnect** | `EthFeeContext` in `EthWalletConnectSendTokenModal.svelte` (`:68`, `:187`); passes `fee: $feeStore` (`:162`) to the service | **"Gas fees are not defined" toast** on approve — approve action is not fee-gated      | `wallet-connect.services.ts:126-131`                                                                                                      |
| **AI assistant**  | `EthFeeContext` in `AiAssistantReviewSendEthToken.svelte` (`:275`, `observe={!loading}`)                                    | **"Gas fees are not defined" toast** — the `invalid` guard omits the fee check         | `AiAssistantReviewSendEthToken.svelte:151-157` (no fee) and `:188-193` (toast)                                                            |

Because the reporter is seeing the **toast** (per the screenshot), they are on the **WalletConnect** or **AI-assistant** path — the standard flow would instead show a stuck-disabled Send button. The WalletConnect path is the strongest fit for "the OISY tab is on hold in the background" on mobile: approving a dApp transaction inherently backgrounds OISY. (See [Open questions](#open-questions-facts-to-confirm) — confirming the exact flow does **not** block the central fix, which is shared.)

The disabled-button guard on the standard flow is not a real fix — it converts "error on tap" into "Send silently never enables," which on mobile is arguably worse (no explanation). The genuine fix is to make the fee **recover**, which helps every path at once.

### How to confirm (cheap diagnostics for the reporter)

- Did they also see a **"Cannot fetch gas fee"** toast earlier (before/at the moment they backgrounded)? That is the same failure at fetch time.
- Does **closing and reopening** the send/approve flow clear it every time? If yes, that confirms the stuck-null-store-with-no-retry path.
- Which flow: a **WalletConnect** dApp approval, the **AI assistant**, or the normal **Send** button? (The normal Send button would appear greyed-out rather than throwing the toast.)

---

## Options considered

Presented most-central first. The root cause lives in `EthFeeContext.svelte` (+ the shared WS helper), so the highest-leverage options are the ones that make that component recover.

### Option 1 — Refetch the fee when OISY returns to the foreground _(recommended — core)_

Add a `visibilitychange` handler to `EthFeeContext.svelte` that, when the document becomes visible again while `observe` is true and the component is not destroyed, re-runs `obverseFeeData()` — which reconnects the (dead) listener **and** triggers a fresh `debounceUpdateFeeData()`. Directly targets the reporter's scenario ("tab on hold in the background"): the moment they come back to OISY, the fee re-fetches and the listener is live again.

- Pro: smallest change that fixes the reported case; reuses the existing `obverseFeeData` (disconnect → refetch → reconnect); mirrors an established idiom (`VipQrCodeModal.svelte:119`).
- Con: only heals on foreground return — a fetch that fails _while foregrounded_ (flaky radio) still needs Option 2.

### Option 2 — Retry a failed fetch with backoff _(recommended — core)_

In `updateFeeData`'s `catch` (`EthFeeContext.svelte:276-285`), after the toast, schedule a bounded retry (`debounceUpdateFeeData()` after an exponential backoff, capped attempts) when `!isDestroyed && observe`. Reset the attempt counter on the next successful `setFee`; clear the timer in `onDestroy`.

- Pro: makes a transient mobile failure self-heal without user action; complements Option 1 for the foregrounded-but-flaky case.
- Con: needs care to cancel on destroy/success and to not stack timers with the debounce; retry params to be chosen.

### Option 3 — Reconnect the Alchemy WebSocket on drop _(recommended — restores live refresh)_

Give `subscribeAlchemyWs` (`alchemy.providers.ts:91`) `close`/`error` handlers that reconnect with backoff (recreate socket, re-add listeners, re-subscribe) unless `disconnect()` was called intentionally (track a `closedByCaller` flag).

- Pro: restores trigger (2) after a mid-session socket drop, so the fee keeps refreshing (staleness) even without a foreground event; benefits every consumer of this helper (pending-tx listeners too).
- Con: **larger blast radius** — the helper is shared; must verify no double-subscription and that intentional `disconnect()` never reconnects. Slightly more than the reported bug strictly needs (Option 1 already reconnects the fee listener on foreground return).

### Option 4 — Add the missing null-fee guard to the unguarded consumers _(recommended — cheap defense-in-depth)_

Match the standard flow: add `isNullish($feeStore)` to the AI-assistant `invalid` derived (`AiAssistantReviewSendEthToken.svelte:151-157`) so its confirm button disables while the fee is unresolved. For WalletConnect, optionally surface fee state / disable **Approve** until the fee resolves (bigger UX change — see [Pending decisions](#pending-decisions-facts-are-clear--decide)).

- Pro: eliminates the residual race where a user acts in the brief window before the (now self-healing) fee lands; makes behavior consistent across paths.
- Con: a guard, not a cure — without Options 1–3 it would just move the AI-assistant symptom to "stuck disabled" too. Only worthwhile _on top of_ the recovery fix.

### Option 5 — Poll the fee on an interval while foregrounded _(not recommended)_

A `setInterval` refetch while the flow is open and visible.

- Con: extra RPC load, redundant with Options 1–3, and mobile throttles background timers anyway. Listed for completeness; do not implement unless 1–3 prove insufficient.

---

## Recommended scope

Implement **Options 1 + 2 + 4** as the fix:

- **1 + 2** cure the root cause centrally in `EthFeeContext.svelte`, so _all three_ paths recover (foreground return re-fetches; transient failures retry).
- **4** adds a consistent guard so no path can act on a not-yet-resolved fee during the brief load window.

Treat **Option 3** as recommended-if-low-risk (it restores live refresh and helps other listeners) but gate it on the shared-helper review — it can land as a fast-follow if the blast-radius check isn't comfortable in this PR. Do **not** implement Option 5.

**Decision (2026-07-04):** full scope approved — Options 1–4 **including** WalletConnect approve-gating (Option 4b) — delivered as a stack of four small PRs so the safe core can ship independently of the WS (Option 3) and WC (Option 4b) parts. Option 5 remains out. See [Delivery plan](#delivery-plan--4-stacked-prs).

## Delivery plan — 4 stacked PRs

Each PR is stacked on the previous; the safe core is the base so the WS/WC parts can be held or reverted without blocking it.

| PR    | Title                                                                                      | Option(s) | Files                                                                                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1** | `fix(frontend): recover Ethereum gas fee after backgrounding (foreground refetch + retry)` | 1 + 2     | `EthFeeContext.svelte`, `eth.constants.ts`, `EthFeeContext.spec.ts`, `PRODUCT.md`, this spec                                                                                                                       |
| **2** | `fix(frontend): disable AI-assistant ETH send until gas fee resolves`                      | 4a        | `AiAssistantReviewSendEthToken.svelte` (+ spec)                                                                                                                                                                    |
| **3** | `fix(frontend): reconnect Alchemy fee WebSocket after drop`                                | 3         | `alchemy.providers.ts` (+ spec)                                                                                                                                                                                    |
| **4** | `fix(frontend): gate WalletConnect ETH approve on resolved gas fee`                        | 4b        | `EthWalletConnectSendTokenModal.svelte`, `EthWalletConnectSendReview.svelte`, `WalletConnectActions.svelte` (shared — additive optional prop, all 6 call sites verified), new `EthWalletConnectSendReview.spec.ts` |

Retry policy (PR 1): base delay 2 s, exponential backoff, cap 30 s, max 5 attempts (`ETH_FEE_RETRY_*` in `eth.constants.ts`).

---

## Changes

All references are against `origin/main` at spec time; re-confirm line numbers when implementing.

### 1. `src/frontend/src/eth/components/fee/EthFeeContext.svelte` — foreground refetch + listener reconnect (Option 1)

- Add a document visibility handler that, when the page becomes visible (`!document.hidden`), `observe` is true, and `!isDestroyed`, calls `obverseFeeData()`. `obverseFeeData` (`:300-331`) already disconnects any stale listener, re-triggers `debounceUpdateFeeData()`, and re-`initMinedTransactionsListener`s, so a single call restores both the fee value and the live listener.
- Wire it with `<svelte:document onvisibilitychange={...} />` (idiom at `VipQrCodeModal.svelte:119`) rather than a manual `addEventListener`, so teardown is automatic.
- Guard against redundant work when already visible / not observing.

### 2. `src/frontend/src/eth/components/fee/EthFeeContext.svelte` — retry on failure (Option 2)

- Introduce a `retryTimer` (`$state`) and an attempt counter.
- In the `catch` (`:276-285`), after `toastsError(...)`, if `!isDestroyed && observe && attempts < MAX`, `setTimeout` a `debounceUpdateFeeData()` with exponential backoff (e.g. base 2 s, cap ~30 s), incrementing the counter.
- On a successful `setFee` (each success branch of `updateFeeData`), reset the counter and clear any pending `retryTimer`.
- In `onDestroy` (`:337-342`), `clearTimeout(retryTimer)`.
- Keep the existing `isDestroyed` / `sendToken` / `$ethAddress` guards at the top of `updateFeeData` (`:95`) — the retry must not fire post-destroy.

### 3. `src/frontend/src/eth/providers/alchemy.providers.ts` — WebSocket reconnect (Option 3, if in scope)

- In `subscribeAlchemyWs` (`:91`), extract socket setup so it can re-run, add `close`/`error` listeners that reconnect with capped backoff, and track a `closedByCaller` flag set in `disconnect()` (`:143-156`) so intentional teardown never reconnects.
- Re-issue the `eth_subscribe` on each (re)open (`onOpen`, `:111`) and reset `subscriptionId`.
- **Verify** the other callers of this helper (mined-tx / pending-tx listeners) tolerate reconnect without duplicate subscriptions before landing.

### 4. `src/frontend/src/lib/components/ai-assistant/AiAssistantReviewSendEthToken.svelte` — add null-fee guard (Option 4)

- Add `|| isNullish($feeStore)` to the `invalid` derived (`:151-157`), matching `EthSendReview.svelte:36`, so the confirm button disables until the fee resolves. The service-level null check at `:188-193` stays as the belt-and-suspenders fallback.
- WalletConnect approve-gating (optional): decide per [Pending decisions](#pending-decisions-facts-are-clear--decide).

---

## Tests (regression + coverage)

Follow the existing fee-context test patterns under `src/frontend/src/tests/`.

- **EthFeeContext — foreground refetch (Option 1).** Mount with `observe=true`, let the initial fetch resolve, spy on the fetch; dispatch a `visibilitychange` with `document.hidden=false` and assert a refetch + listener re-init occurred; assert no refetch when `observe=false` or when `document.hidden=true`.
- **EthFeeContext — retry on failure (Option 2).** Make `getEthFeeDataWithProvider` reject once then resolve; with fake timers, assert the store is `undefined` after the first failure, that a retry is scheduled with backoff, and that the store is populated after the retry resolves; assert the retry timer is cleared on destroy and does not fire post-destroy; assert the attempt counter resets after success.
- **subscribeAlchemyWs — reconnect (Option 3, if in scope).** Simulate a `close` not initiated by `disconnect()` and assert a new socket + re-`eth_subscribe`; simulate `disconnect()` and assert no reconnect.
- **AI assistant guard (Option 4).** Assert the confirm button is disabled while `$feeStore` is nullish and enabled once set.
- Sweep existing `EthFeeContext` / send-wizard specs for assumptions the new timers/handlers break.

**Gates (from `CLAUDE.md`, frontend-only change):**

```bash
npm run format
npm run lint -- --max-warnings 0
npm run check
npm run test
```

(Frontend only — no backend/candid/`generate` steps.)

---

## PRODUCT.md

`docs/ai/PRODUCT.md` has no Ethereum-send section today. Per the workflow, update it **in the same PR** as the behavior change. Add a concise, product-altitude subsection (e.g. under a new `## Ethereum` heading) describing how the network fee is presented during an ETH send: the fee is fetched when the send/approve flow opens and kept current while it is open, and the flow **recovers the fee automatically** when the wallet returns to the foreground or after a transient network failure, so a send is not left unable to proceed. Keep an explicit negative guarantee — a transaction is never submitted without a resolved fee — so a future reader can tell intent from omission. No component/prop/Tailwind detail — that lives in the code.

---

## PR conventions (`docs/ai/pr-and-ci.md`)

- **Title:** `fix(frontend): recover Ethereum gas fee after mobile backgrounding` (allowed type `fix`; describe the variant precisely — this is the ETH send/WalletConnect/AI-assistant fee path, not a generic gas change).
- **Body:** use the repo template headers `# Motivation`, `# Changes`, `# Tests`. Reference the user report in prose. **No Jira / Atlassian links** (CI rejects them; reference any issue key as plain text only).
- **Draft PR** (`--draft`).
- If the implementation deviates from this spec, add a short **"Divergence from the spec"** section to the PR body and update this spec in the same PR (Step 5 — Adjust).
- Include the Claude model name + version in the PR description footer.
- Do not bump versions.

---

## Out of scope

- The **fee amount / estimation math** (`getEthFeeDataWithProvider`, `getErc20FeeData`, gas floors) — unchanged; this is purely about fetch resilience and recovery.
- **Non-ETH fee flows** (BTC, ICP) — different pipelines.
- A general app-wide "network resiliency" layer — this spec scopes to the ETH fee context and its WS helper.
- **Option 5** (interval polling).

---

## Open questions (facts to confirm)

- **Which flow did the reporter hit** — WalletConnect approval, AI assistant, or standard Send? The screenshot shows the _toast_, which points to WalletConnect/AI-assistant (standard would show a disabled button). This does **not** block the central fix (shared `EthFeeContext`), but confirms the primary reproduction and whether the WalletConnect approve-gating (Option 4) is worth including.
- **Exact mobile freeze/socket behavior** on the reporter's device/browser (iOS Safari vs Android Chrome vs in-app browser) — informs retry/backoff tuning but not the design.

## Pending decisions (facts are clear — we just need to decide)

_All resolved on 2026-07-04 — see [Delivery plan](#delivery-plan--4-stacked-prs)._

- **Include Option 3 (WebSocket reconnect)?** ✅ Yes, as its own PR (PR 3), isolated so it can be held/reverted independently of the core.
- **WalletConnect approve-gating (the WC half of Option 4)?** ✅ Yes, as PR 4 — disable the Approve action until the fee resolves, via an additive optional prop on the shared `WalletConnectActions` (all 6 call sites verified).
- **Retry policy for Option 2:** ✅ base 2 s, exponential backoff, cap 30 s, max 5 attempts.

---

## Acceptance criteria

- [ ] After OISY is backgrounded and returns to the foreground during an ETH send/approve flow with `observe` active, the fee is re-fetched and the mined-transactions listener is live again (Option 1), verified by a test.
- [ ] A transient fee-fetch failure is retried automatically with backoff and self-heals without user action; retries are bounded, reset on success, and cancelled on destroy (Option 2), verified by a test.
- [ ] The AI-assistant ETH review disables its confirm action while the fee is nullish, matching the standard send review (Option 4).
- [ ] (If in scope) `subscribeAlchemyWs` reconnects after an unintended socket drop and does not reconnect after an intentional `disconnect()`; no duplicate subscriptions for other callers (Option 3).
- [ ] No change to computed fee amounts; the standard/WalletConnect/AI-assistant paths still block submission when no fee is resolved.
- [ ] `docs/ai/PRODUCT.md` gains a concise Ethereum-send-fee description (fetch + auto-recovery + the "never submit without a resolved fee" guarantee) in the same PR.
- [ ] All frontend gates pass (`format` / `lint --max-warnings 0` / `check` / `test`).

---

## After implementation — Step 6 — Review (Cowork)

Per `docs/ai/spec-driven-development/workflow.md`, once the PR is open bring the diff back for **Step 6 — Review (Cowork)**: walk these acceptance criteria against the diff, confirm the negative guarantee (no path submits without a resolved fee) still holds across all three send paths, probe edge cases (visibility toggling while `observe=false`, retry vs. debounce interaction, intentional `disconnect()` not reconnecting), and check `PRODUCT.md` and this spec still match what shipped before merge.
