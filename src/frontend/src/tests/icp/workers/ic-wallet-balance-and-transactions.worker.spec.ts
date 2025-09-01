import { ICP_INDEX_CANISTER_ID } from '$env/networks/networks.icp.env';
import { XtcLedgerCanister } from '$icp/canisters/xtc-ledger.canister';
import type { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import type { Dip20TransactionWithId } from '$icp/types/api';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { mapDip20Transaction } from '$icp/utils/dip20-transactions.utils';
import { mapIcpTransaction } from '$icp/utils/icp-transactions.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import { initDip20WalletScheduler } from '$icp/workers/dip20-wallet.worker';
import { initIcpWalletScheduler } from '$icp/workers/icp-wallet.worker';
import { initIcrcWalletScheduler } from '$icp/workers/icrc-wallet.worker';
import { WALLET_TIMER_INTERVAL_MILLIS, ZERO } from '$lib/constants/app.constants';
import * as authUtils from '$lib/utils/auth.utils';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import type { TestUtil } from '$tests/types/utils';
import { IndexCanister, type TransactionWithId as TransactionWithIdIcp } from '@dfinity/ledger-icp';
import {
	IcrcIndexNgCanister,
	IcrcLedgerCanister,
	type IcrcIndexNgTransactionWithId
} from '@dfinity/ledger-icrc';
import { arrayOfNumberToUint8Array, jsonReplacer } from '@dfinity/utils';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('ic-wallet-balance-and-transactions.worker', () => {
	let spyGetBalance: MockInstance;
	let spyGetTransactions: MockInstance;

	let originalPostMessage: unknown;

	const mockBalance = 100n;
	let mockBalanceFromTransactions = () => mockBalance;
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
		msg: 'syncIcpWallet' | 'syncIcrcWallet' | 'syncDip20Wallet';
	}) => ({
		msg,
		data: mockPostMessageData(rest)
	});

	const postMessageMock = vi.fn();

	// We don't await the job execution promise in the scheduler's function, so we need to advance the timers to verify the correct execution of the job
	const awaitJobExecution = () => vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS - 100);

	beforeAll(() => {
		originalPostMessage = window.postMessage;
		window.postMessage = postMessageMock;
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		vi.spyOn(authUtils, 'loadIdentity').mockResolvedValue(mockIdentity);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	afterAll(() => {
		// @ts-expect-error redo original
		window.postMessage = originalPostMessage;
	});

	const commonTests =
		<PostMessageDataRequest>({
			scheduler,
			mockPostMessageNotCertified,
			mockPostMessageCertified,
			startData = undefined
		}: {
			scheduler: IcWalletScheduler<PostMessageDataRequest>;
			mockPostMessageNotCertified: ReturnType<typeof mockPostMessage>;
			mockPostMessageCertified: ReturnType<typeof mockPostMessage>;
			startData?: PostMessageDataRequest | undefined;
		}) =>
		() => {
			it('should start the scheduler with an interval', async () => {
				await scheduler.start(startData);

				expect(scheduler['timer']['timer']).toBeDefined();
			});

			it('should stop the scheduler', () => {
				scheduler.stop();

				expect(scheduler['timer']['timer']).toBeUndefined();
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

	const initWithTransactions = <PostMessageDataRequest>({
		initScheduler,
		transaction,
		msg,
		startData = undefined
	}: {
		initScheduler: (
			data: PostMessageDataRequest | undefined
		) => IcWalletScheduler<PostMessageDataRequest>;
		transaction: IcTransactionUi;
		msg: 'syncIcpWallet' | 'syncIcrcWallet' | 'syncDip20Wallet';
		startData?: PostMessageDataRequest | undefined;
	}): TestUtil => {
		let scheduler: IcWalletScheduler<PostMessageDataRequest>;

		const mockPostMessageNotCertified = mockPostMessage({ msg, transaction, certified: false });
		const mockPostMessageCertified = mockPostMessage({ msg, transaction, certified: true });

		return {
			setup: () => {
				scheduler = initScheduler(startData);
			},

			teardown: () => {
				scheduler.stop();
			},

			tests: () => {
				commonTests({
					scheduler,
					mockPostMessageNotCertified,
					mockPostMessageCertified,
					startData
				});

				it('should trigger the scheduler manually calling the loader', async () => {
					await scheduler.trigger(startData);

					// query + update = 2
					expect(spyGetTransactions).toHaveBeenCalledTimes(2);
				});

				it('should trigger syncWallet periodically calling the loader', async () => {
					await scheduler.start(startData);

					// query + update = 2
					expect(spyGetTransactions).toHaveBeenCalledTimes(2);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(spyGetTransactions).toHaveBeenCalledTimes(4);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(spyGetTransactions).toHaveBeenCalledTimes(6);
				});
			}
		};
	};

	const initWithBalanceAndTransactions = <PostMessageDataRequest>({
		initScheduler,
		transaction,
		msg,
		startData = undefined
	}: {
		initScheduler: (
			data: PostMessageDataRequest | undefined
		) => IcWalletScheduler<PostMessageDataRequest>;
		transaction: IcTransactionUi;
		msg: 'syncIcpWallet' | 'syncIcrcWallet' | 'syncDip20Wallet';
		startData?: PostMessageDataRequest | undefined;
	}): TestUtil => {
		let scheduler: IcWalletScheduler<PostMessageDataRequest>;

		const mockPostMessageNotCertified = mockPostMessage({ msg, transaction, certified: false });
		const mockPostMessageCertified = mockPostMessage({ msg, transaction, certified: true });

		return {
			setup: () => {
				scheduler = initScheduler(startData);
			},

			teardown: () => {
				scheduler.stop();
			},

			tests: () => {
				commonTests({
					scheduler,
					mockPostMessageNotCertified,
					mockPostMessageCertified,
					startData
				});

				it('should trigger the scheduler manually calling both loaders', async () => {
					await scheduler.trigger(startData);

					// query + update = 2
					expect(spyGetTransactions).toHaveBeenCalledTimes(2);
					expect(spyGetBalance).toHaveBeenCalledTimes(2);
				});

				it('should trigger syncWallet periodically calling both loaders', async () => {
					await scheduler.start(startData);

					// query + update = 2
					expect(spyGetTransactions).toHaveBeenCalledTimes(2);
					expect(spyGetBalance).toHaveBeenCalledTimes(2);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(spyGetTransactions).toHaveBeenCalledTimes(4);
					expect(spyGetBalance).toHaveBeenCalledTimes(4);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(spyGetTransactions).toHaveBeenCalledTimes(6);
					expect(spyGetBalance).toHaveBeenCalledTimes(6);
				});

				it('should use the balance from the Ledger canister and not from the Index canister', async () => {
					mockBalanceFromTransactions = () => mockBalance + 1n;

					expect(mockPostMessageNotCertified.data.wallet.balance.data).not.toBe(
						mockBalanceFromTransactions()
					);
					expect(mockPostMessageCertified.data.wallet.balance.data).not.toBe(
						mockBalanceFromTransactions()
					);

					await scheduler.start(startData);

					await awaitJobExecution();

					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageNotCertified);

					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageCertified);
				});
			}
		};
	};

	const initWithoutTransactions = <PostMessageDataRequest>({
		msg,
		initScheduler,
		startData = undefined
	}: {
		msg: 'syncIcpWallet' | 'syncIcrcWallet' | 'syncDip20Wallet';
		initScheduler: (
			data: PostMessageDataRequest | undefined
		) => IcWalletScheduler<PostMessageDataRequest>;
		startData?: PostMessageDataRequest | undefined;
	}): TestUtil => {
		let scheduler: IcWalletScheduler<PostMessageDataRequest>;

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

		const mockPostMessageNoTransactionsCertified = {
			msg,
			data: {
				wallet: {
					balance: {
						certified: true,
						data: mockBalance
					},
					oldest_tx_id: [mockOldestTxId],
					newTransactions: JSON.stringify([], jsonReplacer)
				}
			}
		};

		return {
			setup: () => {
				scheduler = initScheduler(startData);
			},

			teardown: () => {
				scheduler.stop();
			},

			tests: () => {
				it('should trigger postMessage once with no transactions to display at least the balance', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					// query + update = 2
					expect(postMessageMock).toHaveBeenCalledTimes(4);

					expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(
						2,
						mockPostMessageNoTransactionsNotCertified
					);
					expect(postMessageMock).toHaveBeenNthCalledWith(
						3,
						mockPostMessageNoTransactionsCertified
					);
					expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusIdle);
				});
			}
		};
	};

	const initOtherScenarios = <PostMessageDataRequest>({
		initScheduler,
		startData = undefined,
		initCleanupMock,
		initErrorMock,
		msg
	}: {
		initScheduler: (
			data: PostMessageDataRequest | undefined
		) => IcWalletScheduler<PostMessageDataRequest>;
		startData?: PostMessageDataRequest | undefined;
		initCleanupMock: (mockRogueId: bigint) => void;
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
				it('should trigger postMessage cleanup', async () => {
					const mockRogueId = 666n;

					initCleanupMock(mockRogueId);

					await scheduler.start(startData);

					await awaitJobExecution();

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

	describe('icp-wallet.worker', () => {
		const indexCanisterMock = mock<IndexCanister>();

		const mockTransaction: TransactionWithIdIcp = {
			id: 123n,
			transaction: {
				memo: ZERO,
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

		const startData = {
			indexCanisterId: ICP_INDEX_CANISTER_ID
		};

		beforeEach(() => {
			vi.spyOn(IndexCanister, 'create').mockImplementation(() => indexCanisterMock);
		});

		describe('with transactions', () => {
			const { setup, teardown, tests } = initWithTransactions({
				msg: 'syncIcpWallet',
				initScheduler: initIcpWalletScheduler,
				transaction: mockMappedTransaction,
				startData
			});

			beforeEach(() => {
				setup();

				spyGetTransactions = indexCanisterMock.getTransactions.mockResolvedValue({
					balance: mockBalance,
					transactions: [mockTransaction],
					oldest_tx_id: [mockOldestTxId]
				});
			});

			afterEach(teardown);

			tests();
		});

		describe('without transactions', () => {
			const { setup, teardown, tests } = initWithoutTransactions({
				msg: 'syncIcpWallet',
				initScheduler: initIcpWalletScheduler,
				startData
			});

			beforeEach(() => {
				setup();

				spyGetTransactions = indexCanisterMock.getTransactions.mockResolvedValue({
					balance: mockBalance,
					transactions: [],
					oldest_tx_id: [mockOldestTxId]
				});
			});

			afterEach(teardown);

			tests();
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

			const { setup, teardown, tests } = initOtherScenarios({
				initScheduler: initIcpWalletScheduler,
				startData,
				initCleanupMock,
				initErrorMock,
				msg: 'syncIcpWallet'
			});

			beforeEach(setup);

			afterEach(teardown);

			tests();
		});
	});

	describe('icrc-wallet.worker', () => {
		const ledgerCanisterMock = mock<IcrcLedgerCanister>();
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
			vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);
			vi.spyOn(IcrcIndexNgCanister, 'create').mockImplementation(() => indexCanisterMock);

			spyGetBalance = ledgerCanisterMock.balance.mockResolvedValue(mockBalance);
		});

		describe('with transactions', () => {
			const { setup, teardown, tests } = initWithBalanceAndTransactions({
				msg: 'syncIcrcWallet',
				initScheduler: initIcrcWalletScheduler,
				transaction: mockMappedTransaction,
				startData
			});

			beforeEach(() => {
				setup();

				spyGetTransactions = indexCanisterMock.getTransactions.mockResolvedValue({
					balance: mockBalanceFromTransactions(),
					transactions: [mockTransaction],
					oldest_tx_id: [mockOldestTxId]
				});
			});

			afterEach(teardown);

			tests();
		});

		describe('without transactions', () => {
			const { setup, teardown, tests } = initWithoutTransactions({
				msg: 'syncIcrcWallet',
				initScheduler: initIcrcWalletScheduler,
				startData
			});

			beforeEach(() => {
				setup();

				spyGetTransactions = indexCanisterMock.getTransactions.mockResolvedValue({
					balance: mockBalanceFromTransactions(),
					transactions: [],
					oldest_tx_id: [mockOldestTxId]
				});
			});

			afterEach(teardown);

			tests();
		});

		describe('other scenarios', () => {
			const initCleanupMock = (mockRogueId: bigint) => {
				indexCanisterMock.getTransactions.mockImplementation(({ certified }) =>
					Promise.resolve({
						balance: mockBalanceFromTransactions(),
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

			describe('balance error', () => {
				const { setup, teardown, tests } = initOtherScenarios({
					initScheduler: initIcrcWalletScheduler,
					startData,
					initCleanupMock,
					initErrorMock: (err: Error) => ledgerCanisterMock.balance.mockRejectedValue(err),
					msg: 'syncIcrcWallet'
				});

				beforeEach(setup);

				afterEach(teardown);

				tests();
			});

			describe('transactions error', () => {
				const { setup, teardown, tests } = initOtherScenarios({
					initScheduler: initIcrcWalletScheduler,
					startData,
					initCleanupMock,
					initErrorMock: (err: Error) => indexCanisterMock.getTransactions.mockRejectedValue(err),
					msg: 'syncIcrcWallet'
				});

				beforeEach(setup);

				afterEach(teardown);

				tests();
			});
		});
	});

	describe('dip20-wallet.worker', () => {
		const ledgerCanisterMock = mock<XtcLedgerCanister>();

		const mockTransaction: Dip20TransactionWithId = {
			id: 123n,
			transaction: {
				kind: { Transfer: { to: mockPrincipal, from: mockPrincipal } },
				timestamp: 1n,
				fee: 456n,
				status: { SUCCEEDED: null },
				cycles: 1_000_000_000_000n
			}
		};

		const mockMappedTransaction = mapDip20Transaction({
			transaction: mockTransaction,
			identity: mockIdentity
		});

		const startData = {
			canisterId: 'aanaa-xaaaa-aaaah-aaeiq-cai'
		};

		beforeEach(() => {
			// @ts-expect-error for test purposes
			vi.spyOn(XtcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);

			spyGetBalance = ledgerCanisterMock.balance.mockResolvedValue(mockBalance);
		});

		describe('with transactions', () => {
			const { setup, teardown, tests } = initWithBalanceAndTransactions({
				msg: 'syncDip20Wallet',
				initScheduler: initDip20WalletScheduler,
				transaction: mockMappedTransaction,
				startData
			});

			beforeEach(() => {
				setup();

				// TODO: implement DIP-20 transactions tests when we implement the transactions history
				spyGetTransactions = ledgerCanisterMock.transactions.mockResolvedValue({
					transactions: [mockTransaction],
					oldest_tx_id: [mockOldestTxId]
				});
			});

			afterEach(teardown);

			tests();
		});

		describe('without transactions', () => {
			const { setup, teardown, tests } = initWithoutTransactions({
				msg: 'syncDip20Wallet',
				initScheduler: initDip20WalletScheduler,
				startData
			});

			beforeEach(() => {
				setup();

				spyGetTransactions = ledgerCanisterMock.transactions.mockResolvedValue({
					transactions: [],
					oldest_tx_id: [mockOldestTxId]
				});
			});

			afterEach(teardown);

			tests();
		});

		describe('other scenarios', () => {
			const initCleanupMock = (mockRogueId: bigint) => {
				ledgerCanisterMock.transactions.mockImplementation(({ certified }) =>
					Promise.resolve({
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

			describe('balance error', () => {
				const { setup, teardown, tests } = initOtherScenarios({
					initScheduler: initDip20WalletScheduler,
					startData,
					initCleanupMock,
					initErrorMock: (err: Error) => ledgerCanisterMock.balance.mockRejectedValue(err),
					msg: 'syncDip20Wallet'
				});

				beforeEach(setup);

				afterEach(teardown);

				tests();
			});

			describe('transactions error', () => {
				const { setup, teardown, tests } = initOtherScenarios({
					initScheduler: initDip20WalletScheduler,
					startData,
					initCleanupMock,
					initErrorMock: (err: Error) => ledgerCanisterMock.transactions.mockRejectedValue(err),
					msg: 'syncDip20Wallet'
				});

				beforeEach(setup);

				afterEach(teardown);

				tests();
			});
		});
	});
});
