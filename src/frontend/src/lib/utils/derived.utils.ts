import { jsonReplacer } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * A wrapper around Svelte's `derived` store that only emits a new value if the derived value
 * has changed according to a custom comparison function (defaulting to a deep equality check).
 *
 * This is useful to prevent "cascading updates" where a store update triggers downstream
 * re-renders even if the final derived value remains functionally identical (e.g., a new array
 * reference with the same content).
 *
 * @param stores - One or more stores to derive from.
 * @param fn - The derivation function.
 * @param isEqual - A comparison function to determine if the value has changed.
 */
// eslint-disable-next-line local-rules/prefer-object-params
export const guardedDerived = <S extends Readable<any> | [Readable<any>, ...Readable<any>[]], T>(
	stores: S,
	fn: (
		values: S extends Readable<infer U>
			? U
			: { [K in keyof S]: S[K] extends Readable<infer U> ? U : never },
		set: (value: T) => void,
		update: (fn: (value: T) => T) => void
	) => void | (() => void),
	// eslint-disable-next-line local-rules/prefer-object-params
	isEqual: (a: T, b: T) => boolean = (a, b) =>
		JSON.stringify(a, jsonReplacer, 8) === JSON.stringify(b, jsonReplacer, 8)
): Readable<T> => {
	let lastValue: T | undefined;

	return derived(
		stores,
		// eslint-disable-next-line local-rules/prefer-object-params
		(values, set, update) => {
			const result = (fn as any)(
				values,
				(newValue: T) => {
					if (lastValue === undefined || !isEqual(lastValue, newValue)) {
						lastValue = newValue;
						set(newValue);
					}
				},
				update
			);

			return result;
		},
		undefined as unknown as T
	);
};

/**
 * A simpler version of guardedDerived for single-value derivations (not using set/update).
 */
// eslint-disable-next-line local-rules/prefer-object-params
export const distinctDerived = <S extends Readable<any> | [Readable<any>, ...Readable<any>[]], T>(
	stores: S,
	fn: (
		values: S extends Readable<infer U>
			? U
			: { [K in keyof S]: S[K] extends Readable<infer U> ? U : never }
	) => T,
	// eslint-disable-next-line local-rules/prefer-object-params
	isEqual: (a: T, b: T) => boolean = (a, b) =>
		JSON.stringify(a, jsonReplacer, 8) === JSON.stringify(b, jsonReplacer, 8)
): Readable<T> => {
	const s = derived(stores, fn);

	return {
		subscribe: (run: (value: T) => void) => {
			let lastValue: T | undefined;
			return s.subscribe((newValue) => {
				if (lastValue === undefined || !isEqual(lastValue, newValue)) {
					lastValue = newValue;
					run(newValue);
				}
			});
		}
	};
};
