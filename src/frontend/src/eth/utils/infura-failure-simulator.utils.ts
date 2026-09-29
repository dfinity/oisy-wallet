import { browser } from '$app/environment';
import { LOCAL, STAGING } from '$lib/constants/app.constants';
import { PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS } from '$lib/enums/plausible';
import { isNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';

/**
 * DEMO ONLY — this file ships on a branch that is NOT intended to be merged.
 *
 * Makes Infura, and optionally Alchemy, fail a chosen call an EVM send depends on, so that the
 * fallbacks (#14140, #14141, #14144) and the failure messages (#14142) can be exercised on a test
 * deployment. The failure is injected inside `InfuraProvider`, where a real one would surface, so
 * everything after it runs for real: the fallback, the hash lookup, the `provider_fallback` event,
 * the error mapping and the toast.
 *
 * Only active locally or on a test/staging build (never on `ic`), and only when opted in via:
 *   - URL query param:  `?simulate_infura_failure=nonce`
 *   - or localStorage:  `localStorage.setItem('OISY_SIMULATE_INFURA_FAILURE', 'nonce')`
 *
 * The query param wins over localStorage. The value is a comma-separated list of tokens:
 *   - `submission`, `nonce`, `fee`, or `all`: the calls Infura fails.
 *   - `silent`: Infura gives no answer instead of an error, which exercises the time limits.
 *   - `forwarded`: for a submission, Infura really passes the transaction on and then fails the
 *     request, which exercises the hash lookup.
 *   - `both`: Alchemy fails the same calls too, which exercises the messages for a send that both
 *     providers failed.
 * No call token, or no value at all, turns it off.
 */
export type SimulatedProvider = 'infura' | 'alchemy';

interface SimulatedInfuraFailure {
	operations: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS[];
	silent: boolean;
	forwarded: boolean;
	both: boolean;
}

const SIMULATE_INFURA_FAILURE_KEY = 'OISY_SIMULATE_INFURA_FAILURE';

const ALL_OPERATIONS = Object.values(PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS);

export const parseSimulatedInfuraFailure = (
	value: Nullish<string>
): SimulatedInfuraFailure | undefined => {
	const tokens = (value ?? '')
		.split(',')
		.map((token) => token.trim().toLowerCase())
		.filter((token) => token !== '');

	const operations = tokens.includes('all')
		? ALL_OPERATIONS
		: ALL_OPERATIONS.filter((operation) => tokens.includes(operation));

	if (operations.length === 0) {
		return undefined;
	}

	return {
		operations,
		silent: tokens.includes('silent'),
		forwarded: tokens.includes('forwarded'),
		both: tokens.includes('both')
	};
};

const readSimulatedInfuraFailure = (): SimulatedInfuraFailure | undefined => {
	// Never simulate on production builds, in non-browser contexts, or when not opted in.
	if (!browser || !(LOCAL || STAGING)) {
		return undefined;
	}

	const fromQuery = new URLSearchParams(window.location.search).get('simulate_infura_failure');
	const fromStorage = localStorage.getItem(SIMULATE_INFURA_FAILURE_KEY);

	return parseSimulatedInfuraFailure(fromQuery ?? fromStorage);
};

// Shaped like the answer Infura gave on 2026-09-26: ethers could not make sense of a bare
// JSON-RPC internal error, which says nothing about the transaction.
const simulatedError = (provider: SimulatedProvider): Error =>
	Object.assign(new Error(`could not coalesce error (simulated ${provider} failure)`), {
		code: 'UNKNOWN_ERROR',
		error: { code: -32603, message: 'Internal error' }
	});

/**
 * Runs `call`, or fails it the way the switch asks for.
 */
export const simulateInfuraFailureIfEnabled = <T>({
	operation,
	provider,
	call
}: {
	operation: PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS;
	provider: SimulatedProvider;
	call: () => Promise<T>;
}): Promise<T> => {
	const failure = readSimulatedInfuraFailure();

	if (isNullish(failure) || !failure.operations.includes(operation)) {
		return call();
	}

	if (provider === 'alchemy') {
		return failure.both ? Promise.reject(simulatedError(provider)) : call();
	}

	if (failure.silent) {
		return new Promise<T>(() => {});
	}

	if (failure.forwarded && operation === PLAUSIBLE_EVENT_SUBCONTEXT_PROVIDERS.SUBMISSION) {
		return call().then(() => Promise.reject(simulatedError(provider)));
	}

	return Promise.reject(simulatedError(provider));
};
