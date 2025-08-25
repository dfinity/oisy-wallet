import { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { mapIcpTransaction } from '$icp/utils/icp-transactions.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import { initIcpWalletScheduler } from '$icp/workers/icp-wallet.worker';
import { initIcrcWalletScheduler } from '$icp/workers/icrc-wallet.worker';
import * as agent from '$lib/actors/agents.ic';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import * as authUtils from '$lib/utils/auth.utils';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { HttpAgent } from '@dfinity/agent';
import {
	IndexCanister,
	type Transaction,
	type TransactionWithId as TransactionWithIdIcp
} from '@dfinity/ledger-icp';
import {
	IcrcIndexNgCanister,
	type IcrcIndexNgTransactionWithId,
	type IcrcTransaction,
	type IcrcTransactionWithId
} from '@dfinity/ledger-icrc';
import { arrayOfNumberToUint8Array, jsonReplacer } from '@dfinity/utils';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('ic-wallet.worker', () => {
	let spyGetTransactions: MockInstance;

	let originalPostmessage: unknown;

	const mockBalance = 100n;
	const mockOldestTxId = 4n;

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

	const mockPostMessageData = ({
		certified,
		transaction
	}: {
		certified: boolean;
		transaction: IcTransactionUi;
	}) => ({
		wallet: {
			balance: {
				certified,
				data: mockBalance
			},
			oldest_tx_id: [mockOldestTxId],
			newTransactions: JSON.stringify(
				[
					{
						data: transaction,
						certified
					}
				],
				jsonReplacer
			)
		}
	});

	const mockPostMessage = ({
		msg,
		...rest
	}: {
		transaction: IcTransactionUi;
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

		vi.spyOn(agent, 'getAgent').mockResolvedValue(mock<HttpAgent>());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const initWithTransactions = <
		T extends IcrcTransaction | Transaction,
		TWithId extends IcrcTransactionWithId | TransactionWithIdIcp,
		PostMessageDataRequest
	>({
		initScheduler,
		transaction,
		msg,
		startData = undefined
	}: {
		initScheduler: () => IcWalletScheduler<T, TWithId, PostMessageDataRequest>;
		transaction: IcTransactionUi;
		msg: 'syncIcpWallet' | 'syncIcrcWallet';
		startData?: PostMessageDataRequest | undefined;
	}) => {
		let scheduler: IcWalletScheduler<T, TWithId, PostMessageDataRequest>;

		const mockPostMessageNotCertified = mockPostMessage({ msg, transaction, certified: false });
		const mockPostMessageCertified = mockPostMessage({ msg, transaction, certified: true });

		beforeEach(() => {
			scheduler = initScheduler();
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
			expect(spyGetTransactions).toHaveBeenCalledTimes(2);
		});

		it('should stop the scheduler', () => {
			scheduler.stop();
			expect(scheduler['timer']['timer']).toBeUndefined();
		});

		it('should trigger syncWallet periodically', async () => {
			await scheduler.start(startData);

			// query + update = 2
			expect(spyGetTransactions).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetTransactions).toHaveBeenCalledTimes(4);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetTransactions).toHaveBeenCalledTimes(6);
		});

		it('should not trigger postMessage with transactions again if no changes', async () => {
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

		it('should postMessage with balance and transactions', async () => {
			await scheduler.start(startData);

			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageNotCertified);

			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageCertified);
		});
	};

	const initWithoutTransactions = <
		T extends IcrcTransaction | Transaction,
		TWithId extends IcrcTransactionWithId | TransactionWithIdIcp,
		PostMessageDataRequest
	>({
		msg,
		initScheduler,
		startData = undefined
	}: {
		msg: 'syncIcpWallet' | 'syncIcrcWallet';
		initScheduler: () => IcWalletScheduler<T, TWithId, PostMessageDataRequest>;
		startData?: PostMessageDataRequest | undefined;
	}) => {
		let scheduler: IcWalletScheduler<T, TWithId, PostMessageDataRequest>;

		beforeEach(() => {
			scheduler = initScheduler();
		});

		afterEach(() => {
			scheduler.stop();
		});

		const mockPostMessageNoTransactionsNotCertified = {
			msg,
			data: {
				wallet: {
					balance: {
						certified: false,
						data: mockBalance
					},
					oldest_tx_id: [mockOldestTxId],
					newTransactions: JSON.stringify([], jsonReplacer)
				}
			}
		};

		it('should trigger postMessage once with no transactions to display at least the balance', async () => {
			await scheduler.start(startData);

			// query + update = 2
			expect(postMessageMock).toHaveBeenCalledTimes(4);

			expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenNthCalledWith(2, mockPostMessageNoTransactionsNotCertified);
			expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusIdle);
		});
	};

	const initOtherScenarios = <
		T extends IcrcTransaction | Transaction,
		TWithId extends IcrcTransactionWithId | TransactionWithIdIcp,
		PostMessageDataRequest
	>({
		initScheduler,
		startData = undefined,
		initCleanupMock,
		initErrorMock,
		msg
	}: {
		initScheduler: () => IcWalletScheduler<T, TWithId, PostMessageDataRequest>;
		startData?: PostMessageDataRequest | undefined;
		initCleanupMock: (mockRogueId: bigint) => void;
		initErrorMock: (err: Error) => void;
		msg: 'syncIcpWallet' | 'syncIcrcWallet';
	}) => {
		let scheduler: IcWalletScheduler<T, TWithId, PostMessageDataRequest>;

		beforeEach(() => {
			scheduler = initScheduler();

			vi.spyOn(console, 'error').mockImplementation(() => {});
		});

		afterEach(() => {
			scheduler.stop();
		});

		it('should trigger postMessage cleanup', async () => {
			const mockRogueId = 666n;

			initCleanupMock(mockRogueId);

			await scheduler.start(startData);

			// query + update = 2
			// idle and in_progress
			// cleanup
			expect(postMessageMock).toHaveBeenCalledTimes(5);

			expect(postMessageMock).toHaveBeenCalledWith({
				msg: `${msg}CleanUp`,
				data: {
					transactionIds: [`${mockRogueId}`]
				}
			});
		});

		it('should trigger postMessage with error', async () => {
			const err = new Error('test');
			initErrorMock(err);

			const scheduler = initIcpWalletScheduler();
			await scheduler.start(undefined);

			// idle and in_progress
			// error
			expect(postMessageMock).toHaveBeenCalledTimes(3);

			expect(postMessageMock).toHaveBeenCalledWith({
				msg: 'syncIcpWalletError',
				data: {
					error: err
				}
			});
		});
	};

	describe('icp-wallet.worker', () => {
		const indexCanisterMock = mock<IndexCanister>();

		const mockTransaction: TransactionWithIdIcp = {
			id: 123n,
			transaction: {
				memo: 0n,
				icrc1_memo: [],
				operation: {
					Transfer: {
						to: 'abc',
						fee: { e8s: 456n },
						from: 'cde',
						amount: { e8s: 789n },
						spender: []
					}
				},
				timestamp: [],
				created_at_time: []
			}
		};

		const mockMappedTransaction = mapIcpTransaction({
			transaction: mockTransaction,
			identity: mockIdentity
		});

		beforeEach(() => {
			vi.spyOn(IndexCanister, 'create').mockImplementation(() => indexCanisterMock);
		});

		describe('with transactions', () => {
			beforeEach(() => {
				spyGetTransactions = indexCanisterMock.getTransactions.mockResolvedValue({
					balance: mockBalance,
					transactions: [mockTransaction],
					oldest_tx_id: [mockOldestTxId]
				});
			});

			initWithTransactions({
				msg: 'syncIcpWallet',
				initScheduler: initIcpWalletScheduler,
				transaction: mockMappedTransaction
			});
		});

		describe('without transactions', () => {
			beforeEach(() => {
				spyGetTransactions = indexCanisterMock.getTransactions.mockResolvedValue({
					balance: mockBalance,
					transactions: [],
					oldest_tx_id: [mockOldestTxId]
				});
			});

			initWithoutTransactions({ msg: 'syncIcpWallet', initScheduler: initIcpWalletScheduler });
		});

		describe('other scenarios', () => {
			const initCleanupMock = (mockRogueId: bigint) => {
				indexCanisterMock.getTransactions.mockImplementation(({ certified }) =>
					Promise.resolve({
						balance: mockBalance,
						transactions: !certified
							? [
									mockTransaction,
									{
										...mockTransaction,
										id: mockRogueId
									}
								]
							: [mockTransaction],
						oldest_tx_id: [mockOldestTxId]
					})
				);
			};

			const initErrorMock = (err: Error) =>
				indexCanisterMock.getTransactions.mockRejectedValue(err);

			initOtherScenarios({
				initScheduler: initIcpWalletScheduler,
				initCleanupMock,
				initErrorMock,
				msg: 'syncIcpWallet'
			});
		});
	});

	describe('icrc-wallet.worker', () => {
		const indexCanisterMock = mock<IcrcIndexNgCanister>();

		const mockTransaction: IcrcIndexNgTransactionWithId = {
			id: 123n,
			transaction: {
				burn: [],
				kind: 'test',
				mint: [],
				approve: [],
				transfer: [
					{
						to: {
							owner: mockPrincipal,
							subaccount: []
						},
						fee: [456n],
						from: {
							owner: mockPrincipal,
							subaccount: [arrayOfNumberToUint8Array([1, 2, 3])]
						},
						amount: 789n,
						spender: [],
						memo: [],
						created_at_time: []
					}
				],
				timestamp: 1n
			}
		};

		const mockMappedTransaction = mapIcrcTransaction({
			transaction: mockTransaction,
			identity: mockIdentity
		});

		const startData = {
			ledgerCanisterId: 'zfcdd-tqaaa-aaaaq-aaaga-cai',
			indexCanisterId: 'zlaol-iaaaa-aaaaq-aaaha-cai',
			env: 'mainnet' as const
		};

		beforeEach(() => {
			vi.spyOn(IcrcIndexNgCanister, 'create').mockImplementation(() => indexCanisterMock);
		});

		describe('with transactions', () => {
			beforeEach(() => {
				spyGetTransactions = indexCanisterMock.getTransactions.mockResolvedValue({
					balance: mockBalance,
					transactions: [mockTransaction],
					oldest_tx_id: [mockOldestTxId]
				});
			});

			initWithTransactions({
				msg: 'syncIcrcWallet',
				initScheduler: initIcrcWalletScheduler,
				transaction: mockMappedTransaction,
				startData
			});
		});

		describe('without transactions', () => {
			beforeEach(() => {
				spyGetTransactions = indexCanisterMock.getTransactions.mockResolvedValue({
					balance: mockBalance,
					transactions: [],
					oldest_tx_id: [mockOldestTxId]
				});
			});

			initWithoutTransactions({
				msg: 'syncIcrcWallet',
				initScheduler: initIcrcWalletScheduler,
				startData
			});
		});

		describe('other scenarios', () => {
			const initCleanupMock = (mockRogueId: bigint) => {
				indexCanisterMock.getTransactions.mockImplementation(({ certified }) =>
					Promise.resolve({
						balance: mockBalance,
						transactions: !certified
							? [
									mockTransaction,
									{
										...mockTransaction,
										id: mockRogueId
									}
								]
							: [mockTransaction],
						oldest_tx_id: [mockOldestTxId]
					})
				);
			};

			const initErrorMock = (err: Error) =>
				indexCanisterMock.getTransactions.mockRejectedValue(err);

			initOtherScenarios({
				initScheduler: initIcrcWalletScheduler,
				startData,
				initCleanupMock,
				initErrorMock,
				msg: 'syncIcrcWallet'
			});
		});
	});
});
