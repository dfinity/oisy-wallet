import type { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import { initIcrcWalletScheduler } from '$icp/workers/icrc-wallet.worker';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import * as authUtils from '$lib/utils/auth.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
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
		msg: 'syncIcpWallet' | 'syncIcrcWallet';
	}) => ({
		msg,
		data: mockPostMessageData(rest)
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

		vi.spyOn(authUtils, 'loadIdentity').mockResolvedValue(mockIdentity);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const initWithBalance = <PostMessageDataRequest>({
		initScheduler,
		msg,
		startData = undefined
	}: {
		initScheduler: (
			data: PostMessageDataRequest | undefined
		) => IcWalletScheduler<PostMessageDataRequest>;
		msg: 'syncIcpWallet' | 'syncIcrcWallet';
		startData?: PostMessageDataRequest | undefined;
	}) => {
		let scheduler: IcWalletScheduler<PostMessageDataRequest>;

		const mockPostMessageNotCertified = mockPostMessage({ msg, certified: false });
		const mockPostMessageCertified = mockPostMessage({ msg, certified: true });

		beforeEach(() => {
			scheduler = initScheduler(startData);
		});

		afterEach(() => {
			scheduler.stop();
		});

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

			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);

			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);
		});

		it('should postMessage with balance', async () => {
			await scheduler.start(startData);

			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageNotCertified);

			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageCertified);
		});
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
		msg: 'syncIcpWallet' | 'syncIcrcWallet';
	}) => {
		let scheduler: IcWalletScheduler<PostMessageDataRequest>;

		beforeEach(() => {
			scheduler = initScheduler(startData);

			vi.spyOn(console, 'error').mockImplementation(() => {});
		});

		afterEach(() => {
			scheduler.stop();
		});

		it('should trigger postMessage with error', async () => {
			const err = new Error('test');
			initErrorMock(err);

			await scheduler.start(startData);

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
			beforeEach(() => {
				spyGetBalance = ledgerCanisterMock.balance.mockResolvedValue(mockBalance);
			});

			initWithBalance({
				msg: 'syncIcrcWallet',
				initScheduler: initIcrcWalletScheduler,
				startData
			});
		});

		describe('other scenarios', () => {
			const initErrorMock = (err: Error) => ledgerCanisterMock.balance.mockRejectedValue(err);

			initOtherScenarios({
				initScheduler: initIcrcWalletScheduler,
				startData,
				initErrorMock,
				msg: 'syncIcrcWallet'
			});
		});
	});
});
