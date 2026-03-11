import type { ExchangesData } from '$lib/types/exchange';
import type { TokenId } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
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
 * Compares two TokenUi arrays by id, balance, and USD balance.
 * Prevents re-renders when balance updates for tokens outside the current view
 * produce an identical mapped result.
 */
// eslint-disable-next-line local-rules/prefer-object-params
export const tokenUiListEqual = (a: TokenUi[], b: TokenUi[]): boolean => {
	if (a.length !== b.length) {
		return false;
	}
	return a.every((item, i) => {
		const other = b[i];
		return (
			item.id === other.id && item.balance === other.balance && item.usdBalance === other.usdBalance
		);
	});
};

/**
 * Compares two ExchangesData records by symbol keys and usd price.
 * Uses Object.getOwnPropertySymbols since TokenId keys are JS symbols.
 */
// eslint-disable-next-line local-rules/prefer-object-params
export const exchangesDataEqual = (a: ExchangesData, b: ExchangesData): boolean => {
	const keysA = Object.getOwnPropertySymbols(a);
	const keysB = Object.getOwnPropertySymbols(b);
	if (keysA.length !== keysB.length) {
		return false;
	}
	return keysA.every((k) => {
		const va = a[k as TokenId];
		const vb = b[k as TokenId];
		if (va === vb) {
			return true;
		}
		if (va === undefined || vb === undefined) {
			return false;
		}
		return va.usd === vb.usd;
	});
};

// eslint-disable-next-line local-rules/prefer-object-params
export const primitiveArrayEqual = <T extends string | number | boolean>(
	a: T[],
	b: T[]
): boolean => {
	if (a.length !== b.length) {
		return false;
	}
	return a.every((v, i) => v === b[i]);
};
