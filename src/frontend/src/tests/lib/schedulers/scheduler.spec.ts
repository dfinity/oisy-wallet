import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { SchedulerTimer } from '$lib/schedulers/scheduler';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { MockInstance } from 'vitest';

vi.mock('$lib/providers/auth-client.providers', async (importActual) => {
	const authClientProvider = vi.fn().mockReturnValue({
		loadIdentity: vi.fn()
	});

	return {
		...(await importActual()),
		AuthClientProvider: Object.assign(authClientProvider, {
			getInstance: authClientProvider
		})
	};
});

describe('scheduler', () => {
	describe('SchedulerTimer', () => {
		const provider = AuthClientProvider.getInstance();

		let originalPostmessage: unknown;

		let scheduler: SchedulerTimer;

		const mockInterval = 10000;
		const mockJob = vi.fn();
		const mockData = { value: 'mock-data' };

		const mockParams = {
			interval: mockInterval,
			job: mockJob,
			data: mockData
		};

		const statusMsg = 'syncIcWalletStatus';

		const postMessageMock = vi.fn();

		beforeAll(() => {
			originalPostmessage = window.postMessage;
			window.postMessage = postMessageMock;
		});

		beforeEach(() => {
			vi.clearAllMocks();
			vi.useFakeTimers();

			scheduler = new SchedulerTimer(statusMsg);

			vi.mocked(provider.loadIdentity).mockResolvedValue(mockIdentity);
		});

		afterEach(() => {
			scheduler.stop();

			vi.useRealTimers();
		});

		afterAll(() => {
			// @ts-expect-error redo original
			window.postMessage = originalPostmessage;
		});

		describe('start', () => {
			it('should not start if identity is nullish after all retries', async () => {
				const loadIdentity = vi.spyOn(provider, 'loadIdentity').mockResolvedValue(undefined);

				const startPromise = scheduler.start(mockParams);

				// 1 initial attempt + 3 retries with 1_000ms delay between each
				await vi.advanceTimersByTimeAsync(3_000);

				await startPromise;

				// 1 initial attempt + 3 retries = 4
				expect(loadIdentity).toHaveBeenCalledTimes(4);

				expect(console.error).toHaveBeenCalledOnce();
				expect(console.error).toHaveBeenNthCalledWith(
					1,
					'Attempted to initiate a worker without an authenticated identity.'
				);

				expect(mockJob).not.toHaveBeenCalled();
			});

			it('should succeed after retrying identity load', async () => {
				const loadIdentity = vi
					.spyOn(provider, 'loadIdentity')
					.mockResolvedValueOnce(undefined)
					.mockResolvedValueOnce(undefined)
					.mockResolvedValueOnce(mockIdentity);

				const startPromise = scheduler.start(mockParams);

				// Advance past 2 retry delays (2 × 1_000ms)
				await vi.advanceTimersByTimeAsync(2_000);

				await startPromise;

				expect(loadIdentity).toHaveBeenCalledTimes(3);
				expect(mockJob).toHaveBeenCalledOnce();
				expect(console.error).not.toHaveBeenCalled();
			});

			// A worker does not await one message before handling the next, so a stop can arrive while a
			// start still awaits the identity.
			it('should not start when stopped while it loads the identity', async () => {
				let resolveIdentity: (identity: typeof mockIdentity) => void = () => {};

				vi.spyOn(provider, 'loadIdentity').mockReturnValueOnce(
					new Promise((resolve) => (resolveIdentity = resolve))
				);

				const startPromise = scheduler.start(mockParams);

				scheduler.stop();

				resolveIdentity(mockIdentity);

				await startPromise;

				await vi.advanceTimersByTimeAsync(mockInterval * 2);

				expect(mockJob).not.toHaveBeenCalled();
				expect(scheduler['timer']).toBeUndefined();
			});

			it('should start again once stopped and started anew', async () => {
				await scheduler.start(mockParams);

				scheduler.stop();

				await scheduler.start(mockParams);

				expect(mockJob).toHaveBeenCalledTimes(2);
				expect(scheduler['timer']).toBeDefined();
			});

			it('should post initial and final status messages', async () => {
				await scheduler.start(mockParams);

				expect(postMessageMock).toHaveBeenCalledTimes(2);
				expect(postMessageMock).toHaveBeenNthCalledWith(1, {
					msg: statusMsg,
					data: { state: 'in_progress' }
				});
				expect(postMessageMock).toHaveBeenNthCalledWith(2, {
					msg: statusMsg,
					data: { state: 'idle' }
				});
			});

			it('should execute job once immediately', async () => {
				await scheduler.start(mockParams);

				expect(mockJob).toHaveBeenCalledOnce();
				expect(mockJob).toHaveBeenNthCalledWith(1, { identity: mockIdentity, data: mockData });
			});

			it('should set interval for the job', async () => {
				await scheduler.start(mockParams);

				vi.advanceTimersByTime(mockInterval);

				expect(mockJob).toHaveBeenCalledTimes(2);
				expect(mockJob).toHaveBeenNthCalledWith(1, { identity: mockIdentity, data: mockData });
				expect(mockJob).toHaveBeenNthCalledWith(2, { identity: mockIdentity, data: mockData });
			});

			it('should not start a second timer if one exists', async () => {
				vi.useRealTimers();

				await scheduler.start(mockParams);
				await scheduler.start(mockParams);

				expect(mockJob).toHaveBeenCalledOnce();
			});

			it('should not execute the job twice if one is in progress', async () => {
				vi.useRealTimers();

				mockJob.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 1000)));

				setTimeout(async () => await scheduler.start(mockParams), 500);

				await scheduler.start(mockParams);

				expect(mockJob).toHaveBeenCalledOnce();
			});

			it('should not set timer if interval is not provided', async () => {
				await scheduler.start({ ...mockParams, interval: 'disabled' });

				expect(mockJob).toHaveBeenCalledOnce();

				vi.advanceTimersByTime(mockInterval * 10);

				expect(mockJob).toHaveBeenCalledOnce();
			});

			it('should handle job errors', async () => {
				mockJob.mockRejectedValueOnce(new Error('Job failed'));

				await scheduler.start(mockParams);

				expect(mockJob).toHaveBeenCalledOnce();

				expect(console.error).toHaveBeenCalledOnce();
				expect(console.error).toHaveBeenNthCalledWith(1, new Error('Job failed'));

				expect(postMessageMock).toHaveBeenCalledTimes(3);
				expect(postMessageMock).toHaveBeenNthCalledWith(1, {
					msg: statusMsg,
					data: { state: 'in_progress' }
				});
				expect(postMessageMock).toHaveBeenNthCalledWith(2, {
					msg: statusMsg,
					data: { state: 'error' }
				});
				expect(postMessageMock).toHaveBeenNthCalledWith(3, {
					msg: statusMsg,
					data: { state: 'idle' }
				});
			});

			it('should stop the timer if job throws error', async () => {
				mockJob.mockRejectedValueOnce(new Error('Job failed'));

				await scheduler.start(mockParams);

				expect(mockJob).toHaveBeenCalledOnce();

				vi.advanceTimersByTime(mockInterval * 10);

				expect(mockJob).toHaveBeenCalledOnce();
			});
		});

		// `stop` does not cancel a job that is already awaiting, so a stop/start pair leaves the
		// previous job running alongside the new one. The previous job must not report on the shared
		// status once its generation has been superseded.
		describe('when a stop/start overlaps a running job', () => {
			const deferred = () => {
				let resolve: () => void = () => undefined;
				let reject: (err: unknown) => void = () => undefined;
				const promise = new Promise<void>((res, rej) => {
					resolve = res;
					reject = rej;
				});

				return { promise, resolve, reject };
			};

			it('should keep the new job able to post after the previous one completes', async () => {
				const first = deferred();
				const second = deferred();

				mockJob.mockImplementationOnce(() => first.promise);
				mockJob.mockImplementationOnce(() => second.promise);

				const firstStart = scheduler.start(mockParams);

				await vi.advanceTimersByTimeAsync(0);

				scheduler.stop();

				const secondStart = scheduler.start(mockParams);

				await vi.advanceTimersByTimeAsync(0);

				// The superseded job lands first and must not flip the status to idle.
				first.resolve();
				await vi.advanceTimersByTimeAsync(0);

				postMessageMock.mockClear();

				scheduler.postMsg({
					msg: 'syncIcpWallet',
					ref: 'mock-ref',
					data: { value: 'from-new-job' }
				});

				expect(postMessageMock).toHaveBeenCalledOnce();

				second.resolve();
				await Promise.all([firstStart, secondStart]);
			});

			it('should not stop the running timer when the superseded job fails', async () => {
				const first = deferred();
				const second = deferred();

				mockJob.mockImplementationOnce(() => first.promise);
				mockJob.mockImplementationOnce(() => second.promise);

				const firstStart = scheduler.start(mockParams);

				await vi.advanceTimersByTimeAsync(0);

				scheduler.stop();

				const secondStart = scheduler.start(mockParams);

				await vi.advanceTimersByTimeAsync(0);

				first.reject(new Error('superseded'));
				await vi.advanceTimersByTimeAsync(0);

				expect(scheduler['timer']).toBeDefined();

				second.resolve();
				await Promise.all([firstStart, secondStart]);
			});
		});

		describe('trigger', () => {
			const { interval: _, ...mockTriggerParams } = mockParams;

			it('should not trigger if identity is nullish', async () => {
				const loadIdentity = vi.spyOn(provider, 'loadIdentity').mockResolvedValueOnce(undefined);

				await scheduler.trigger(mockTriggerParams);

				expect(loadIdentity).toHaveBeenCalledOnce();

				expect(console.error).toHaveBeenCalledOnce();
				expect(console.error).toHaveBeenNthCalledWith(
					1,
					'Attempted to execute a worker without an authenticated identity.'
				);

				expect(mockJob).not.toHaveBeenCalled();
			});

			it('should post initial and final status messages', async () => {
				await scheduler.trigger(mockTriggerParams);

				expect(postMessageMock).toHaveBeenCalledTimes(2);
				expect(postMessageMock).toHaveBeenNthCalledWith(1, {
					msg: statusMsg,
					data: { state: 'in_progress' }
				});
				expect(postMessageMock).toHaveBeenNthCalledWith(2, {
					msg: statusMsg,
					data: { state: 'idle' }
				});
			});

			it('should execute job', async () => {
				await scheduler.trigger(mockTriggerParams);

				expect(mockJob).toHaveBeenCalledOnce();
				expect(mockJob).toHaveBeenNthCalledWith(1, { identity: mockIdentity, data: mockData });
			});

			it('should not set interval for the job', async () => {
				await scheduler.trigger(mockTriggerParams);

				expect(mockJob).toHaveBeenCalledOnce();

				vi.advanceTimersByTime(mockInterval * 10);

				expect(mockJob).toHaveBeenCalledOnce();
			});

			it('should not execute the job twice if one is in progress', async () => {
				vi.useRealTimers();

				mockJob.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 1000)));

				setTimeout(async () => await scheduler.trigger(mockTriggerParams), 500);

				await scheduler.trigger(mockTriggerParams);

				expect(mockJob).toHaveBeenCalledOnce();
			});

			it('should handle job errors', async () => {
				mockJob.mockRejectedValueOnce(new Error('Job failed'));

				await scheduler.trigger(mockTriggerParams);

				expect(mockJob).toHaveBeenCalledOnce();

				expect(console.error).toHaveBeenCalledOnce();
				expect(console.error).toHaveBeenNthCalledWith(1, new Error('Job failed'));

				expect(postMessageMock).toHaveBeenCalledTimes(3);
				expect(postMessageMock).toHaveBeenNthCalledWith(1, {
					msg: statusMsg,
					data: { state: 'in_progress' }
				});
				expect(postMessageMock).toHaveBeenNthCalledWith(2, {
					msg: statusMsg,
					data: { state: 'error' }
				});
				expect(postMessageMock).toHaveBeenNthCalledWith(3, {
					msg: statusMsg,
					data: { state: 'idle' }
				});
			});
		});

		describe('stop', () => {
			let spyClearTimeout: MockInstance;

			beforeEach(async () => {
				await scheduler.start(mockParams);

				spyClearTimeout = vi.spyOn(global, 'clearTimeout');
			});

			it('should stop the timer', () => {
				vi.clearAllMocks();

				scheduler.stop();

				expect(spyClearTimeout).toHaveBeenCalledOnce();

				expect(postMessageMock).toHaveBeenCalledOnce();
				expect(postMessageMock).toHaveBeenNthCalledWith(1, {
					msg: statusMsg,
					data: { state: 'idle' }
				});
			});

			it('should not throw if stop is called when timer is not running', () => {
				scheduler.stop();

				vi.clearAllMocks();

				scheduler.stop();

				expect(spyClearTimeout).not.toHaveBeenCalled();

				expect(postMessageMock).toHaveBeenCalledOnce();
				expect(postMessageMock).toHaveBeenNthCalledWith(1, {
					msg: statusMsg,
					data: { state: 'idle' }
				});
			});
		});

		describe('postMsg', () => {
			const msg = 'syncExchange';
			const ref = 'test-ref';

			it('should not post message if it is idle', () => {
				scheduler.postMsg({ ref, msg, data: mockData });

				expect(postMessageMock).not.toHaveBeenCalled();
			});
		});
	});
});
