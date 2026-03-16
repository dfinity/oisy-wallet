import { derivedBatchedMemo } from '$lib/utils/derived-batched-memo.utils';
import { tick } from 'svelte';
import { get, writable } from 'svelte/store';

// eslint-disable-next-line local-rules/prefer-object-params
const arrayEqual = (a: number[], b: number[]): boolean =>
	a.length === b.length && a.every((v, i) => v === b[i]);

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

describe('derived-batched-memo.utils', () => {
	describe('derivedBatchedMemo', () => {
		const BATCH_SIZE = 3;

		describe('initial emission', () => {
			it('should emit the full initial value synchronously on first subscribe', () => {
				const source = writable(range(8));
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				expect(values).toEqual([range(8)]);

				unsubscribe();
			});

			it('should be compatible with get()', () => {
				const source = writable(range(15));
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				expect(get(store)).toEqual(range(15));
			});

			it('should emit empty array when source produces empty list', () => {
				const source = writable<number[]>([]);
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				expect(get(store)).toEqual([]);
			});

			it('should emit single item', () => {
				const source = writable([42]);
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				expect(get(store)).toEqual([42]);
			});
		});

		describe('batched subsequent updates', () => {
			it('should emit subsequent small updates at once when count is below batch size', () => {
				const source = writable([1]);
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				source.set([1, 2]);

				expect(values).toEqual([[1], [1, 2]]);

				unsubscribe();
			});

			it('should emit subsequent updates at once when count equals batch size', () => {
				const source = writable([1]);
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				source.set([1, 2, 3]);

				expect(values).toEqual([[1], [1, 2, 3]]);

				unsubscribe();
			});

			it('should emit subsequent updates in batches when count exceeds batch size', async () => {
				const source = writable<number[]>([]);
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				expect(values).toEqual([[]]);

				source.set(range(8));

				expect(values).toEqual([[], range(3)]);

				await tick();
				expect(values).toEqual([[], range(3), range(6)]);

				await tick();
				expect(values).toEqual([[], range(3), range(6), range(8)]);

				unsubscribe();
			});

			it('should handle exact multiples of batch size', async () => {
				const source = writable<number[]>([]);
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				source.set(range(6));

				expect(values).toEqual([[], range(3)]);

				await tick();
				expect(values).toEqual([[], range(3), range(6)]);

				unsubscribe();
			});

			it('should handle remainder in last batch', async () => {
				const source = writable<number[]>([]);
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				source.set(range(5));

				expect(values).toEqual([[], range(3)]);

				await tick();
				expect(values).toEqual([[], range(3), range(5)]);

				unsubscribe();
			});
		});

		describe('source update mid-batch', () => {
			it('should cancel in-progress batching when source updates with small value', async () => {
				const source = writable<number[]>([]);
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				source.set(range(8));
				expect(values).toEqual([[], range(3)]);

				source.set(range(2));
				expect(values).toEqual([[], range(3), range(2)]);

				await tick();
				await tick();

				expect(values).toEqual([[], range(3), range(2)]);

				unsubscribe();
			});

			it('should not regress below already-emitted count on source update', async () => {
				const source = writable<number[]>([]);
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				source.set(range(8));
				expect(values).toEqual([[], range(3)]);

				await tick();
				expect(values).toEqual([[], range(3), range(6)]);

				source.set(range(12));

				expect(values).toEqual([[], range(3), range(6), range(9)]);

				await tick();
				expect(values).toEqual([[], range(3), range(6), range(9), range(12)]);

				unsubscribe();
			});

			it('should emit immediately when source shrinks mid-batch', async () => {
				const source = writable<number[]>([]);
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				source.set(range(8));
				expect(values).toEqual([[], range(3)]);

				source.set([1, 2]);
				expect(values).toEqual([[], range(3), [1, 2]]);

				await tick();
				await tick();

				expect(values).toEqual([[], range(3), [1, 2]]);

				unsubscribe();
			});
		});

		describe('multiple source stores', () => {
			it('should batch correctly when one of multiple sources updates', async () => {
				const s1 = writable([1, 2]);
				const s2 = writable([3, 4]);

				const store = derivedBatchedMemo(
					[s1, s2],
					([$s1, $s2]) => [...$s1, ...$s2],
					arrayEqual,
					BATCH_SIZE
				);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				expect(values).toEqual([[1, 2, 3, 4]]);

				s2.set([3, 4, 5, 6, 7, 8, 9]);

				expect(values).toEqual([[1, 2, 3, 4], range(6)]);

				await tick();
				expect(values).toEqual([[1, 2, 3, 4], range(6), range(9)]);

				unsubscribe();
			});
		});

		describe('equality / memo', () => {
			it('should not emit when derived value stays equal', async () => {
				const source = writable(range(5));
				const store = derivedBatchedMemo(source, ($s) => [...$s], arrayEqual, BATCH_SIZE);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				expect(values).toEqual([range(5)]);

				source.set([...range(5)]);

				await tick();

				expect(values).toEqual([range(5)]);

				unsubscribe();
			});

			it('should use the provided equality function for deduplication', async () => {
				const source = writable(range(5));

				const store = derivedBatchedMemo(
					source,
					($s) => $s,
					// eslint-disable-next-line local-rules/prefer-object-params
					(a, b) => a.length === b.length,
					BATCH_SIZE
				);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				expect(values).toEqual([range(5)]);

				source.set([10, 20, 30, 40, 50]);

				await tick();

				expect(values).toEqual([range(5)]);

				unsubscribe();
			});

			it('should allow an equality function that always returns true after the initial emission', () => {
				const source = writable([1, 2, 3]);
				const store = derivedBatchedMemo(
					source,
					($s) => $s,
					() => true,
					BATCH_SIZE
				);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				source.set([4, 5, 6]);
				source.set([7, 8, 9]);

				expect(values).toEqual([[1, 2, 3]]);

				unsubscribe();
			});
		});

		describe('subscriber management', () => {
			it('should notify all active subscribers on batched updates', async () => {
				const source = writable<number[]>([]);
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const firstValues: number[][] = [];
				const secondValues: number[][] = [];

				const unsubscribeFirst = store.subscribe((value) => {
					firstValues.push([...value]);
				});

				const unsubscribeSecond = store.subscribe((value) => {
					secondValues.push([...value]);
				});

				source.set(range(5));

				expect(firstValues).toEqual([[], range(3)]);
				expect(secondValues).toEqual([[], range(3)]);

				await tick();

				expect(firstValues).toEqual([[], range(3), range(5)]);
				expect(secondValues).toEqual([[], range(3), range(5)]);

				unsubscribeFirst();
				unsubscribeSecond();
			});

			it('should emit current value to later subscribers mid-batch', async () => {
				const source = writable<number[]>([]);
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const firstValues: number[][] = [];
				const unsubscribeFirst = store.subscribe((value) => {
					firstValues.push([...value]);
				});

				source.set(range(8));

				await tick();
				expect(firstValues).toEqual([[], range(3), range(6)]);

				const secondValues: number[][] = [];
				const unsubscribeSecond = store.subscribe((value) => {
					secondValues.push([...value]);
				});

				expect(secondValues).toEqual([range(6)]);

				await tick();

				expect(firstValues).toEqual([[], range(3), range(6), range(8)]);
				expect(secondValues).toEqual([range(6), range(8)]);

				unsubscribeFirst();
				unsubscribeSecond();
			});

			it('should stop notifying an unsubscribed subscriber while continuing to notify active subscribers', async () => {
				const source = writable<number[]>([]);
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const firstValues: number[][] = [];
				const secondValues: number[][] = [];

				const unsubscribeFirst = store.subscribe((value) => {
					firstValues.push([...value]);
				});

				const unsubscribeSecond = store.subscribe((value) => {
					secondValues.push([...value]);
				});

				source.set(range(8));

				unsubscribeFirst();

				await tick();
				await tick();

				expect(firstValues).toEqual([[], range(3)]);
				expect(secondValues).toEqual([[], range(3), range(6), range(8)]);

				unsubscribeSecond();
			});

			it('should stop reacting to source updates after the last subscriber unsubscribes', () => {
				const source = writable(range(2));
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const values: number[][] = [];
				const unsubscribe = store.subscribe((value) => {
					values.push([...value]);
				});

				unsubscribe();
				source.set(range(5));

				expect(values).toEqual([[1, 2]]);
			});

			it('should resubscribe to the source when a new subscriber appears after all unsubscribed', async () => {
				const source = writable(range(2));
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const firstValues: number[][] = [];
				const unsubscribeFirst = store.subscribe((value) => {
					firstValues.push([...value]);
				});

				unsubscribeFirst();

				source.set(range(5));

				const secondValues: number[][] = [];
				const unsubscribeSecond = store.subscribe((value) => {
					secondValues.push([...value]);
				});

				expect(firstValues).toEqual([[1, 2]]);
				expect(secondValues).toEqual([range(5)]);

				unsubscribeSecond();
			});

			it('should immediately emit the current memoised value to later subscribers', () => {
				const source = writable(range(5));
				const store = derivedBatchedMemo(source, ($s) => $s, arrayEqual, BATCH_SIZE);

				const firstValues: number[][] = [];
				const secondValues: number[][] = [];

				const unsubscribeFirst = store.subscribe((value) => {
					firstValues.push([...value]);
				});

				source.set(range(2));

				const unsubscribeSecond = store.subscribe((value) => {
					secondValues.push([...value]);
				});

				expect(firstValues).toEqual([range(5), range(2)]);
				expect(secondValues).toEqual([range(2)]);

				unsubscribeFirst();
				unsubscribeSecond();
			});
		});
	});
});
