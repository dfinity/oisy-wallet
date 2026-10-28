import { untilAborted, withDeadline } from '$lib/utils/timeout.utils';

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

	describe('untilAborted', () => {
		const deadline = new DOMException('The operation timed out.', 'TimeoutError');

		it('should resolve with the operation when it settles first', async () => {
			const controller = new AbortController();

			await expect(
				untilAborted({ operation: Promise.resolve('answer'), signal: controller.signal })
			).resolves.toBe('answer');
		});

		it('should reject with the operation when it fails first', async () => {
			const failure = new Error('rpc down');

			await expect(
				untilAborted({
					operation: Promise.reject(failure),
					signal: new AbortController().signal
				})
			).rejects.toBe(failure);
		});

		it("should reject with the signal's reason once it aborts, while the operation still runs", async () => {
			const controller = new AbortController();
			const pending = untilAborted({
				operation: new Promise(() => undefined),
				signal: controller.signal
			});

			controller.abort(deadline);

			await expect(pending).rejects.toBe(deadline);
		});

		it('should reject at once when the signal has already aborted', async () => {
			const controller = new AbortController();
			controller.abort(deadline);

			await expect(
				untilAborted({ operation: new Promise(() => undefined), signal: controller.signal })
			).rejects.toBe(deadline);
		});

		it('should leave no listener on the signal once settled', async () => {
			const controller = new AbortController();
			const removeEventListener = vi.spyOn(controller.signal, 'removeEventListener');

			await untilAborted({ operation: Promise.resolve('answer'), signal: controller.signal });

			expect(removeEventListener).toHaveBeenCalledExactlyOnceWith('abort', expect.any(Function));
		});

		it('should handle a rejection the operation settles with after the signal aborted', async () => {
			const controller = new AbortController();
			let fail: (err: Error) => void = () => undefined;
			const operation = new Promise<string>((_, reject) => {
				fail = reject;
			});

			const pending = untilAborted({ operation, signal: controller.signal });
			controller.abort(deadline);

			await expect(pending).rejects.toBe(deadline);

			// Left unhandled, this would fail the run.
			fail(new Error('too late'));
			await Promise.resolve();
		});
	});
});
