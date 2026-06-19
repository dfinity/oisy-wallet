import { browser } from '$app/environment';
import type { PaymentError } from '$declarations/signer/signer.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { SignerCanisterPaymentError } from '$lib/canisters/signer.errors';
import { LOCAL, STAGING } from '$lib/constants/app.constants';
import { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';

/**
 * DEMO ONLY — this file ships on a branch that is NOT intended to be merged.
 *
 * Forces the chain-fusion-signer API (`signer.api.ts`) to throw a chosen error so the
 * signer-unavailable toast (PR #13145) and the fallback error paths can be reproduced
 * end-to-end — including the `cfs_sign` Plausible event (PR #13144), which is emitted
 * because the error is thrown from inside the tracked signer call — without needing an
 * actual backend cycles outage.
 *
 * Only active locally or on a test/staging build (never on the `ic` production build),
 * and only when explicitly opted in via:
 *   - URL query param:  `?simulate_signer_failure=payment`
 *   - or localStorage:  `localStorage.setItem('OISY_SIMULATE_SIGNER_FAILURE', 'payment')`
 *
 * The query param wins over localStorage. Set the value to `off` (or clear it) to disable.
 *
 * Modes: `payment` (backend out of cycles → "signer unavailable"), `allowance` (exhausted
 * per-user allowance → "signing limit reached"), `internal` / `signing` (generic non-payment
 * signer errors → fallback toast).
 */
export type SimulatedSignerFailureMode = 'payment' | 'allowance' | 'internal' | 'signing';

const SIMULATED_SIGNER_FAILURE_MODES: SimulatedSignerFailureMode[] = [
	'payment',
	'allowance',
	'internal',
	'signing'
];

const SIMULATE_SIGNER_FAILURE_KEY = 'OISY_SIMULATE_SIGNER_FAILURE';

const readSimulatedSignerFailureMode = (): SimulatedSignerFailureMode | undefined => {
	// Never simulate on production builds, in non-browser contexts, or when not opted in.
	if (!browser || !(LOCAL || STAGING)) {
		return undefined;
	}

	const fromQuery = new URLSearchParams(window.location.search).get('simulate_signer_failure');
	const fromStorage = localStorage.getItem(SIMULATE_SIGNER_FAILURE_KEY);
	const value = fromQuery ?? fromStorage ?? undefined;

	return SIMULATED_SIGNER_FAILURE_MODES.find((mode) => mode === value);
};

/**
 * Throws the configured simulated signer error, or does nothing when simulation is off.
 * Call this at the start of a paid signer call so the thrown error follows the exact same
 * code path a real chain-fusion-signer error would.
 */
export const simulateSignerFailureIfEnabled = () => {
	const mode = readSimulatedSignerFailureMode();

	if (isNullish(mode)) {
		return;
	}

	if (mode === 'payment') {
		// `SignerCanisterPaymentError` → the friendly "signer unavailable" toast.
		// The InsufficientFunds figures mirror the real incident (≈0.046 TC available).
		throw new SignerCanisterPaymentError({
			InsufficientFunds: { needed: 100_000_000n, available: 45_738_950n }
		});
	}

	if (mode === 'allowance') {
		// Exhausted per-user ICRC-2 allowance → the "signing limit reached" toast.
		throw new SignerCanisterPaymentError({
			LedgerWithdrawFromError: {
				error: { InsufficientAllowance: { allowance: 1_000n } },
				ledger: Principal.anonymous()
			}
		} as unknown as PaymentError);
	}

	if (mode === 'signing') {
		// A non-payment signer error (e.g. a threshold-signing failure) → fallback toast.
		throw new CanisterInternalError('Simulated signer SigningError (demo)');
	}

	// `internal` → a generic signer InternalError → fallback toast.
	throw new CanisterInternalError('Simulated signer InternalError (demo)');
};
