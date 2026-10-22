import { withDeadline } from '$lib/utils/timeout.utils';

describe('timeout.utils', () => {
	describe('withDeadline', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should resolve with what the operation answered', async () => {
			await expect(
				withDeadline({
					operation: Promise.resolve('answered'),
					fallback: 'fallback',
					milliseconds: 1000
				})
			).resolves.toBe('answered');
		});

		it('should resolve with the fallback when the operation never settles', async () => {
			// The failure this exists for: a promise that neither resolves nor rejects, as a wedged
			// IndexedDB request does. Nothing here is catchable.
			const promise = withDeadline({
				operation: new Promise<string>(() => {}),
				fallback: 'fallback',
				milliseconds: 1000
			});

			await vi.advanceTimersByTimeAsync(1000);

			await expect(promise).resolves.toBe('fallback');
		});

		it('should not answer before the deadline is reached', async () => {
			let settled = false;

			const promise = withDeadline({
				operation: new Promise<string>(() => {}),
				fallback: 'fallback',
				milliseconds: 1000
			}).then((value) => {
				settled = true;

				return value;
			});

			await vi.advanceTimersByTimeAsync(999);

			expect(settled).toBeFalsy();

			await vi.advanceTimersByTimeAsync(1);

			await promise;

			expect(settled).toBeTruthy();
		});

		it('should let a rejection through rather than hiding it as the fallback', async () => {
			// A deadline is for an operation that says nothing at all. One that fails still fails, so the
			// caller's own error handling stays in charge.
			await expect(
				withDeadline({
					operation: Promise.reject(new Error('refused')),
					fallback: 'fallback',
					milliseconds: 1000
				})
			).rejects.toThrow('refused');
		});

		it('should not keep the process awake once the operation answered', async () => {
			await withDeadline({
				operation: Promise.resolve('answered'),
				fallback: 'fallback',
				milliseconds: 1000
			});

			// The deadline timer is cleared, so nothing is left pending behind the answer.
			expect(vi.getTimerCount()).toBe(0);
		});
	});
});
