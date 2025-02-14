import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import { USER_SNAPSHOT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { UserSnapshotScheduler } from '$lib/schedulers/user-snapshot.scheduler';
import * as userSnapshotServices from '$lib/services/user-snapshot.services';
import { mockBtcTransaction } from '$tests/mocks/btc-transactions.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { jsonReplacer } from '@dfinity/utils';
import type { MockInstance } from 'vitest';

describe('user-snapshot.worker', () => {
	let spyRegisterUserSnapshot: MockInstance;

	let originalPostmessage: unknown;

	const mockBalance = 100n;

	const latestBitcoinBlockHeight = 100;

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

	const mockPostMessage = ({
		certified,
		withTransactions
	}: {
		certified: boolean;
		withTransactions: boolean;
	}) => ({
		msg: 'syncBtcWallet',
		data: {
			wallet: {
				balance: {
					certified,
					data: mockBalance
				},
				newTransactions: JSON.stringify(
					withTransactions
						? [
								{
									data: mapBtcTransaction({
										transaction: mockBtcTransaction,
										latestBitcoinBlockHeight,
										btcAddress: mockBtcAddress
									}),
									// TODO: use "certified" instead of hardcoded value when we have a way of certifying BTC txs
									certified: false
								}
							]
						: [],
					jsonReplacer
				)
			}
		}
	});

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

		spyRegisterUserSnapshot = vi
			.spyOn(userSnapshotServices, 'registerUserSnapshot')
			.mockImplementation(vi.fn());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const testWorker = () => {
		const scheduler: UserSnapshotScheduler = new UserSnapshotScheduler();

		const mockPostMessageUncertified = mockPostMessage({
			certified: false,
			withTransactions: true
		});
		const mockPostMessageCertified = mockPostMessage({
			certified: true,
			withTransactions: false
		});

		afterEach(() => {
			scheduler.stop();
		});

		it('should trigger postMessage with correct data', async () => {
			await scheduler.start();

			expect(postMessageMock).toHaveBeenCalledTimes(4);
			expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageUncertified);
			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageCertified);
			expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusIdle);

			await vi.advanceTimersByTimeAsync(USER_SNAPSHOT_TIMER_INTERVAL_MILLIS);

			expect(postMessageMock).toHaveBeenCalledTimes(6);
			expect(postMessageMock).toHaveBeenNthCalledWith(5, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenNthCalledWith(6, mockPostMessageStatusIdle);

			await vi.advanceTimersByTimeAsync(USER_SNAPSHOT_TIMER_INTERVAL_MILLIS);

			expect(postMessageMock).toHaveBeenCalledTimes(8);
			expect(postMessageMock).toHaveBeenNthCalledWith(7, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenNthCalledWith(8, mockPostMessageStatusIdle);
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
});
