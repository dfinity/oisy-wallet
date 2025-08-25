import { DEVNET_USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import type { PostMessageDataRequestSol } from '$lib/types/post-message';
import * as authUtils from '$lib/utils/auth.utils';
import * as solanaApi from '$sol/api/solana.api';
import { SolWalletScheduler } from '$sol/schedulers/sol-wallet.scheduler';
import { SolanaNetworks } from '$sol/types/network';
import { mapSolTransactionUi } from '$sol/utils/sol-transactions.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolRpcReceiveTransaction } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { jsonReplacer, nonNullish } from '@dfinity/utils';
import { lamports } from '@solana/rpc-types';
import { type MockInstance } from 'vitest';

describe('sol-wallet.scheduler', () => {
	let spyLoadBalance: MockInstance;
	let spyLoadSolBalance: MockInstance;
	let spyLoadSplBalance: MockInstance;
	let spyLoadTransactions: MockInstance;

	const mockSolBalance = lamports(100n);
	const mockSplBalance = BigInt(123);
	const mockTransactions = [mockSolRpcReceiveTransaction, mockSolRpcReceiveTransaction];

	const expectedTransactions = mockTransactions.map((transaction) => ({
		data: mapSolTransactionUi({
			transaction,
			address: mockSolAddress
		}),
		certified: false
	}));

	const mockPostMessageStatusInProgress = {
		msg: 'syncSolWalletStatus',
		data: {
			state: 'in_progress'
		}
	};

	const mockPostMessageStatusIdle = {
		msg: 'syncSolWalletStatus',
		data: {
			state: 'idle'
		}
	};

	const mockPostMessage = ({
		withTransactions,
		isSpl
	}: {
		withTransactions: boolean;
		isSpl: boolean;
	}) => ({
		msg: 'syncSolWallet',
		data: {
			wallet: {
				balance: {
					certified: false,
					data: isSpl ? mockSplBalance : mockSolBalance
				},
				...(withTransactions && {
					newTransactions: JSON.stringify(expectedTransactions, jsonReplacer)
				})
			}
		}
	});

	const postMessageMock = vi.fn();

	let originalPostmessage: unknown;

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

		spyLoadSolBalance = vi
			.spyOn(solanaApi, 'loadSolLamportsBalance')
			.mockResolvedValue(mockSolBalance);
		spyLoadSplBalance = vi
			.spyOn(solanaApi, 'loadSplTokenBalance')
			.mockResolvedValue(mockSplBalance);
		spyLoadTransactions = vi
			.spyOn(solanaApi, 'getSolTransactions')
			.mockResolvedValue(mockTransactions);

		vi.spyOn(authUtils, 'loadIdentity').mockResolvedValue(mockIdentity);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const testWorker = ({
		startData = undefined
	}: {
		startData?: PostMessageDataRequestSol | undefined;
	}) => {
		const scheduler: SolWalletScheduler = new SolWalletScheduler();

		const isSpl = nonNullish(startData?.tokenAddress);

		beforeEach(() => {
			spyLoadBalance = isSpl ? spyLoadSplBalance : spyLoadSolBalance;
		});

		afterEach(() => {
			// reset internal store with balance and transactions
			scheduler['store'] = {
				balance: undefined,
				transactions: {}
			};

			scheduler.stop();
		});

		it('should trigger postMessage with correct data', async () => {
			await scheduler.start(startData);

			expect(postMessageMock).toHaveBeenCalledTimes(3);
			expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenNthCalledWith(
				2,
				mockPostMessage({ withTransactions: true, isSpl })
			);
			expect(postMessageMock).toHaveBeenNthCalledWith(3, mockPostMessageStatusIdle);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(postMessageMock).toHaveBeenCalledTimes(5);
			expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenNthCalledWith(5, mockPostMessageStatusIdle);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(postMessageMock).toHaveBeenCalledTimes(7);
			expect(postMessageMock).toHaveBeenNthCalledWith(6, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenNthCalledWith(7, mockPostMessageStatusIdle);
		});

		it('should start the scheduler with an interval', async () => {
			await scheduler.start(startData);

			expect(scheduler['timer']['timer']).toBeDefined();
		});

		it('should trigger the scheduler manually', async () => {
			await scheduler.trigger(startData);

			expect(spyLoadBalance).toHaveBeenCalledTimes(1);
			expect(spyLoadTransactions).toHaveBeenCalledTimes(1);
		});

		it('should stop the scheduler', () => {
			scheduler.stop();
			expect(scheduler['timer']['timer']).toBeUndefined();
		});

		it('should trigger syncWallet periodically', async () => {
			await scheduler.start(startData);

			expect(spyLoadBalance).toHaveBeenCalledTimes(1);
			expect(spyLoadTransactions).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyLoadBalance).toHaveBeenCalledTimes(2);
			expect(spyLoadTransactions).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyLoadBalance).toHaveBeenCalledTimes(3);
			expect(spyLoadTransactions).toHaveBeenCalledTimes(3);
		});

		it('should postMessage with status of the worker', async () => {
			await scheduler.start(startData);

			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);
		});

		it('should trigger postMessage with error', async () => {
			const err = new Error('test');
			spyLoadBalance.mockRejectedValue(err);

			await scheduler.start(startData);

			// idle and in_progress
			// error
			expect(postMessageMock).toHaveBeenCalledTimes(3);

			expect(postMessageMock).toHaveBeenCalledWith({
				msg: 'syncSolWalletError',
				data: {
					error: err
				}
			});
		});

		it('should not post message when no new transactions or balance changes', async () => {
			await scheduler.start(startData);
			postMessageMock.mockClear();

			// Mock no changes in transactions and balance
			spyLoadTransactions.mockResolvedValue([]);
			spyLoadSolBalance.mockResolvedValue(mockSolBalance);
			spyLoadSplBalance.mockResolvedValue(mockSplBalance);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			// Only status messages should be sent
			expect(postMessageMock).toHaveBeenCalledTimes(2);
			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);
		});

		it('should update store with new transactions', async () => {
			await scheduler.start(startData);

			expect(scheduler['store'].transactions).toEqual(
				expectedTransactions.reduce(
					(acc, transaction) => ({
						...acc,
						[transaction.data.id]: transaction
					}),
					{}
				)
			);
		});
	};

	describe('sol-wallet worker should work for SOLANA tokens', () => {
		const startData: PostMessageDataRequestSol = {
			address: {
				certified: false,
				data: mockSolAddress
			},
			solanaNetwork: SolanaNetworks.mainnet
		};

		testWorker({ startData });
	});

	describe('sol-wallet worker should work for SPL tokens', () => {
		const startData: PostMessageDataRequestSol = {
			address: {
				certified: false,
				data: mockSolAddress
			},
			solanaNetwork: SolanaNetworks.devnet,
			tokenAddress: DEVNET_USDC_TOKEN.address
		};

		testWorker({ startData });
	});
});
