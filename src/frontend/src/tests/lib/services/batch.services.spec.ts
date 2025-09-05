import { batch } from '$lib/services/batch.services';

describe('batch.services', () => {
	describe('batch', () => {
		const values = [1, 2, 3, 4, 5];
		const batchSize = 3;

		const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

		it('should execute promises in batches with throttling', async () => {
			const results: number[] = [];
			const promises = values.map((value) => async () => {
				results.push(value);
				await delay(10);
			});

			const generator = batch({
				promises,
				batchSize
			});

			for await (const _ of generator) {
				// Do nothing
			}

			expect(results).toEqual(values);
		});

		it('should wait 1 second between batches', async () => {
			const promises = values.map(() => async () => {
				await delay(10);
			});

			const generator = batch({
				promises,
				batchSize
			});

			const start = Date.now();

			for await (const _ of generator) {
				// Do nothing
			}

			const end = Date.now();
			const expectedMinDuration = Math.ceil(values.length / batchSize) * 1000;

			expect(end - start).toBeGreaterThanOrEqual(expectedMinDuration - 10 * values.length);
		});

		it('should handle an empty promises array gracefully', () => {
			const allSettledSpy = vi.spyOn(Promise, 'allSettled');

			const generator = batch({
				promises: [],
				batchSize
			});

			expect(async () => {
				for await (const _ of generator) {
					// Do nothing
				}
			}).not.toThrow();

			expect(allSettledSpy).not.toHaveBeenCalled();

			allSettledSpy.mockRestore();
		});

		it('should process all promises even when some fail', async () => {
			const results: number[] = [];

			const promises = values.map((value) => async () => {
				if (value === 2) {
					throw new Error('Test error');
				}
				results.push(value);
				await delay(10);
			});

			const generator = batch({
				promises,
				batchSize
			});

			for await (const _ of generator) {
				// Do nothing
			}

			expect(results).toEqual([1, 3, 4, 5]);
		});
	});
});
