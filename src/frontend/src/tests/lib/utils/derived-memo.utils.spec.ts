import { derivedMemo } from '$lib/utils/derived-memo.utils';
import { writable } from 'svelte/store';

describe('derived-memo.utils', () => {
	describe('derivedMemo', () => {
		it('should emit the initial derived value to the first subscriber', () => {
			const source = writable(2);
			const store = derivedMemo(source, ($source) => $source * 2, Object.is);

			const values: number[] = [];
			const unsubscribe = store.subscribe((value) => {
				values.push(value);
			});

			expect(values).toEqual([4]);

			unsubscribe();
		});

		it('should notify subscribers when the derived value changes', () => {
			const source = writable(1);
			const store = derivedMemo(source, ($source) => $source + 1, Object.is);

			const values: number[] = [];
			const unsubscribe = store.subscribe((value) => {
				values.push(value);
			});

			source.set(2);
			source.set(3);

			expect(values).toEqual([2, 3, 4]);

			unsubscribe();
		});

		it('should not notify subscribers when the derived value stays equal', () => {
			const source = writable(1);
			const store = derivedMemo(source, ($source) => $source % 2 === 0, Object.is);

			const values: boolean[] = [];
			const unsubscribe = store.subscribe((value) => {
				values.push(value);
			});

			source.set(3);
			source.set(5);
			source.set(2);
			source.set(4);
			source.set(8);
			source.set(7);

			expect(values).toEqual([false, true, false]);

			unsubscribe();
		});

		it('should support multiple source stores', () => {
			const left = writable(1);
			const right = writable(2);

			const store = derivedMemo([left, right], ([$left, $right]) => $left + $right, Object.is);

			const values: number[] = [];
			const unsubscribe = store.subscribe((value) => {
				values.push(value);
			});

			left.set(3);
			right.set(4);

			expect(values).toEqual([3, 5, 7]);

			unsubscribe();
		});

		it('should not notify subscribers when multiple source updates produce the same derived value', () => {
			const left = writable(1);
			const right = writable(2);

			const store = derivedMemo([left, right], ([$left, $right]) => $left + $right, Object.is);

			const values: number[] = [];
			const unsubscribe = store.subscribe((value) => {
				values.push(value);
			});

			left.set(2); // sum = 4
			right.set(2); // sum = 4 again
			left.set(1); // sum = 3
			right.set(3); // sum = 4
			right.set(3); // unchanged source value, writable still dedupes, but behaviour remains fine

			expect(values).toEqual([3, 4, 3, 4]);

			unsubscribe();
		});

		it('should notify all active subscribers when the derived value changes', () => {
			const source = writable(10);
			const store = derivedMemo(source, ($source) => $source / 2, Object.is);

			const firstValues: number[] = [];
			const secondValues: number[] = [];

			const unsubscribeFirst = store.subscribe((value) => {
				firstValues.push(value);
			});

			const unsubscribeSecond = store.subscribe((value) => {
				secondValues.push(value);
			});

			source.set(20);

			expect(firstValues).toEqual([5, 10]);
			expect(secondValues).toEqual([5, 10]);

			unsubscribeFirst();
			unsubscribeSecond();
		});

		it('should immediately emit the current memoised value to later subscribers', () => {
			const source = writable(1);
			const store = derivedMemo(source, ($source) => $source * 10, Object.is);

			const firstValues: number[] = [];
			const secondValues: number[] = [];

			const unsubscribeFirst = store.subscribe((value) => {
				firstValues.push(value);
			});

			source.set(2);

			const unsubscribeSecond = store.subscribe((value) => {
				secondValues.push(value);
			});

			expect(firstValues).toEqual([10, 20]);
			expect(secondValues).toEqual([20]);

			unsubscribeFirst();
			unsubscribeSecond();
		});

		it('should stop notifying an unsubscribed subscriber while continuing to notify active subscribers', () => {
			const source = writable(1);
			const store = derivedMemo(source, ($source) => $source * 3, Object.is);

			const firstValues: number[] = [];
			const secondValues: number[] = [];

			const unsubscribeFirst = store.subscribe((value) => {
				firstValues.push(value);
			});

			const unsubscribeSecond = store.subscribe((value) => {
				secondValues.push(value);
			});

			unsubscribeFirst();
			source.set(2);

			expect(firstValues).toEqual([3]);
			expect(secondValues).toEqual([3, 6]);

			unsubscribeSecond();
		});

		it('should stop reacting to source updates after the last subscriber unsubscribes', () => {
			const source = writable(1);
			const store = derivedMemo(source, ($source) => $source * 10, Object.is);

			const values: number[] = [];
			const unsubscribe = store.subscribe((value) => {
				values.push(value);
			});

			unsubscribe();
			source.set(2);
			source.set(3);

			expect(values).toEqual([10]);
		});

		it('should resubscribe to the source when a new subscriber appears after all subscribers unsubscribed', () => {
			const source = writable(1);
			const store = derivedMemo(source, ($source) => $source * 2, Object.is);

			const firstValues: number[] = [];
			const secondValues: number[] = [];

			const unsubscribeFirst = store.subscribe((value) => {
				firstValues.push(value);
			});

			unsubscribeFirst();

			source.set(5);

			const unsubscribeSecond = store.subscribe((value) => {
				secondValues.push(value);
			});

			expect(firstValues).toEqual([2]);
			expect(secondValues).toEqual([10]);

			unsubscribeSecond();
		});

		it('should use the provided equality function for object outputs', () => {
			const source = writable(1);
			const store = derivedMemo(
				source,
				($source) => ({ parity: $source % 2 === 0 ? 'even' : 'odd' }),
				// eslint-disable-next-line local-rules/prefer-object-params
				(a, b) => a.parity === b.parity
			);

			const values: Array<{ parity: string }> = [];
			const unsubscribe = store.subscribe((value) => {
				values.push(value);
			});

			source.set(3);
			source.set(5);
			source.set(2);
			source.set(4);

			expect(values).toEqual([{ parity: 'odd' }, { parity: 'even' }]);

			unsubscribe();
		});

		it('should allow an equality function that always returns true after the initial emission', () => {
			const source = writable(1);
			const store = derivedMemo(
				source,
				($source) => $source * 100,
				() => true
			);

			const values: number[] = [];
			const unsubscribe = store.subscribe((value) => {
				values.push(value);
			});

			source.set(2);
			source.set(3);

			expect(values).toEqual([100]);

			unsubscribe();
		});

		it('should handle undefined as a valid derived value', () => {
			const source = writable(1);
			const store = derivedMemo(
				source,
				($source) => ($source > 1 ? 'value' : undefined),
				Object.is
			);

			const values: Array<string | undefined> = [];
			const unsubscribe = store.subscribe((value) => {
				values.push(value);
			});

			source.set(2);
			source.set(0);

			expect(values).toEqual([undefined, 'value', undefined]);

			unsubscribe();
		});

		it('should handle null as a valid derived value', () => {
			const source = writable(0);
			const store = derivedMemo(source, ($source) => ($source === 0 ? null : $source), Object.is);

			const values: Array<number | null> = [];
			const unsubscribe = store.subscribe((value) => {
				values.push(value);
			});

			source.set(1);
			source.set(0);

			expect(values).toEqual([null, 1, null]);

			unsubscribe();
		});

		it('should not emit duplicate NaN values when using Object.is', () => {
			const source = writable(0);
			const store = derivedMemo(source, () => Number.NaN, Object.is);

			const values: number[] = [];
			const unsubscribe = store.subscribe((value) => {
				values.push(value);
			});

			source.set(1);
			source.set(2);

			expect(values).toHaveLength(1);
			expect(Number.isNaN(values[0])).toBeTruthy();

			unsubscribe();
		});

		it('should not notify when the same array reference is returned', () => {
			const source = writable(1);
			const stable: number[] = [];
			const store = derivedMemo(source, () => stable, Object.is);

			const values: number[][] = [];
			const unsubscribe = store.subscribe((value) => {
				values.push(value);
			});

			source.set(2);
			source.set(3);

			expect(values).toEqual([stable]);

			unsubscribe();
		});
	});
});
