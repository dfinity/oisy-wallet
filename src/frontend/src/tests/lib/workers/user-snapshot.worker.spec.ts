import { SYNC_USER_SNAPSHOT_TIMER_INTERVAL } from '$lib/constants/user-snapshot.constants';
import * as userSnapshotServices from '$lib/services/user-snapshot.services';
import {
	initUserSnapshotWorker,
	type UserSnapshotWorker
} from '$lib/services/worker.user-snapshot.services';
import type { MockInstance } from 'vitest';

describe('user-snapshot.worker', () => {
	let spyRegisterUserSnapshot: MockInstance;

	let originalPostmessage: unknown;

	const postMessageMock = vi.fn();

	let scheduler: UserSnapshotWorker;

	beforeAll(() => {
		originalPostmessage = window.postMessage;
		window.postMessage = postMessageMock;
	});

	afterAll(() => {
		// @ts-expect-error redo original
		window.postMessage = originalPostmessage;
	});

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		// vi.spyOn(authUtils, 'loadIdentity').mockResolvedValue(mockIdentity);

		vi.spyOn(console, 'error').mockImplementation(() => {});

		scheduler = await initUserSnapshotWorker();

		spyRegisterUserSnapshot = vi
			.spyOn(userSnapshotServices, 'registerUserSnapshot')
			.mockImplementation(vi.fn());
	});

	afterEach(() => {
		scheduler.stopUserSnapshotTimer();

		vi.useRealTimers();
	});

	it('should start the scheduler', async () => {
		scheduler.startUserSnapshotTimer();

		expect(spyRegisterUserSnapshot).toHaveBeenCalledOnce();
	});

	it('should trigger syncUserSnapshot periodically', async () => {
		scheduler.startUserSnapshotTimer();

		expect(spyRegisterUserSnapshot).toHaveBeenCalledOnce();

		await vi.advanceTimersByTimeAsync(SYNC_USER_SNAPSHOT_TIMER_INTERVAL);

		expect(spyRegisterUserSnapshot).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(SYNC_USER_SNAPSHOT_TIMER_INTERVAL);

		expect(spyRegisterUserSnapshot).toHaveBeenCalledTimes(3);
	});

	it('should trigger the scheduler manually', () => {
		scheduler.triggerUserSnapshotTimer();

		expect(spyRegisterUserSnapshot).toHaveBeenCalledOnce();
	});

	it('should stop the scheduler', async () => {
		scheduler.startUserSnapshotTimer();

		await vi.advanceTimersByTimeAsync(SYNC_USER_SNAPSHOT_TIMER_INTERVAL);

		expect(spyRegisterUserSnapshot).toHaveBeenCalledTimes(2);

		scheduler.stopUserSnapshotTimer();

		await vi.advanceTimersByTimeAsync(SYNC_USER_SNAPSHOT_TIMER_INTERVAL * 2);

		expect(spyRegisterUserSnapshot).toHaveBeenCalledTimes(2);
	});

	it('should trigger postMessage with error', () => {
		const err = new Error('test');

		scheduler.startUserSnapshotTimer();

		expect(postMessageMock).toHaveBeenCalledOnce();
		expect(postMessageMock).toHaveBeenCalledWith({
			msg: `${'asdasd'}Error`,
			data: {
				error: err
			}
		});
	});
});
