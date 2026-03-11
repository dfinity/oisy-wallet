import { derived as originalDerived } from 'svelte/store';

export { get, readable, readonly, writable } from 'svelte/store';
export type {
	Readable,
	StartStopNotifier,
	Subscriber,
	Unsubscriber,
	Updater,
	Writable
} from 'svelte/store';

const ENABLED = VITE_DFX_NETWORK !== 'ic' && typeof window !== 'undefined';

const counters = new Map<string, number>();

const extractCallerLabel = (): string => {
	const stack = new Error().stack ?? '';
	const lines = stack.split('\n');

	const callerFrame = lines.find(
		(line) =>
			(line.includes('.ts:') || line.includes('.svelte:')) && !line.includes('reactivity-debug')
	);

	if (!callerFrame) {
		return 'unknown';
	}

	const projectMatch = callerFrame.match(/src\/frontend\/src\/(.+?)(?::(\d+))?(?::(\d+))?\)?$/);
	if (projectMatch) {
		const [, filePath, line] = projectMatch;
		return line ? `${filePath}:${line}` : filePath;
	}

	const fallbackMatch = callerFrame.match(/\/([^/]+\.(?:ts|svelte)):(\d+)/);

	return fallbackMatch ? `${fallbackMatch[1]}:${fallbackMatch[2]}` : 'unknown';
};

const bumpCounter = (label: string): number => {
	const nextValue = (counters.get(label) ?? 0) + 1;

	counters.set(label, nextValue);

	return nextValue;
};

const sortEntries = () => [...counters.entries()].sort(([, a], [, b]) => b - a);

const printTop = (limit = 25): void => {
	const entries = sortEntries();

	if (entries.length === 0) {
		// eslint-disable-next-line no-console
		console.log('[reactivity-debug] No recomputations recorded yet.');

		return;
	}

	const total = entries.reduce((sum, [, count]) => sum + count, 0);
	// eslint-disable-next-line no-console
	console.log(`[reactivity-debug] ${entries.length} tracked primitives, ${total} total hits:`);

	const rows = entries.slice(0, limit).map(([label, count]) => ({ label, count }));

	// eslint-disable-next-line no-console
	console.table(rows);
};

/**
 * Drop-in replacement for svelte/store `derived`.
 *
 * In every environment except production, every recomputation is counted
 * with an auto-generated label extracted from the call-site stack trace.
 * In production this is a zero-overhead pass-through.
 */
// eslint-disable-next-line local-rules/prefer-object-params
export const derived: typeof originalDerived = ((
	stores: Parameters<typeof originalDerived>[0],
	fn: Parameters<typeof originalDerived>[1],
	initialValue?: Parameters<typeof originalDerived>[2]
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
	if (!ENABLED) {
		return originalDerived(stores, fn as never, initialValue);
	}

	const label = extractCallerLabel();

	const wrappedFn =
		fn.length < 2
			? // eslint-disable-next-line @typescript-eslint/no-explicit-any
				(values: any) => {
					bumpCounter(label);
					return (fn as (values: unknown) => unknown)(values);
				}
			: // eslint-disable-next-line @typescript-eslint/no-explicit-any,local-rules/prefer-object-params
				(values: any, set: any) => {
					bumpCounter(label);
					return (fn as (values: unknown, set: unknown) => unknown)(values, set);
				};

	return originalDerived(stores, wrappedFn as never, initialValue);
}) as typeof originalDerived;

/**
 * Hit counter for `$effect` / `$derived.by` rune blocks.
 * Auto-injected by the Vite plugin's `transform` hook; can also
 * be called manually for custom labels.
 */
export const reactivityDebugHit = (label: string): void => {
	if (!ENABLED) {
		return;
	}

	bumpCounter(label);
};

export const getReactivityDebugSnapshot = (): ReadonlyArray<[string, number]> => sortEntries();

export const resetReactivityDebug = (): void => {
	const count = counters.size;

	counters.clear();

	// eslint-disable-next-line no-console
	console.log(`[reactivity-debug] Reset — cleared ${count} tracked primitives.`);
};

declare global {
	interface Window {
		__oisyReactivityDebug?: {
			enabled: boolean;
			snapshot: () => ReadonlyArray<[string, number]>;
			printTop: (limit?: number) => void;
			reset: () => void;
		};
	}
}

if (ENABLED) {
	window.__oisyReactivityDebug = {
		enabled: true,
		snapshot: getReactivityDebugSnapshot,
		printTop,
		reset: resetReactivityDebug
	};
}
