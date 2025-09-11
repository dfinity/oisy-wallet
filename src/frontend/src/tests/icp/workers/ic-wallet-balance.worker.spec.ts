import type { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import { initIcrcWalletScheduler } from '$icp/workers/icrc-wallet.worker';
import * as authClientApi from '$lib/api/auth-client.api';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { TestUtil } from '$tests/types/utils';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('ic-wallet-balance.worker', () => {
	let spyGetBalance: MockInstance;

	let originalPostmessage: unknown;

	const mockBalance = 100n;

	const mockPostMessageStatusInProgress = {
		msg: 'syncIcWalletStatus',
		data: {
			state: 'in_progress'
		}
	};

	const mockPostMessageStatusIdle = {
		msg: 'syncIcWalletStatus',
		data: {
			state: 'idle'
		}
	};

	const mockPostMessageData = ({ certified }: { certified: boolean }) => ({
		wallet: {
			balance: {
				certified,
				data: mockBalance
			}
		}
	});

	const mockPostMessage = ({
		msg,
		...rest
	}: {
		certified: boolean;
		msg: 'syncIcpWallet' | 'syncIcrcWallet' | 'syncDip20Wallet';
	}) => ({
		msg,
		data: mockPostMessageData(rest)
	});

	const postMessageMock = vi.fn();

	// We don't await the job execution promise in the scheduler's function, so we need to advance the timers to verify the correct execution of the job
	const awaitJobExecution = () => vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS - 100);

	beforeAll(() => {
		originalPostmessage = window.postMessage;
		window.postMessage = postMessageMock;
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		vi.spyOn(authClientApi, 'loadIdentity').mockResolvedValue(mockIdentity);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	afterAll(() => {
		// @ts-expect-error redo original
		window.postMessage = originalPostmessage;
	});

	const initWithBalance = <PostMessageDataRequest>({
		initScheduler,
		msg,
		startData = undefined
	}: {
		initScheduler: (
			data: PostMessageDataRequest | undefined
		) => IcWalletScheduler<PostMessageDataRequest>;
		msg: 'syncIcpWallet' | 'syncIcrcWallet' | 'syncDip20Wallet';
		startData?: PostMessageDataRequest | undefined;
	}): TestUtil => {
		let scheduler: IcWalletScheduler<PostMessageDataRequest>;

		const mockPostMessageNotCertified = mockPostMessage({ msg, certified: false });
		const mockPostMessageCertified = mockPostMessage({ msg, certified: true });

		return {
			setup: () => {
				scheduler = initScheduler(startData);
			},

			teardown: () => {
				scheduler.stop();
			},

			tests: () => {
				it('should start the scheduler with an interval', async () => {
					await scheduler.start(startData);

					expect(scheduler['timer']['timer']).toBeDefined();
				});

				it('should trigger the scheduler manually', async () => {
					await scheduler.trigger(startData);

					// query + update = 2
					expect(spyGetBalance).toHaveBeenCalledTimes(2);
				});

				it('should stop the scheduler', () => {
					scheduler.stop();

					expect(scheduler['timer']['timer']).toBeUndefined();
				});

				it('should trigger syncWallet periodically', async () => {
					await scheduler.start(startData);

					// query + update = 2
					expect(spyGetBalance).toHaveBeenCalledTimes(2);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(spyGetBalance).toHaveBeenCalledTimes(4);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(spyGetBalance).toHaveBeenCalledTimes(6);
				});

				it('should not trigger postMessage again if no changes', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					// query + update = 2
					expect(postMessageMock).toHaveBeenCalledTimes(4);

					expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(2, mockPostMessageNotCertified);
					expect(postMessageMock).toHaveBeenNthCalledWith(3, mockPostMessageCertified);
					expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusIdle);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(postMessageMock).toHaveBeenCalledTimes(6);

					expect(postMessageMock).toHaveBeenNthCalledWith(5, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(6, mockPostMessageStatusIdle);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(postMessageMock).toHaveBeenCalledTimes(8);

					expect(postMessageMock).toHaveBeenNthCalledWith(7, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(8, mockPostMessageStatusIdle);
				});

				it('should postMessage with status of the worker', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);

					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);
				});

				it('should postMessage with balance', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageNotCertified);

					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageCertified);
				});
			}
		};
	};

	const initOtherScenarios = <PostMessageDataRequest>({
		initScheduler,
		startData = undefined,
		initErrorMock,
		msg
	}: {
		initScheduler: (
			data: PostMessageDataRequest | undefined
		) => IcWalletScheduler<PostMessageDataRequest>;
		startData?: PostMessageDataRequest | undefined;
		initErrorMock: (err: Error) => void;
		msg: 'syncIcpWallet' | 'syncIcrcWallet' | 'syncDip20Wallet';
	}): TestUtil => {
		let scheduler: IcWalletScheduler<PostMessageDataRequest>;

		return {
			setup: () => {
				scheduler = initScheduler(startData);
			},

			teardown: () => {
				scheduler.stop();
			},

			tests: () => {
				it('should trigger postMessage with error', async () => {
					const err = new Error('test');
					initErrorMock(err);

					await scheduler.start(startData);

					await awaitJobExecution();

					// idle and in_progress
					// error
					expect(postMessageMock).toHaveBeenCalledTimes(3);

					expect(postMessageMock).toHaveBeenCalledWith({
						msg: `${msg}Error`,
						data: {
							error: err
						}
					});
				});
			}
		};
	};

	describe('icrc-wallet.worker', () => {
		const ledgerCanisterMock = mock<IcrcLedgerCanister>();

		const startData = {
			ledgerCanisterId: 'zfcdd-tqaaa-aaaaq-aaaga-cai',
			env: 'mainnet' as const
		};

		beforeEach(() => {
			vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);
		});

		describe('with balance', () => {
			const { setup, teardown, tests } = initWithBalance({
				msg: 'syncIcrcWallet',
				initScheduler: initIcrcWalletScheduler,
				startData
			});

			beforeEach(() => {
				setup();

				spyGetBalance = ledgerCanisterMock.balance.mockResolvedValue(mockBalance);
			});

			afterEach(teardown);

			tests();
		});

		describe('other scenarios', () => {
			const initErrorMock = (err: Error) => ledgerCanisterMock.balance.mockRejectedValue(err);

			const { setup, teardown, tests } = initOtherScenarios({
				initScheduler: initIcrcWalletScheduler,
				startData,
				initErrorMock,
				msg: 'syncIcrcWallet'
			});

			beforeEach(setup);

			afterEach(teardown);

			tests();
		});
	});
});
