// Test-only feature flags for measuring memory consumption fixes.
//
// All flags default to OFF — when off, the original logic runs unchanged.
// Enable individual flags via URL param, e.g.:
//
//   ?memFlags=1        only flag #1
//   ?memFlags=1,3,4    flags #1, #3, #4
//   ?memFlags=all      all flags
//
// The chosen value is persisted to localStorage under `oisy.memFlags` so it
// survives reloads. Pass `?memFlags=` (empty value) to clear.
//
// Flag map:
//   1 = transactions store: per-token slot mutate instead of full state spread
//   2 = ic-transactions derived: memoize on input references
//   3 = exchange store: single-pass merge instead of reduce-with-spread
//   4 = icrc wallet worker: singleton on non-iOS too
//   5 = reload cleanup: terminate worker + best-effort agent reset on unload
//
// This module is intentionally not "proper" production code — it exists only
// to A/B the memory fixes on the chore-frontend/memory-consumption-test-flags
// branch and is not meant to land on main.

const STORAGE_KEY = 'oisy.memFlags';
const ALL_FLAGS = ['1', '2', '3', '4', '5'] as const;

const readRaw = (): string | null => {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const params = new URLSearchParams(window.location.search);
		if (params.has('memFlags')) {
			const value = params.get('memFlags') ?? '';
			window.localStorage.setItem(STORAGE_KEY, value);
			return value;
		}
		return window.localStorage.getItem(STORAGE_KEY);
	} catch (_err) {
		return null;
	}
};

const parseFlags = (raw: string | null): Set<string> => {
	if (raw === null || raw.trim().length === 0) {
		return new Set();
	}

	if (raw.trim().toLowerCase() === 'all') {
		return new Set(ALL_FLAGS);
	}

	return new Set(
		raw
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0)
	);
};

const flags = parseFlags(readRaw());

export const MEMORY_FIX_TRANSACTIONS_STORE = flags.has('1');
export const MEMORY_FIX_IC_TRANSACTIONS_DERIVED = flags.has('2');
export const MEMORY_FIX_EXCHANGE_STORE = flags.has('3');
export const MEMORY_FIX_WORKER_SINGLETON = flags.has('4');
export const MEMORY_FIX_RELOAD_CLEANUP = flags.has('5');

export const MEMORY_FIX_ACTIVE_FLAGS: readonly string[] = ALL_FLAGS.filter((f) => flags.has(f));

if (typeof window !== 'undefined' && flags.size > 0) {
	// eslint-disable-next-line no-console
	console.info(`[memFlags] enabled: ${Array.from(flags).join(',')}`);
}
