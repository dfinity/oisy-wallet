// Test-only: pre-unload cleanup hook gated by MEMORY_FIX_RELOAD_CLEANUP (?memFlags=5).
//
// Hypothesis: the post-reload spike grows reload-over-reload because the
// previous page's heap is still reachable while the new page initialises
// its own world. We try to drop as much of that retained state as we can
// from inside `beforeunload` / `pagehide` so the new page boots with less
// reachable garbage.
//
// Caveats:
// - `beforeunload` is synchronous and short-lived; async work is not
//   guaranteed to complete before the page goes away.
// - `AppWorker.resetForTesting` is intended for tests, but it's the only
//   public API to terminate the singleton AppWorker. We intentionally
//   reuse it here on this measurement branch.
// - Resetting the agent manager is best-effort: the @dfinity/utils
//   `AgentManager` doesn't expose a documented reset API, so we probe a
//   few likely method names and skip silently if none exist.

import { agents } from '$lib/actors/agents.ic';
import { AppWorker } from '$lib/services/_worker.services';
import { MEMORY_FIX_RELOAD_CLEANUP } from '$lib/utils/memory-flags.utils';

let registered = false;
let cleanedUp = false;

const tryAgentReset = () => {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const a = agents as any;
		for (const method of ['reset', 'clear', 'destroy', 'reinitialize']) {
			if (typeof a?.[method] === 'function') {
				a[method]();
			}
		}
		for (const cacheKey of ['cache', 'agents', '_cache', '_agents']) {
			const cache = a?.[cacheKey];
			if (cache && typeof cache.clear === 'function') {
				cache.clear();
			}
		}
	} catch (err) {
		// eslint-disable-next-line no-console
		console.warn('[memFlags#5] agent reset attempt failed', err);
	}
};

const tryWorkerTerminate = () => {
	try {
		AppWorker.resetForTesting();
	} catch (err) {
		// eslint-disable-next-line no-console
		console.warn('[memFlags#5] worker terminate failed', err);
	}
};

const cleanup = () => {
	if (cleanedUp) {
		return;
	}
	cleanedUp = true;
	// eslint-disable-next-line no-console
	console.info('[memFlags#5] running pre-unload cleanup');
	tryWorkerTerminate();
	tryAgentReset();
};

export const registerMemoryReloadCleanup = () => {
	if (!MEMORY_FIX_RELOAD_CLEANUP) {
		return;
	}
	if (registered) {
		return;
	}
	if (typeof window === 'undefined') {
		return;
	}
	registered = true;

	window.addEventListener('beforeunload', cleanup, { capture: true });
	window.addEventListener('pagehide', cleanup, { capture: true });
};
