import { TimeoutError } from '$lib/types/errors';
import { untilAborted, withDeadline, withTimeout } from '$lib/utils/timeout.utils';

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

		it.each([
			{ name: 'still pending', operation: () => new Promise(() => undefined) },
			{ name: 'already fulfilled', operation: () => Promise.resolve('answer') },
			{ name: 'already rejected', operation: () => Promise.reject(new Error('rpc down')) }
		])(
			'should reject at once when the signal has already aborted, the operation $name',
			async ({ operation }) => {
				const controller = new AbortController();
				controller.abort(deadline);

				await expect(
					untilAborted({ operation: operation(), signal: controller.signal })
				).rejects.toBe(deadline);
			}
		);

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

	describe('withTimeout', () => {
		const milliseconds = 1_000;

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should settle with the value of a promise that answers in time', async () => {
			await expect(withTimeout({ promise: Promise.resolve('answer'), milliseconds })).resolves.toBe(
				'answer'
			);
		});

		it('should settle with the error of a promise that fails in time', async () => {
			const err = new Error('failed');

			await expect(withTimeout({ promise: Promise.reject(err), milliseconds })).rejects.toBe(err);
		});

		it('should reject with a TimeoutError once the time is up', async () => {
			// The rejection is taken as a value, so that it is handled the moment the timer produces it.
			const outcome = withTimeout({ promise: new Promise(() => {}), milliseconds }).catch(
				(err: unknown) => err
			);

			await vi.advanceTimersByTimeAsync(milliseconds);

			await expect(outcome).resolves.toBeInstanceOf(TimeoutError);
			await expect(outcome).resolves.toHaveProperty('message', 'No answer within 1000 ms');
		});

		it('should wait the whole time before giving up', async () => {
			let settled = false;

			withTimeout({ promise: new Promise(() => {}), milliseconds }).catch(() => {
				settled = true;
			});

			await vi.advanceTimersByTimeAsync(milliseconds - 1);

			expect(settled).toBeFalsy();

			await vi.advanceTimersByTimeAsync(1);

			expect(settled).toBeTruthy();
		});

		it('should leave no timer behind once the promise has settled', async () => {
			await withTimeout({ promise: Promise.resolve('answer'), milliseconds });

			expect(vi.getTimerCount()).toBe(0);
		});
	});
});
