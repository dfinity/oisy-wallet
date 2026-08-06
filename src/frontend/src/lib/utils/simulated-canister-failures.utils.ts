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

// The wallet workers log to the same console as the page, so every line says which side it came
// from: the whole point of the harness is that the two sides agree on what is being simulated.
const QA_CONTEXT = typeof window === 'undefined' ? 'worker' : 'window';

// Silent under vitest: the suite fails any test that writes to the console, and a harness must not
// force every test that touches the wallet to opt out of that guard.
const QA_LOGGING_ENABLED = simulatedCanisterFailuresEnabled && !import.meta.env.VITEST;

// Identifies this module instance, so a duplicated module (one copy refreshed, another one read)
// is visible rather than inferred.
const QA_INSTANCE = `${QA_CONTEXT}-${Date.now() % 100_000}`;

export const qaLog = (...args: unknown[]): void => {
	if (!QA_LOGGING_ENABLED) {
		return;
	}

	// `console.log` rather than the `console.debug` used elsewhere: Chrome hides debug output unless
	// the Verbose level is enabled, and these lines are the point of the harness.
	// eslint-disable-next-line no-console
	console.log(`[QA harness:${QA_CONTEXT}]`, ...args);
};

export const getSimulatedCanisterFailures = async (): Promise<SimulatedCanisterFailures> => {
	if (!simulatedCanisterFailuresEnabled) {
		return NO_FAILURES;
	}

	try {
		const failures = await idbGet<SimulatedCanisterFailures>(IDB_KEY, idbStore());

		qaLog(`read key "${IDB_KEY}" from db "oisy-testing"/"testing":`, failures);

		return failures ?? NO_FAILURES;
	} catch (err: unknown) {
		// A harness must never become the reason a real call fails. A browser profile that denies
		// storage access degrades to "nothing simulated".
		qaLog('failed to read the simulated failures from IndexedDB', err);

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

	qaLog('stored in IndexedDB:', failures);
};

// The snapshot the synchronous check reads. Kept up to date in the background - see below.
let cachedFailures: SimulatedCanisterFailures = NO_FAILURES;

const refreshCachedFailures = () => {
	void getSimulatedCanisterFailures().then((failures) => {
		// Only on a change, otherwise this would log on every job of every token.
		if (JSON.stringify(failures) !== JSON.stringify(cachedFailures)) {
			qaLog(`instance ${QA_INSTANCE} snapshot changed:`, failures);
		}

		cachedFailures = failures;
	});
};

if (simulatedCanisterFailuresEnabled) {
	// If the check and the snapshot report different instance ids, the module was bundled twice and
	// the check is reading a copy nobody refreshes.
	qaLog(`enabled - instance ${QA_INSTANCE}, reading the initial snapshot`);

	// Which databases this side can actually see. A worker that cannot see "oisy-testing" is not
	// looking at the same storage as the page that wrote it.
	void indexedDB
		?.databases?.()
		.then((dbs) => qaLog(`instance ${QA_INSTANCE} sees databases`, dbs))
		.catch((err: unknown) => qaLog('could not list the databases', err));

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

	// Unconditional: "no line at all" and "a line showing an empty list" are different bugs.
	qaLog(
		`[instance ${QA_INSTANCE}] checking ${kind} canister ${canisterId} against`,
		canisterIds,
		'| full snapshot',
		cachedFailures
	);

	if (canisterIds.includes(canisterId)) {
		qaLog(`injecting a failure for ${kind} canister ${canisterId}`);

		return new Error(
			`[QA harness] Simulated failure: ${kind} canister ${canisterId} is not responding`
		);
	}

	// Logged only while something is simulated, and it prints both sides of the comparison: a
	// canister ID that never shows up here is one the worker is not actually asking about.
	if (canisterIds.length > 0) {
		qaLog(`letting ${kind} canister ${canisterId} through - simulated are`, canisterIds);
	}

	return undefined;
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
