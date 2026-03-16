import { tick } from 'svelte';
import { derived, type Readable, type Subscriber, type Unsubscriber } from 'svelte/store';

type Stores =
	| Readable<unknown>
	| [Readable<unknown>, ...Array<Readable<unknown>>]
	| Array<Readable<unknown>>;
type StoresValues<T> =
	T extends Readable<infer U> ? U : { [K in keyof T]: T[K] extends Readable<infer U> ? U : never };

/**
 * Like {@link derivedMemo}, but emits subsequent source updates in incremental
 * batches of `batchSize` items instead of all at once.
 *
 * The **first** source emission (the synchronous value delivered during
 * `subscribe`) is always propagated in full — exactly like `derivedMemo` — so
 * that `get(store)` and initial renders receive the complete list immediately.
 *
 * Every **subsequent** source update is emitted incrementally.  After each
 * intermediate batch the store awaits `tick()` so that every downstream derived
 * store (and its descendants, recursively) can finish recomputing before the
 * next batch arrives.  This spreads out heavy downstream work (balance lookups,
 * UI rendering, worker (re)starts, …) over multiple event-loop turns rather
 * than triggering it all in a single synchronous burst.
 *
 * Batches are cumulative slices of the target array:
 *   `[0 … batchSize)`, then `[0 … 2·batchSize)`, … then the full array.
 *
 * If a new source value arrives while batching is in progress the current
 * sequence is cancelled and a fresh one starts — without ever regressing below
 * the number of items already emitted.
 */
// eslint-disable-next-line local-rules/prefer-object-params -- Mirrors Svelte's `derived` store signature for consistency with `derivedMemo`.
export const derivedBatchedMemo = <S extends Stores, T>(
	stores: S,
	fn: (values: StoresValues<S>) => T[],
	isEqual: (a: T[], b: T[]) => boolean,
	batchSize: number
): Readable<T[]> => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const source: Readable<T[]> = derived(stores as any, fn as any);

	let emittedValue: T[] = [];

	let initialized = false;

	const subscribers = new Set<Subscriber<T[]>>();

	let stopSource: Unsubscriber | undefined;

	let batchVersion = 0;

	const notify = (value: T[]) => {
		emittedValue = value;

		for (const sub of subscribers) {
			sub(value);
		}
	};

	const emitBatched = async (target: T[]) => {
		const version = ++batchVersion;

		for (let end = batchSize; end < target.length; end += batchSize) {
			if (batchVersion !== version) {
				return;
			}

			if (end <= emittedValue.length) {
				continue;
			}

			const batch = target.slice(0, end);

			if (!isEqual(emittedValue, batch)) {
				notify(batch);

				await tick();
			}
		}

		if (batchVersion !== version) {
			return;
		}

		if (!isEqual(emittedValue, target)) {
			notify(target);
		}
	};

	const start = () => {
		let isFirstSourceEmission = true;

		stopSource = source.subscribe((next) => {
			if (!initialized) {
				initialized = true;
			}

			if (isFirstSourceEmission) {
				isFirstSourceEmission = false;

				emittedValue = next;

				return;
			}

			void emitBatched(next);
		});
	};

	const stop = () => {
		batchVersion++;

		stopSource?.();

		stopSource = undefined;

		initialized = false;

		emittedValue = [];
	};

	return {
		// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
		subscribe(run: Subscriber<T[]>): Unsubscriber {
			if (subscribers.size === 0) {
				start();
			}

			subscribers.add(run);

			if (initialized) {
				run(emittedValue);
			}

			return () => {
				subscribers.delete(run);

				if (subscribers.size === 0) {
					stop();
				}
			};
		}
	};
};
