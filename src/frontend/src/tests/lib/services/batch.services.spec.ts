import { batchPromisesPerSecond } from '$lib/services/batch.services';

describe('batch.services', () => {
	describe('batchPromisesPerSecond', () => {
		const items = [1, 2, 3, 4, 5];
		const maxCallsPerSecond = 3;

		const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

		it('should execute promises in batches with throttling', async () => {
			const results: number[] = [];
			const promiseMock = vi.fn(async (item: number) => {
				results.push(item);
				await delay(10);
			});

			const generator = batchPromisesPerSecond({
				items,
				maxCallsPerSecond,
				promise: promiseMock
			});

			for await (const _ of generator) {
				// Do nothing
			}

			expect(promiseMock).toHaveBeenCalledTimes(items.length);
			expect(results).toEqual(items);
		});

		it('should skip items when beforePromise returns true', async () => {
			const skippedItems: number[] = [];
			const promiseMock = vi.fn(async () => {
				await delay(10);
			});

			// only odd numbers are processed
			const validate = vi.fn((item: number) => {
				if (item % 2 === 0) {
					skippedItems.push(item);
					return true;
				}
				return false;
			});

			const generator = batchPromisesPerSecond({
				items,
				maxCallsPerSecond,
				promise: promiseMock,
				validate
			});

			for await (const _ of generator) {
				// Do nothing
			}

			expect(validate).toHaveBeenCalledTimes(items.length);
			expect(promiseMock).toHaveBeenCalledTimes(3);
			expect(skippedItems).toEqual([2, 4]);
		});

		it('should call afterPromise after processing each item', async () => {
			const afterItems: number[] = [];
			const promiseMock = vi.fn(async () => {
				await delay(10);
			});
			const afterPromise = vi.fn((item: number) => {
				afterItems.push(item);
			});

			const generator = batchPromisesPerSecond({
				items,
				maxCallsPerSecond,
				promise: promiseMock,
				afterPromise
			});

			for await (const _ of generator) {
				// Do nothing
			}

			expect(afterPromise).toHaveBeenCalledTimes(items.length);
			expect(afterItems).toEqual(items);
		});

		it('should wait 1 second between batches', async () => {
			const promiseMock = vi.fn(async () => {
				await delay(10);
			});

			const generator = batchPromisesPerSecond({
				items,
				maxCallsPerSecond,
				promise: promiseMock
			});

			const start = Date.now();

			for await (const _ of generator) {
				// Do nothing
			}

			const end = Date.now();
			const expectedMinDuration = Math.ceil(items.length / maxCallsPerSecond) * 1000;

			expect(end - start).toBeGreaterThanOrEqual(expectedMinDuration - 10 * items.length);
		});

		it('should handle an empty items array gracefully', async () => {
			const promiseMock = vi.fn();

			const generator = batchPromisesPerSecond({
				items: [],
				maxCallsPerSecond,
				promise: promiseMock
			});

			for await (const _ of generator) {
				// Do nothing
			}

			expect(promiseMock).not.toHaveBeenCalled();
		});

		it('should process all items even when some promises fail', async () => {
			const results: number[] = [];
			const promiseMock = vi.fn(async (item: number) => {
				if (item === 2) {
					throw new Error('Test error');
				}
				results.push(item);
				await delay(10);
			});

			const generator = batchPromisesPerSecond({
				items,
				maxCallsPerSecond: 2,
				promise: promiseMock
			});

			for await (const _ of generator) {
				// Do nothing
			}

			expect(promiseMock).toHaveBeenCalledTimes(items.length);
			expect(results).toEqual([1, 3, 4, 5]);
		});
	});
});
