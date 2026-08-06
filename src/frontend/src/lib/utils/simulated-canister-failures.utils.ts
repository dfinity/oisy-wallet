import { LOCAL, STAGING } from '$lib/constants/app.constants';
import { isNullish } from '@dfinity/utils';
import { createStore, get as idbGet, set as idbSet, type UseStore } from 'idb-keyval';

/**
 * QA harness — DO NOT MERGE.
 *
 * Lets a tester mark canisters as "not responding" so the wallet's failure paths can be exercised
 * on demand. The failure is injected inside the call that fails for real, so the error travels the
 * genuine path: the scheduler settles it, the balance survives an Index failure, and the UI counts
 * consecutive failures the same way it would during an actual outage.
 *
 * The selection lives in IndexedDB rather than localStorage because it has to be readable from the
 * wallet web worker, which has no access to localStorage. Reading it on every job also means the
 * tester can add or remove a token and see the effect on the next 30s cycle, without reloading.
 */
export interface SimulatedCanisterFailures {
	indexCanisterIds: string[];
	ledgerCanisterIds: string[];
}

export type SimulatedCanisterKind = 'index' | 'ledger';

const NO_FAILURES: SimulatedCanisterFailures = { indexCanisterIds: [], ledgerCanisterIds: [] };

const IDB_KEY = 'simulated-canister-failures';

// Created lazily rather than at module root: this module is reachable from the pre-rendered
// Settings page, and there is no IndexedDB during SSG.
let store: UseStore | undefined;

const idbStore = (): UseStore => (store ??= createStore('oisy-testing', 'testing'));

/** Never active on the beta or production builds, whatever is in IndexedDB. */
export const simulatedCanisterFailuresEnabled = LOCAL || STAGING;

export const getSimulatedCanisterFailures = async (): Promise<SimulatedCanisterFailures> => {
	if (!simulatedCanisterFailuresEnabled) {
		return NO_FAILURES;
	}

	try {
		const failures = await idbGet<SimulatedCanisterFailures>(IDB_KEY, idbStore());

		return failures ?? NO_FAILURES;
	} catch (_err: unknown) {
		// A harness must never become the reason a real call fails. A browser profile that denies
		// storage access degrades to "nothing simulated".
		return NO_FAILURES;
	}
};

export const setSimulatedCanisterFailures = async (
	failures: SimulatedCanisterFailures
): Promise<void> => {
	if (!simulatedCanisterFailuresEnabled) {
		return;
	}

	await idbSet(IDB_KEY, failures, idbStore());
};

// The snapshot the synchronous check reads. Kept up to date in the background - see below.
let cachedFailures: SimulatedCanisterFailures = NO_FAILURES;

const refreshCachedFailures = () => {
	void getSimulatedCanisterFailures().then((failures) => (cachedFailures = failures));
};

if (simulatedCanisterFailuresEnabled) {
	refreshCachedFailures();
}

/**
 * The error to fail the call with, or `undefined` to let it through. Called by the worker right
 * before the real request.
 *
 * Returns the error rather than throwing it, and reads a snapshot rather than awaiting one, because
 * both alternatives would change the shape of the call it wraps: a synchronous throw would escape
 * the caller's `Promise.allSettled` and turn a tolerated Index failure into a fatal one, and an
 * `await` would insert a microtask into the timing the harness is meant to leave untouched. The
 * cost of the snapshot is that a change made in Settings lands on the job after next.
 */
export const simulatedCanisterFailure = ({
	canisterId,
	kind
}: {
	canisterId: string | undefined;
	kind: SimulatedCanisterKind;
}): Error | undefined => {
	if (!simulatedCanisterFailuresEnabled || isNullish(canisterId)) {
		return undefined;
	}

	const { indexCanisterIds, ledgerCanisterIds } = cachedFailures;

	refreshCachedFailures();

	const canisterIds = kind === 'index' ? indexCanisterIds : ledgerCanisterIds;

	return canisterIds.includes(canisterId)
		? new Error(`[QA harness] Simulated failure: ${kind} canister ${canisterId} is not responding`)
		: undefined;
};

/**
 * Maps the comma-separated symbols a tester typed onto the canister IDs of the tokens they own,
 * reporting back the symbols that matched nothing so a typo is visible rather than silent.
 */
export const resolveSimulatedCanisterIds = <
	T extends { symbol: string; ledgerCanisterId: string; indexCanisterId?: string }
>({
	symbols,
	tokens,
	kind
}: {
	symbols: string;
	tokens: T[];
	kind: SimulatedCanisterKind;
}): { canisterIds: string[]; matchedSymbols: string[]; unknownSymbols: string[] } => {
	const requested = symbols
		.split(',')
		.map((symbol) => symbol.trim())
		.filter((symbol) => symbol !== '');

	return requested.reduce<{
		canisterIds: string[];
		matchedSymbols: string[];
		unknownSymbols: string[];
	}>(
		(acc, symbol) => {
			const token = tokens.find(
				({ symbol: tokenSymbol }) => tokenSymbol.toLowerCase() === symbol.toLowerCase()
			);

			const canisterId =
				kind === 'index' ? (token?.indexCanisterId ?? undefined) : token?.ledgerCanisterId;

			if (isNullish(canisterId)) {
				acc.unknownSymbols.push(symbol);
				return acc;
			}

			acc.canisterIds.push(canisterId);
			acc.matchedSymbols.push(token?.symbol ?? symbol);

			return acc;
		},
		{ canisterIds: [], matchedSymbols: [], unknownSymbols: [] }
	);
};
