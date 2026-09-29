import { TimeoutError } from '$lib/types/errors';
import { withTimeout } from '$lib/utils/timeout.utils';

describe('timeout.utils', () => {
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
