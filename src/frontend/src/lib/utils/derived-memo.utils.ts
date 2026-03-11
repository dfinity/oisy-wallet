import { derived, type Readable, type Subscriber, type Unsubscriber } from 'svelte/store';

type Stores =
	| Readable<unknown>
	| [Readable<unknown>, ...Array<Readable<unknown>>]
	| Array<Readable<unknown>>;
type StoresValues<T> =
	T extends Readable<infer U> ? U : { [K in keyof T]: T[K] extends Readable<infer U> ? U : never };

/**
 * Like Svelte's `derived`, but only notifies subscribers when the output
 * actually changes according to the provided equality function.
 * This prevents unnecessary downstream recomputations when intermediate
 * derived stores produce the same value from different source triggers.
 *
 * Note: Svelte's `derived` already deduplicates primitive values via
 * reference equality (`safe_not_equal`, i.e. `!==`). This utility is
 * therefore only useful when `fn` returns objects or arrays — values
 * where each invocation produces a new reference even if the contents
 * are semantically identical.
 */
// eslint-disable-next-line local-rules/prefer-object-params -- The structure replicates Svelte's `derived` store, which takes separate store arguments rather than an object param.
export const derivedMemo = <S extends Stores, T>(
	stores: S,
	fn: (values: StoresValues<S>) => T,
	isEqual: (a: T, b: T) => boolean
): Readable<T> => {
	// TODO: Strengthen the type signatures
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const source: Readable<T> = derived(stores as any, fn as any);

	let value: T;

	let initialized = false;

	const subscribers = new Set<Subscriber<T>>();

	let stopSource: Unsubscriber | undefined;

	const start = () => {
		stopSource = source.subscribe((next) => {
			if (!initialized || !isEqual(value, next)) {
				initialized = true;
				value = next;
				for (const sub of subscribers) {
					sub(value);
				}
			}
		});
	};

	const stop = () => {
		stopSource?.();
		stopSource = undefined;
		initialized = false;
	};

	return {
		// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
		subscribe(run: Subscriber<T>): Unsubscriber {
			if (subscribers.size === 0) {
				start();
			}

			subscribers.add(run);

			if (initialized) {
				run(value);
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

/**
 * Compares two token arrays by length and token identity (symbol id).
 * Fast O(n) check — catches the common case of identical token lists
 * produced from unchanged inputs.
 */
// eslint-disable-next-line local-rules/prefer-object-params -- Being a comparison function, it's more ergonomic to take two separate arrays than an object param with two arrays.
export const tokenListEqual = <T extends { id: symbol }>(a: T[], b: T[]): boolean => {
	if (a.length !== b.length) {
		return false;
	}

	return a.every((item, i) => item.id === b[i].id);
};
