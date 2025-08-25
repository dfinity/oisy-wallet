import { SchedulerTimer } from '$lib/schedulers/scheduler';
import * as authUtils from '$lib/utils/auth.utils';
import { loadIdentity } from '$lib/utils/auth.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { MockInstance } from 'vitest';

describe('scheduler', () => {
	describe('SchedulerTimer', () => {
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

			vi.spyOn(authUtils, 'loadIdentity').mockResolvedValue(mockIdentity);
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
			it('should not start if identity is nullish', async () => {
				vi.spyOn(authUtils, 'loadIdentity').mockResolvedValueOnce(undefined);

				await scheduler.start(mockParams);

				expect(loadIdentity).toHaveBeenCalledOnce();

				expect(console.error).toHaveBeenCalledOnce();
				expect(console.error).toHaveBeenNthCalledWith(
					1,
					'Attempted to initiate a worker without an authenticated identity.'
				);

				expect(mockJob).not.toHaveBeenCalled();
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

		describe('trigger', () => {
			const { interval: _, ...mockTriggerParams } = mockParams;

			it('should not trigger if identity is nullish', async () => {
				vi.spyOn(authUtils, 'loadIdentity').mockResolvedValueOnce(undefined);

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
			let spyClearInterval: MockInstance;

			beforeEach(async () => {
				await scheduler.start(mockParams);

				spyClearInterval = vi.spyOn(global, 'clearInterval');
			});

			it('should stop the timer', () => {
				vi.clearAllMocks();

				scheduler.stop();

				expect(spyClearInterval).toHaveBeenCalledOnce();

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

				expect(spyClearInterval).not.toHaveBeenCalled();

				expect(postMessageMock).toHaveBeenCalledOnce();
				expect(postMessageMock).toHaveBeenNthCalledWith(1, {
					msg: statusMsg,
					data: { state: 'idle' }
				});
			});
		});

		describe('postMsg', () => {
			const msg = 'syncExchange';

			it('should not post message if it is idle', () => {
				scheduler.postMsg({ msg, data: mockData });

				expect(postMessageMock).not.toHaveBeenCalled();
			});
		});
	});
});
