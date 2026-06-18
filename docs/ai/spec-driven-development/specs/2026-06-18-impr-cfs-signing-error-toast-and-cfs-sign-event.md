This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Friendly toast for chain-fusion-signer outages + `cfs_sign` Plausible event

## Goal

Two related improvements triggered by a support incident:

1. **User-facing:** When the chain-fusion signer cannot sign because the OISY backend
   is out of TCycles on the cycles ledger, users currently see a raw, scary toast.
   Replace it with a calm, generic message: we're temporarily unable to sign Bitcoin,
   Ethereum and Solana transactions and messages, we're aware of it, and a fix is coming.
   This affects **every** signing operation — sends, WalletConnect personal_sign / eth_sign,
   EIP-2612 permits, swaps — not just sends.
2. **Observability:** Emit a `cfs_sign` Plausible event for **every paid chain-fusion-signer
   call** (success and error), carrying the called signer method and — for the cycles
   outage — `result_error_severity = blocker`, so this class of incident is visible on
   dashboards before support tickets arrive.

---

## Background

### What actually happened

All users hit the toast below when sending EVM tokens or BTC:

> Something went wrong while sending the transaction. / Ledger error: {"InsufficientFunds":{"balance":"45738950"}}

The `InsufficientFunds` balance (`45738950` ≈ 0.046 TC) is **not** the user's token
balance. It is the OISY **backend's** TCycles balance on the cycles ledger. Every
chain-fusion-signer call is made with a payment attached (`SIGNER_PAYMENT_TYPE`), so the
signer first pulls cycles from OISY's backend account. When that account runs dry, the
signer canister returns a `PaymentError`, the send fails for everyone, and the raw ledger
error leaks into the toast.

### The exact error path (verified in code)

1. A send calls a signer method via `src/frontend/src/lib/api/signer.api.ts`
   (e.g. `signTransaction`, `signBtc`, `sendBtc`, `signWithSchnorr`, `genericSignWithEcdsa`).
2. `src/frontend/src/lib/canisters/signer.canister.ts` calls the canister method with
   `[SIGNER_PAYMENT_TYPE]`. On failure it throws via the mappers in
   `src/frontend/src/lib/canisters/signer.errors.ts`.
3. The cycles outage surfaces as `PaymentError` → `LedgerTransferFromError` /
   `LedgerWithdrawFromError` / `InsufficientFunds`, mapped by `SignerCanisterPaymentError`
   (in `signer.errors.ts`) to a message starting `Ledger error: …`.
4. The send wizard's `catch` calls
   `toastsError({ msg: { text: $i18n.send.error.unexpected }, err })`.
5. `toastsError` in `src/frontend/src/lib/stores/toasts.store.ts` appends
   `/ ${errorDetailToString(err)}` — producing the exact toast above.

### Relevant files (verified)

| Concern                                                     | File                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Signer API chokepoint (all paid calls pass through)         | `src/frontend/src/lib/api/signer.api.ts`                                       |
| Canister wrapper + payment attached                         | `src/frontend/src/lib/canisters/signer.canister.ts`                            |
| Error mapping (`SignerCanisterPaymentError`)                | `src/frontend/src/lib/canisters/signer.errors.ts`                              |
| Toast helper that appends the raw error                     | `src/frontend/src/lib/stores/toasts.store.ts`                                  |
| Plausible `trackEvent()` + helpers                          | `src/frontend/src/lib/services/analytics.services.ts`                          |
| Plausible enums                                             | `src/frontend/src/lib/enums/plausible.ts`                                      |
| String event constants                                      | `src/frontend/src/lib/constants/analytics.constants.ts`                        |
| `TrackEventParams` type (`metadata: Record<string,string>`) | `src/frontend/src/lib/types/analytics.ts`                                      |
| i18n source of truth                                        | `src/frontend/src/lib/i18n/en.json` (`send.error.*`)                           |
| ETH send wizard catch                                       | `src/frontend/src/eth/components/send/EthSendTokenWizard.svelte` (≈L234, L334) |
| BTC send wizard catch                                       | `src/frontend/src/btc/components/send/BtcSendTokenWizard.svelte` (≈L190)       |
| SOL send wizard catch                                       | `src/frontend/src/sol/components/send/SolSendTokenWizard.svelte` (≈L224)       |

---

## Scope decisions (from PM)

- **Toast scope:** the friendly message replaces the toast **only** for
  `SignerCanisterPaymentError` (the cycles/payment outage). Genuine user errors —
  invalid address, insufficient _token_ balance, gas issues — keep their existing,
  specific toasts. _(Default chosen during clarification; easy to widen to "any signer
  signing failure" later by broadening the guard.)_
- **Not send-specific:** the payment outage surfaces on every paid signer call, including
  message signing (`eth_personal_sign` / `eth_sign_prehash`), not just sends. So the
  message and i18n key are **generic** (not under `send.*`) and the toast helper is wired
  into the message-signing / WalletConnect / permit / swap catch sites as well as the
  three send wizards.
- **Event coverage:** `cfs_sign` fires for **all paid signer calls** — including the
  address/balance reads, which also pay cycles and hit the same blocker — not just the
  signing operations.
- **Method name:** the called signer method is recorded as a property on every
  `cfs_sign` event (so dashboards can break the outage down by method).
- **Severity:** `result_error_severity = blocker` for the cycles/payment error;
  `critical` for any other signer error. _(Default chosen during clarification.)_

---

## Part A — Friendly toast for signer cycles outages

### A1. Add a type guard for the payment error

`SignerCanisterPaymentError` is already defined and exported in
`src/frontend/src/lib/canisters/signer.errors.ts`. Add a guard there:

```ts
export const isSignerCanisterPaymentError = (err: unknown): boolean =>
	err instanceof SignerCanisterPaymentError;
```

> Note: all four `PaymentError` variants (`UnsupportedPaymentType`, `LedgerWithdrawFromError`,
> `LedgerTransferFromError`, `LedgerUnreachable`, `InsufficientFunds`) indicate OISY's
> backend cannot pay for signing — all are treated as the signer-unavailable case.

### A2. Add the i18n string

The message is reused across sends **and** message-signing flows, so it must not live
under `send.*`. Add a new top-level `sign` namespace in
`src/frontend/src/lib/i18n/en.json` dedicated to signing operations (the chain-fusion
signer), separate from the existing `signer` namespace, which is the unrelated
OISY-as-dApp-signer feature (`sign_in`, `permissions`, `consent_message`, …):

```json
"sign": {
	"error": {
		"unavailable": "We're temporarily unable to sign Bitcoin, Ethereum and Solana transactions and messages. We're aware of the issue and working on a fix. Please try again soon."
	}
}
```

> Key: `sign.error.unavailable`. A new `sign` namespace is preferred over reusing
> `signer.*` to avoid conceptual collision with the dApp-signer feature (same reasoning as
> the Plausible `cfs_sign` event name vs. the existing `signer` context).

Then regenerate types and sync locales:

```
npm run i18n:types   # regenerates src/frontend/src/lib/types/i18n.d.ts from en.json
npm run i18n:keys    # propagates the key to the other 14 locale files
```

> `en.json` is the single source of truth; the other locales (`de.json`, …) are
> auto-synced by `i18n:keys`. Do not hand-edit them.

### A3. Add a shared toast helper

The catch blocks that surface signer errors are spread across many sites (ETH/BTC/SOL
send wizards, WalletConnect review, OpenCryptoPay wizard, convert/swap/approve/nft-transfer
services, AI-assistant review components). To avoid drift and keep each change atomic,
add one helper next to the toast store (`src/frontend/src/lib/stores/toasts.store.ts`)
or in a small util it imports:

```ts
// Returns true if it handled the error by showing the friendly signer-unavailable toast.
export const toastsSignerUnavailableOr = ({
	err,
	fallback
}: {
	err: unknown;
	fallback: () => void;
}): void => {
	if (isSignerCanisterPaymentError(err)) {
		toastsError({ msg: { text: get(i18n).sign.error.unavailable } }); // no `err` → no raw ledger text
		return;
	}
	fallback();
};
```

> Deliberately omit `err` from the friendly toast so the raw `Ledger error: …` text is
> not appended. The error is still logged to the console via `toastsError`/`consoleError`
> for debugging.

### A4. Wire it into the signer-call catch sites

For the three primary send wizards, replace the existing toast call inside `catch`:

```ts
// before
toastsError({ msg: { text: $i18n.send.error.unexpected }, err });
onBack();

// after
toastsSignerUnavailableOr({
	err,
	fallback: () => toastsError({ msg: { text: $i18n.send.error.unexpected }, err })
});
onBack();
```

Sites to update (keep the existing per-flow fallback text — e.g. SOL keeps
`mapSolanaErrorMsg(err) ?? $i18n.send.error.unexpected`):

**Sends:**

- `src/frontend/src/eth/components/send/EthSendTokenWizard.svelte` (both the token send catch ≈L334 and the NFT send catch ≈L234)
- `src/frontend/src/btc/components/send/BtcSendTokenWizard.svelte` (≈L190)
- `src/frontend/src/sol/components/send/SolSendTokenWizard.svelte` (≈L224)

**Message signing / other signer flows (same payment outage applies):**

- `src/frontend/src/eth/components/wallet-connect/EthWalletConnectSignModal.svelte` — WalletConnect `personal_sign` / `eth_sign` (`signMessage`/`signPrehash` via `eth/services/wallet-connect.services.ts`)
- `src/frontend/src/eth/services/eip2612-permit.services.ts` (≈L120, `signPrehash`) — surface via the calling wizard's catch (e.g. swap/approve flows)
- `src/frontend/src/lib/services/swap.services.ts` (≈L1201, `signPrehash`) and the swap wizards (`SwapEthWizard.svelte`, etc.)
- WalletConnect review / OpenCryptoPay wizards that catch signer errors (`WalletConnectReview.svelte`, `OpenCryptoPayWizard.svelte`)

> Because the detection is centralised in `isSignerCanisterPaymentError` + the
> `toastsSignerUnavailableOr` helper, each site is a one-line swap. Audit all `catch`
> blocks that can receive a thrown `SignerCanisterPaymentError` (i.e. anything that
> ultimately calls a `signer.api.ts` function) and route them through the helper.

---

## Part B — `cfs_sign` Plausible event for all paid signer calls

### B1. Add enums

In `src/frontend/src/lib/enums/plausible.ts`:

```ts
// add to PLAUSIBLE_EVENTS
CFS_SIGN = 'cfs_sign',

// new enum — error severity per the Confluence schema
export enum PLAUSIBLE_EVENT_RESULT_SEVERITIES {
	BLOCKER = 'blocker',
	CRITICAL = 'critical',
	MAJOR = 'major',
	MINOR = 'minor'
}

// new enum — the chain-fusion-signer method name carried on each event
export enum PLAUSIBLE_EVENT_SUBCONTEXT_CFS {
	ETH_ADDRESS = 'eth_address',
	ETH_SIGN_TRANSACTION = 'eth_sign_transaction',
	ETH_SIGN_PREHASH = 'eth_sign_prehash',
	ETH_PERSONAL_SIGN = 'eth_personal_sign',
	BTC_CALLER_ADDRESS = 'btc_caller_address',
	BTC_CALLER_BALANCE = 'btc_caller_balance',
	BTC_CALLER_SIGN = 'btc_caller_sign',
	BTC_CALLER_SEND = 'btc_caller_send',
	SCHNORR_PUBLIC_KEY = 'schnorr_public_key',
	SCHNORR_SIGN = 'schnorr_sign',
	GENERIC_SIGN_WITH_ECDSA = 'generic_sign_with_ecdsa'
}
```

### B2. Event schema (per the [Plausible Events](https://dfinity.atlassian.net/wiki/spaces/OISY/pages/2534572046/Plausible+Events) Confluence page)

| Attribute                            | Value                                                                                                      |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Event**                            | `cfs_sign` (`PLAUSIBLE_EVENTS.CFS_SIGN`)                                                                   |
| `event_context`                      | `signer` (`PLAUSIBLE_EVENT_CONTEXTS.SIGNER`)                                                               |
| `event_subcontext`                   | the called signer method (`PLAUSIBLE_EVENT_SUBCONTEXT_CFS`, e.g. `eth_sign_transaction`) ← **method name** |
| `result_status`                      | `success` / `error` (`PLAUSIBLE_EVENT_RESULT_STATUSES`)                                                    |
| `result_duration_in_seconds`         | measured wall-clock duration of the call                                                                   |
| `result_duration_in_seconds_rounded` | rounded duration                                                                                           |
| `result_error`                       | mapped error message (`(err as Error).message`) — error only                                               |
| `result_error_severity`              | `blocker` if `isSignerCanisterPaymentError(err)`, else `critical` — error only                             |
| `result_error_text`                  | full raw error text — error only                                                                           |
| `token_network`                      | optional: `eth` for `eth_*`, `btc` for `btc_*`, `sol` for `schnorr_*` where unambiguous                    |

> All `metadata` values must be strings (`TrackEventParams.metadata` is
> `Record<string,string>`); convert numbers with `.toString()`.
>
> `event_context = signer` reuses the existing enum value. Note there is a pre-existing
> dApp-signer feature using `signer` context (`SIGNER_PAGE_VISIT`, `SIGNER_INTERACTION`);
> the distinct `cfs_sign` event name keeps the two separable on dashboards. If clearer
> separation is wanted, introduce a dedicated `chain_fusion_signer` context instead.

### B3. Add a tracking helper in `analytics.services.ts`

Add a `trackCfsSign` helper that builds the payload, and a `withCfsSignTracking` wrapper
that times the call and emits on both success and error:

```ts
export const trackCfsSign = ({
	method,
	status,
	durationSeconds,
	err
}: {
	method: PLAUSIBLE_EVENT_SUBCONTEXT_CFS;
	status: PLAUSIBLE_EVENT_RESULT_STATUSES;
	durationSeconds: number;
	err?: unknown;
}) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.CFS_SIGN,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.SIGNER,
			event_subcontext: method,
			result_status: status,
			result_duration_in_seconds: durationSeconds.toString(),
			result_duration_in_seconds_rounded: Math.round(durationSeconds).toString(),
			...(nonNullish(err) && {
				result_error: (err as Error).message,
				result_error_text: errorDetailToString(err),
				result_error_severity: isSignerCanisterPaymentError(err)
					? PLAUSIBLE_EVENT_RESULT_SEVERITIES.BLOCKER
					: PLAUSIBLE_EVENT_RESULT_SEVERITIES.CRITICAL
			})
		}
	});
};

export const withCfsSignTracking = async <T>(
	method: PLAUSIBLE_EVENT_SUBCONTEXT_CFS,
	fn: () => Promise<T>
): Promise<T> => {
	const start = performance.now();
	try {
		const result = await fn();
		trackCfsSign({
			method,
			status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
			durationSeconds: (performance.now() - start) / 1000
		});
		return result;
	} catch (err: unknown) {
		trackCfsSign({
			method,
			status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			durationSeconds: (performance.now() - start) / 1000,
			err
		});
		throw err; // tracking must not swallow the error
	}
};
```

> `trackEvent` is already wrapped in try/catch, so a tracking failure can never break a
> send. `withCfsSignTracking` must always re-throw so existing error handling (and the
> Part A toast) still runs.

### B4. Instrument the signer API chokepoint

`src/frontend/src/lib/api/signer.api.ts` is the single layer every paid signer call passes
through, and each function maps 1:1 to a canister method — the cleanest place to wrap.
Wrap each exported function's canister call in `withCfsSignTracking` with the matching
`PLAUSIBLE_EVENT_SUBCONTEXT_CFS` value:

| `signer.api.ts` function | `PLAUSIBLE_EVENT_SUBCONTEXT_CFS` |
| ------------------------ | -------------------------------- |
| `getEthAddress`          | `ETH_ADDRESS`                    |
| `signTransaction`        | `ETH_SIGN_TRANSACTION`           |
| `signPrehash`            | `ETH_SIGN_PREHASH`               |
| `signMessage`            | `ETH_PERSONAL_SIGN`              |
| `getBtcAddress`          | `BTC_CALLER_ADDRESS`             |
| `getBtcBalance`          | `BTC_CALLER_BALANCE`             |
| `signBtc`                | `BTC_CALLER_SIGN`                |
| `sendBtc`                | `BTC_CALLER_SEND`                |
| `getSchnorrPublicKey`    | `SCHNORR_PUBLIC_KEY`             |
| `signWithSchnorr`        | `SCHNORR_SIGN`                   |
| `genericSignWithEcdsa`   | `GENERIC_SIGN_WITH_ECDSA`        |

Example:

```ts
export const signTransaction = async ({ transaction, identity }: …): Promise<string> =>
	withCfsSignTracking(PLAUSIBLE_EVENT_SUBCONTEXT_CFS.ETH_SIGN_TRANSACTION, async () => {
		const { signTransaction } = await signerCanister({ identity });
		return signTransaction({ transaction });
	});
```

> Optional `token_network`: since the method already implies the chain, a dashboard can
> derive it; adding `token_network` explicitly is a nice-to-have and can be set from the
> method prefix (`eth_*`→`eth`, `btc_*`→`btc`, `schnorr_*`→`sol`).

---

## Tests

Frontend unit tests (Vitest) — follow `docs/ai/frontend/testing.md`. No new E2E (E2E is restricted).

- **`signer.errors`**: `isSignerCanisterPaymentError` returns true for each `PaymentError`
  variant and false for `InternalError` / `SigningError` / `BuildP2wpkhError` / generic errors.
- **Toast (Part A)**: given a `SignerCanisterPaymentError`, `toastsSignerUnavailableOr`
  shows the `send.error.signer_unavailable` text and does **not** append the raw ledger
  string; given any other error it calls the fallback. Extend the existing
  `src/frontend/src/tests/btc/services/btc-send.services.spec.ts` pattern.
- **Send wizards**: simulate `executeSend`/`sendBtc`/`sendSol` rejecting with a
  `SignerCanisterPaymentError` → assert the friendly toast; reject with a generic error →
  assert the existing `send.error.unexpected` toast still shows.
- **Message signing**: simulate `EthWalletConnectSignModal` `signMessage`/`signPrehash`
  rejecting with a `SignerCanisterPaymentError` → assert the friendly `sign.error.unavailable`
  toast (no raw ledger text), confirming the fix is not send-only.
- **Analytics (Part B)**: extend `src/frontend/src/tests/lib/services/analytics.service.spec.ts`:
  - success path emits `cfs_sign` with `result_status=success`, the right `event_subcontext`, and duration props;
  - error path emits `result_status=error`, `result_error*`, and `result_error_severity=blocker` for a payment error / `critical` otherwise;
  - `withCfsSignTracking` re-throws on error.
- **i18n**: `npm run i18n:types` and `npm run i18n:keys` run clean; `check.i18n` passes.

---

## PRODUCT.md

After merge, update `docs/ai/PRODUCT.md`:

- Under **## Analytics**, add a short subsection describing the `cfs_sign` event
  (fires on every paid chain-fusion-signer call, carries the method in `event_subcontext`,
  and sets `result_error_severity=blocker` when the backend is out of cycles).
- Note the signer-outage user behavior: when signing is unavailable due to the backend
  cycles balance, sends show a generic "issue signing BTC/ETH/SOL" toast rather than the
  raw ledger error.

---

## Suggested PR split (atomic, per AGENTS.md)

1. **PR 1 — `feat(frontend): track cfs_sign Plausible event`** — Part B (enums, helper,
   `signer.api.ts` instrumentation, tests). Pure addition, no behavior change.
2. **PR 2 — `fix(frontend): friendly toast when chain-fusion signer is unavailable`** —
   Part A (guard, i18n, toast helper, three wizards, tests).

PR 1 first means the next outage is already observable even before PR 2 ships.

---

## Out of scope

- Backend / cycles auto-top-up or alerting on the backend's cycles balance (the actual
  root-cause prevention) — separate backend work.
- Broadening the toast to non-payment signer errors (signing/internal/network). The guard
  makes this a one-line change if desired later.
- A dedicated `chain_fusion_signer` Plausible context (currently reusing `signer`).

---

## Acceptance criteria

- [ ] When the backend is out of cycles, any signing operation — sending BTC/ETH/SOL,
      WalletConnect personal_sign / eth_sign, EIP-2612 permits, swaps — shows the calm
      `sign.error.unavailable` toast with **no** raw `Ledger error: …` text appended.
- [ ] Genuine user errors (invalid address, insufficient token balance, gas) still show
      their existing specific toasts.
- [ ] Every paid signer call in `signer.api.ts` emits a `cfs_sign` event on both success
      and error, with the called method in `event_subcontext`.
- [ ] On the cycles outage, `cfs_sign` error events carry `result_error_severity = blocker`;
      other signer errors carry `critical`.
- [ ] Analytics never interrupts a send; `withCfsSignTracking` re-throws.
- [ ] `npm run i18n:types`, `npm run i18n:keys`, lint, and unit tests pass.
- [ ] `docs/ai/PRODUCT.md` updated.

---

## After implementation — Step 6 — Review (Cowork)

Diff the final PRs against this spec; flag any divergence (e.g. extra catch sites touched,
context renamed) and update the spec or the code before closing.
