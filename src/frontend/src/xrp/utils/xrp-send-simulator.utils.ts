import { browser } from '$app/environment';
import { LOCAL, STAGING } from '$lib/constants/app.constants';
import { isNullish } from '@dfinity/utils';

/**
 * DEMO ONLY — this file ships on a branch that is NOT intended to be merged.
 *
 * The XRP in-flight send guard refuses a second payment while the first is unresolved, and that
 * state cannot be provoked on a deployed environment. A normally-fee'd payment is validated in the
 * next ledger close, about four seconds, so there is no window to click into — and a low fee does
 * not help: XRPL queues a transaction only when its fee is below the *open-ledger* cost while at
 * or above the base fee, and on a quiet network those are the same 10 drops. Below the base fee it
 * is rejected outright (`telINSUF_FEE_P`) rather than queued.
 *
 * So the unresolved state is simulated instead, at the two points where it really arises:
 *
 * - **`lookup_fails`** — every `tx` lookup throws, which is what a node that has stopped answering
 *   looks like. The payment IS submitted, so it really lands; nothing can establish that it did.
 *   The send hands off at the broadcast, so the modal closes normally and the record is left
 *   `Pending` — a second send is then refused immediately, and the poller cannot resolve it either,
 *   so the window is unlimited. Clear the flag and the next 5-second tick resolves the record,
 *   toasts the outcome and unblocks the address. This is the mode to use for the guard.
 *
 * - **`no_submit`** — the transaction is never broadcast, so no funds move and no fee is charged.
 *   The record is still created and left open, which is exactly the lost-broadcast case: the
 *   poller finds the hash absent and, once the validated ledger passes the signed
 *   `LastLedgerSequence`, resolves it as expired about 80 seconds later and toasts that. Use this
 *   to watch a record self-clear without spending anything.
 *
 * Neither surfaces a retry, because there is none: the send never offers to resubmit, and the
 * guard is what makes that unnecessary — a fresh send is simply refused until the first settles.
 *
 * Only active locally, on staging, or on a `test_fe_*` build — never on `ic`. Opt in with:
 *   - URL query param: `?simulate_xrp_send=lookup_fails`
 *   - or localStorage:  `localStorage.setItem('OISY_SIMULATE_XRP_SEND', 'lookup_fails')`
 *
 * The query param wins over localStorage. Clear it, or set it to anything unrecognised, to
 * disable — which is also how the recovery path is tested, since the poller resolves the record
 * from the ledger as soon as the lookups work again.
 */
export type SimulatedXrpSendMode = 'lookup_fails' | 'no_submit';

const SIMULATED_XRP_SEND_MODES: SimulatedXrpSendMode[] = ['lookup_fails', 'no_submit'];

const SIMULATE_XRP_SEND_KEY = 'OISY_SIMULATE_XRP_SEND';
const SIMULATE_XRP_SEND_QUERY_PARAM = 'simulate_xrp_send';

// Reading the opt-in must never be able to throw: this runs inside a real send, so a hardened
// browser profile that denies storage access — or a test environment whose `localStorage` is not
// the DOM one and has no `getItem` — would otherwise turn a demo switch into a genuine failure.
const readStorage = (key: string): string | null => {
	try {
		return localStorage.getItem(key) ?? null;
	} catch (_: unknown) {
		return null;
	}
};

const readQueryParam = (param: string): string | null => {
	try {
		return new URLSearchParams(window.location.search).get(param);
	} catch (_: unknown) {
		return null;
	}
};

/**
 * The opted-in mode, or `undefined` when the simulator is off.
 *
 * Fails safe in every direction: never on a production build, never outside the browser, and never
 * on a value that is not one of the known modes.
 */
export const simulatedXrpSendMode = (): SimulatedXrpSendMode | undefined => {
	if (!browser || !(LOCAL || STAGING)) {
		return undefined;
	}

	const value = readQueryParam(SIMULATE_XRP_SEND_QUERY_PARAM) ?? readStorage(SIMULATE_XRP_SEND_KEY);

	if (isNullish(value)) {
		return undefined;
	}

	return SIMULATED_XRP_SEND_MODES.find((mode) => mode === value);
};

export const shouldSimulateXrpSubmitSkipped = (): boolean => simulatedXrpSendMode() === 'no_submit';

export const shouldSimulateXrpLookupFailure = (): boolean =>
	simulatedXrpSendMode() === 'lookup_fails';
