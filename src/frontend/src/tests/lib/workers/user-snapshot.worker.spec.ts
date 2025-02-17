import { USER_SNAPSHOT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { UserSnapshotScheduler } from '$lib/schedulers/user-snapshot.scheduler';
import * as userSnapshotServices from '$lib/services/user-snapshot.services';
import * as authUtils from '$lib/utils/auth.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { MockInstance } from 'vitest';

describe('user-snapshot.worker', () => {
	let spyRegisterUserSnapshot: MockInstance;

	let originalPostmessage: unknown;

	const mockPostMessageStatusInProgress = {
		msg: 'syncUserSnapshotStatus',
		data: {
			state: 'in_progress'
		}
	};

	const mockPostMessageStatusIdle = {
		msg: 'syncUserSnapshotStatus',
		data: {
			state: 'idle'
		}
	};

	const postMessageMock = vi.fn();

	beforeAll(() => {
		originalPostmessage = window.postMessage;
		window.postMessage = postMessageMock;
	});

	afterAll(() => {
		// @ts-expect-error redo original
		window.postMessage = originalPostmessage;
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		vi.spyOn(authUtils, 'loadIdentity').mockResolvedValue(mockIdentity);

		spyRegisterUserSnapshot = vi
			.spyOn(userSnapshotServices, 'registerUserSnapshot')
			.mockImplementation(vi.fn());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const testWorker = () => {
		const scheduler: UserSnapshotScheduler = new UserSnapshotScheduler();

		afterEach(() => {
			scheduler.stop();
		});

		it('should trigger postMessage with correct data', async () => {
			await scheduler.start();

			expect(postMessageMock).toHaveBeenCalledTimes(2);
			expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenNthCalledWith(2, mockPostMessageStatusIdle);

			await vi.advanceTimersByTimeAsync(USER_SNAPSHOT_TIMER_INTERVAL_MILLIS);

			expect(postMessageMock).toHaveBeenCalledTimes(4);
			expect(postMessageMock).toHaveBeenNthCalledWith(3, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusIdle);

			await vi.advanceTimersByTimeAsync(USER_SNAPSHOT_TIMER_INTERVAL_MILLIS);

			expect(postMessageMock).toHaveBeenCalledTimes(6);
			expect(postMessageMock).toHaveBeenNthCalledWith(5, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenNthCalledWith(6, mockPostMessageStatusIdle);
		});

		it('should start the scheduler with an interval', async () => {
			await scheduler.start();

			expect(scheduler['timer']['timer']).toBeDefined();
		});

		it('should trigger the scheduler manually', async () => {
			await scheduler.trigger();

			expect(spyRegisterUserSnapshot).toHaveBeenCalledOnce();
		});

		it('should stop the scheduler', () => {
			scheduler.stop();

			expect(scheduler['timer']['timer']).toBeUndefined();
		});

		it('should trigger syncUserSnapshot periodically', async () => {
			await scheduler.start();

			expect(spyRegisterUserSnapshot).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(USER_SNAPSHOT_TIMER_INTERVAL_MILLIS);

			expect(spyRegisterUserSnapshot).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(USER_SNAPSHOT_TIMER_INTERVAL_MILLIS);

			expect(spyRegisterUserSnapshot).toHaveBeenCalledTimes(3);
		});

		it('should postMessage with status of the worker', async () => {
			await scheduler.start();

			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);
		});

		it('should trigger postMessage with error', async () => {
			vi.spyOn(console, 'error').mockImplementationOnce(() => {});
			const err = new Error('test');
			spyRegisterUserSnapshot.mockRejectedValueOnce(err);

			await scheduler.start();

			// idle and in_progress
			// error
			expect(postMessageMock).toHaveBeenCalledTimes(3);

			expect(postMessageMock).toHaveBeenCalledWith({
				msg: 'syncUserSnapshotError',
				data: {
					error: err
				}
			});
		});
	};

	describe('user-snapshot worker should work', () => {
		testWorker();
	});
}, 10000);
