import { LOCAL, STAGING } from '$lib/constants/app.constants';
import type { TokenId } from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

/**
 * QA harness — DO NOT MERGE.
 *
 * Lets a tester mark tokens as having a failing index or ledger canister, so the wallet's failure
 * paths can be exercised on demand instead of waiting for a canister to genuinely misbehave.
 *
 * The simulation is applied in `syncWallet` (`$icp/services/ic-listener.services`), on the message
 * the wallet worker posts to the UI thread — not inside the canister call itself. An earlier
 * version injected in the worker; the worker is a separate thread with no access to the page's
 * stores, and the IndexedDB hand-off it needed never reached it.
 *
 * What that costs: the worker's own `Promise.allSettled` handling is not exercised (it is covered
 * by unit tests). What it still exercises, faithfully, is everything downstream — the payload is
 * rewritten into exactly what the worker emits on an index failure, so the balance keeps updating,
 * the loaded transactions stay, the per-token failure counter runs, and the warning appears at the
 * threshold and clears on recovery.
 */
export interface SimulatedFailures {
	/** Token symbols, upper-cased. */
	indexSymbols: string[];
	ledgerSymbols: string[];
}

export type SimulatedCanisterKind = 'index' | 'ledger';

const NO_FAILURES: SimulatedFailures = { indexSymbols: [], ledgerSymbols: [] };

const STORAGE_KEY = 'oisy_simulated_canister_failures';

/** Never active on the beta or production builds, whatever is in storage. */
export const simulatedCanisterFailuresEnabled = LOCAL || STAGING;

const QA_CONTEXT = typeof window === 'undefined' ? 'ssg' : 'window';

// Silent under vitest: the suite fails any test that writes to the console.
const QA_LOGGING_ENABLED = simulatedCanisterFailuresEnabled && !import.meta.env.VITEST;

export const qaLog = (...args: unknown[]): void => {
	if (!QA_LOGGING_ENABLED) {
		return;
	}

	// `console.log` rather than the `console.debug` used elsewhere: Chrome hides debug output unless
	// the Verbose level is enabled, and these lines are the point of the harness.
	// eslint-disable-next-line no-console
	console.log(`[QA harness:${QA_CONTEXT}]`, ...args);
};

// Keyed off `window`, not off `localStorage`: during SSG the bare identifier is a ReferenceError on
// some runtimes and a stub without `getItem` on Node 24, and neither is worth handling twice.
const storage = (): Storage | undefined =>
	typeof window === 'undefined' ? undefined : window.localStorage;

const readStoredFailures = (): SimulatedFailures => {
	try {
		const stored = storage()?.getItem(STORAGE_KEY);

		return isNullish(stored) ? NO_FAILURES : { ...NO_FAILURES, ...JSON.parse(stored) };
	} catch (err: unknown) {
		qaLog('could not read the stored simulated failures', err);

		return NO_FAILURES;
	}
};

const initSimulatedFailuresStore = () => {
	const { subscribe, set } = writable<SimulatedFailures>(
		simulatedCanisterFailuresEnabled ? readStoredFailures() : NO_FAILURES
	);

	return {
		subscribe,
		set: (failures: SimulatedFailures) => {
			if (!simulatedCanisterFailuresEnabled) {
				return;
			}

			try {
				storage()?.setItem(STORAGE_KEY, JSON.stringify(failures));
			} catch (err: unknown) {
				qaLog('could not store the simulated failures', err);
			}

			qaLog('now simulating', failures);

			set(failures);
		}
	};
};

export const simulatedFailuresStore: Readable<SimulatedFailures> & {
	set: (failures: SimulatedFailures) => void;
} = initSimulatedFailuresStore();

/** Splits what the tester typed into upper-cased symbols. */
export const parseSimulatedSymbols = (symbols: string): string[] =>
	symbols
		.split(',')
		.map((symbol) => symbol.trim().toUpperCase())
		.filter((symbol) => symbol !== '');

/**
 * Whether the given token is currently being simulated as failing.
 *
 * A `TokenId` is a symbol whose description is the token symbol — the same string the tester types.
 */
export const isSimulatedFailure = ({
	tokenId,
	kind,
	failures
}: {
	tokenId: TokenId;
	kind: SimulatedCanisterKind;
	failures: SimulatedFailures;
}): boolean => {
	if (!simulatedCanisterFailuresEnabled) {
		return false;
	}

	const { description } = tokenId;

	if (isNullish(description)) {
		return false;
	}

	const symbols = kind === 'index' ? failures.indexSymbols : failures.ledgerSymbols;

	return symbols.includes(description.toUpperCase());
};

/** Reports back the symbols that matched no enabled token, so a typo is visible. */
export const unknownSimulatedSymbols = <T extends { symbol: string }>({
	symbols,
	tokens
}: {
	symbols: string[];
	tokens: T[];
}): string[] =>
	symbols.filter(
		(symbol) => !tokens.some(({ symbol: tokenSymbol }) => tokenSymbol.toUpperCase() === symbol)
	);

export const simulatedSummary = (failures: SimulatedFailures): string =>
	[
		...failures.indexSymbols.map((symbol) => `${symbol} (index)`),
		...failures.ledgerSymbols.map((symbol) => `${symbol} (ledger)`)
	].join(', ');
