import { ICP_EXPLORER_URL } from '$env/explorers.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN, ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import * as icpIndexApi from '$icp/api/icp-index.api';
import { getTransactions as getTransactionsIcp } from '$icp/api/icp-index.api';
import { getTransactions as getTransactionsIcrc } from '$icp/api/icrc-index-ng.api';
import {
	loadNextIcTransactions,
	loadNextIcTransactionsByOldest,
	onLoadTransactionsError,
	onTransactionsCleanUp
} from '$icp/services/ic-transactions.services';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { TRACK_COUNT_IC_LOADING_TRANSACTIONS_ERROR } from '$lib/constants/analytics.contants';
import { WALLET_PAGINATION, ZERO } from '$lib/constants/app.constants';
import * as analytics from '$lib/services/analytics.services';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { bn1Bi } from '$tests/mocks/balances.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';
import type { TransactionWithId } from '@dfinity/ledger-icp/dist/candid';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$icp/api/icp-index.api', () => ({
	getTransactions: vi.fn()
}));

vi.mock('$icp/api/icrc-index-ng.api', () => ({
	getTransactions: vi.fn()
}));

describe('ic-transactions.services', () => {
	describe('onLoadTransactionsError', () => {
		const tokenId = ICP_TOKEN_ID;
		const mockError = new Error('Test error');
		const mockTransactions = createMockIcTransactionsUi(5).map((transaction) => ({
			data: transaction,
			certified: false
		}));

		let spyAnalytics: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			spyAnalytics = vi.spyOn(analytics, 'trackEvent');

			icTransactionsStore.append({ tokenId, transactions: mockTransactions });
			balancesStore.set({ id: tokenId, data: { data: bn1Bi, certified: false } });
		});

		it('should reset transactions store and balances store', () => {
			onLoadTransactionsError({ tokenId, error: mockError });

			expect(get(icTransactionsStore)?.[tokenId]).toBeNull();
			expect(get(balancesStore)?.[tokenId]).toBeNull();
		});

		it('should track events', () => {
			const mockError = new Error('Test error, Request ID: 423, status: rejected');
			onLoadTransactionsError({ tokenId, error: mockError });

			expect(spyAnalytics).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_COUNT_IC_LOADING_TRANSACTIONS_ERROR,
				metadata: {
					tokenId: tokenId.description,
					error: 'Test error, status: rejected'
				}
			});
		});

		it('should log error to console', () => {
			onLoadTransactionsError({ tokenId, error: mockError });

			expect(console.warn).toHaveBeenCalledExactlyOnceWith(
				`${get(i18n).transactions.error.loading_transactions}:`,
				mockError
			);
		});

		it('should handle a nullish error', () => {
			onLoadTransactionsError({ tokenId, error: null });

			onLoadTransactionsError({ tokenId, error: undefined });

			expect(spyAnalytics).toHaveBeenCalledTimes(2);
			expect(spyAnalytics).toHaveBeenNthCalledWith(1, {
				name: TRACK_COUNT_IC_LOADING_TRANSACTIONS_ERROR,
				metadata: {
					tokenId: tokenId.description
				}
			});
			expect(spyAnalytics).toHaveBeenNthCalledWith(2, {
				name: TRACK_COUNT_IC_LOADING_TRANSACTIONS_ERROR,
				metadata: {
					tokenId: tokenId.description
				}
			});

			expect(console.warn).toHaveBeenCalledTimes(2);
			expect(console.warn).toHaveBeenNthCalledWith(
				1,
				`${get(i18n).transactions.error.loading_transactions}:`,
				null
			);
			expect(console.warn).toHaveBeenNthCalledWith(
				2,
				`${get(i18n).transactions.error.loading_transactions}:`,
				undefined
			);
		});
	});

	describe('onTransactionsCleanUp', () => {
		const tokenId = ICP_TOKEN_ID;
		const mockTransactions = createMockIcTransactionsUi(5).map((transaction) => ({
			data: transaction,
			certified: false
		}));
		const n = 2;
		const mockTransactionsIds = mockTransactions
			.slice(0, n)
			.map((transaction) => transaction.data.id);
		const mockData = { tokenId, transactionIds: mockTransactionsIds };

		let spyToastsError: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			icTransactionsStore.append({ tokenId, transactions: mockTransactions });
		});

		it('should reset transactions store', () => {
			onTransactionsCleanUp(mockData);

			expect(get(icTransactionsStore)?.[tokenId]).toStrictEqual(mockTransactions.slice(n));
		});

		it('should call toastsError by default', () => {
			onTransactionsCleanUp(mockData);

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: get(i18n).transactions.error.uncertified_transactions_removed }
			});
		});
	});

	describe('loadNextIcTransactions', () => {
		const signalEnd = vi.fn();

		const mockLastId = '12345';
		const mockToken = ICP_TOKEN;

		const mockParams = {
			lastId: mockLastId,
			owner: mockIdentity.getPrincipal(),
			identity: mockIdentity,
			maxResults: WALLET_PAGINATION,
			token: mockToken,
			signalEnd
		};

		const mockTransactions = createMockIcTransactionsUi(5).map((transaction) => ({
			...transaction,
			to: mockIdentity.getPrincipal().toString(),
			type: 'receive',
			incoming: true,
			fromExplorerUrl: `${ICP_EXPLORER_URL}/account/${transaction.from}`,
			toExplorerUrl: `${ICP_EXPLORER_URL}/account/${mockIdentity.getPrincipal().toString()}`,
			txExplorerUrl: `${ICP_EXPLORER_URL}/transaction/${transaction.id}`
		}));

		const mockCertifiedTransactions = mockTransactions.map((transaction) => ({
			data: transaction,
			certified: false
		}));

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			icTransactionsStore.reset(mockToken.id);

			vi.spyOn(icpIndexApi, 'getTransactions').mockResolvedValue({
				transactions: mockTransactions.map(
					(transaction) =>
						({
							transaction: {
								...transaction,
								memo: ZERO,
								icrc1_memo: [],
								operation: {
									Transfer: {
										to: transaction.to,
										fee: { e8s: 456n },
										from: transaction.from,
										amount: { e8s: transaction.value },
										spender: []
									}
								},
								timestamp: toNullable({ timestamp_nanos: transaction.timestamp }),
								created_at_time: []
							},
							id: BigInt(transaction.id)
						}) as TransactionWithId
				)
			} as GetAccountIdentifierTransactionsResponse);
		});

		it('should not load transactions if the last ID is not parseable', async () => {
			await loadNextIcTransactions({ ...mockParams, lastId: 'mock-last-id' });

			expect(getTransactionsIcp).not.toHaveBeenCalled();
			expect(getTransactionsIcrc).not.toHaveBeenCalled();
		});

		it('should not load transactions if the token is not an IC token', async () => {
			await loadNextIcTransactions({ ...mockParams, token: ETHEREUM_TOKEN });

			expect(getTransactionsIcp).not.toHaveBeenCalled();
			expect(getTransactionsIcrc).not.toHaveBeenCalled();
		});

		it('should not load transactions if the token has no index canister', async () => {
			await loadNextIcTransactions({
				...mockParams,
				token: { ...mockToken, indexCanisterId: undefined } as IcToken
			});

			expect(getTransactionsIcp).not.toHaveBeenCalled();
			expect(getTransactionsIcrc).not.toHaveBeenCalled();
		});

		it('should load transactions with the correct parameters for ICP token', async () => {
			await loadNextIcTransactions(mockParams);

			expect(getTransactionsIcp).toHaveBeenCalledTimes(2);
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(1, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(mockLastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: false
			});
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(2, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(mockLastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: true
			});
		});

		it('should load transactions with the correct parameters for ICRC tokens', async () => {
			await loadNextIcTransactions({ ...mockParams, token: { ...mockToken, standard: 'icrc' } });

			expect(getTransactionsIcrc).toHaveBeenCalledTimes(2);
			expect(getTransactionsIcrc).toHaveBeenNthCalledWith(1, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(mockLastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: false
			});
			expect(getTransactionsIcrc).toHaveBeenNthCalledWith(2, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(mockLastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: true
			});
		});

		it('should load transactions even if the last ID is undefined', async () => {
			await loadNextIcTransactions({ ...mockParams, lastId: undefined });

			expect(getTransactionsIcp).toHaveBeenCalledTimes(2);
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(1, {
				indexCanisterId: mockToken.indexCanisterId,
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: false
			});
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(2, {
				indexCanisterId: mockToken.indexCanisterId,
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: true
			});
		});

		it('should load transactions even if the last ID is for self-transactions', async () => {
			await loadNextIcTransactions({ ...mockParams, lastId: `${mockLastId}-self` });

			expect(getTransactionsIcp).toHaveBeenCalledTimes(2);
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(1, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(mockLastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: false
			});
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(2, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(mockLastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: true
			});
		});

		it('should save the loaded transactions to the transactions store', async () => {
			await loadNextIcTransactions(mockParams);

			expect(get(icTransactionsStore)?.[mockToken.id]).toStrictEqual(mockCertifiedTransactions);

			expect(signalEnd).not.toHaveBeenCalled();
		});

		it('should not save transactions if the response is empty', async () => {
			const initialTransactions = createMockIcTransactionsUi(11).map((transaction) => ({
				data: transaction,
				certified: false
			}));
			icTransactionsStore.append({ tokenId: mockToken.id, transactions: initialTransactions });

			vi.spyOn(icpIndexApi, 'getTransactions').mockResolvedValue({
				transactions: [] as TransactionWithId[]
			} as GetAccountIdentifierTransactionsResponse);

			await loadNextIcTransactions(mockParams);

			expect(get(icTransactionsStore)?.[mockToken.id]).toStrictEqual(initialTransactions);
		});

		it('should call signalEnd if no transactions are returned', async () => {
			vi.spyOn(icpIndexApi, 'getTransactions').mockResolvedValue({
				transactions: [] as TransactionWithId[]
			} as GetAccountIdentifierTransactionsResponse);

			await loadNextIcTransactions(mockParams);

			// Twice because we do both query and update calls
			expect(signalEnd).toHaveBeenCalledTimes(2);
		});

		it('should reset the store if loading transactions raises an error', async () => {
			const initialTransactions = createMockIcTransactionsUi(11).map((transaction) => ({
				data: transaction,
				certified: false
			}));
			icTransactionsStore.append({ tokenId: mockToken.id, transactions: initialTransactions });

			const mockError = new Error('Test error');
			vi.spyOn(icpIndexApi, 'getTransactions').mockRejectedValue(mockError);

			await loadNextIcTransactions(mockParams);

			expect(get(icTransactionsStore)?.[mockToken.id]).toBeNull();

			expect(signalEnd).toHaveBeenCalledOnce();
		});
	});

	describe('loadNextIcTransactionsByOldest', () => {
		const signalEnd = vi.fn();

		const mockToken = ICP_TOKEN;

		const mockMinTimestamp = 1_000_000_000;
		const timestampBuffer = BigInt(mockMinTimestamp) + 500_000_000n;

		const mockTransactions: IcTransactionUi[] = createMockIcTransactionsUi(17).map(
			(transaction, index) => ({
				...transaction,
				timestamp: timestampBuffer + BigInt(index)
			})
		);
		const [expectedOldestTransaction] = mockTransactions;
		const { id: mockLastId } = expectedOldestTransaction;

		const mockParams = {
			minTimestamp: mockMinTimestamp,
			transactions: mockTransactions,
			owner: mockIdentity.getPrincipal(),
			identity: mockIdentity,
			maxResults: WALLET_PAGINATION,
			token: mockToken,
			signalEnd
		};

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();
		});

		it('should not load transactions if the transactions list is empty', async () => {
			const result = await loadNextIcTransactionsByOldest({ ...mockParams, transactions: [] });

			expect(result).toEqual({ success: false });

			expect(getTransactionsIcp).not.toHaveBeenCalled();
			expect(getTransactionsIcrc).not.toHaveBeenCalled();
		});

		it('should not load transactions if the minStamp is newer than all the transactions', async () => {
			const result = await loadNextIcTransactionsByOldest({
				...mockParams,
				minTimestamp: Number(timestampBuffer) * 10
			});

			expect(result).toEqual({ success: false });

			expect(getTransactionsIcp).not.toHaveBeenCalled();
			expect(getTransactionsIcrc).not.toHaveBeenCalled();
		});

		it('should load transactions with the correct parameters', async () => {
			const result = await loadNextIcTransactionsByOldest(mockParams);

			expect(result).toEqual({ success: true });

			expect(getTransactionsIcp).toHaveBeenCalledTimes(2);
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(1, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(mockLastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: false
			});
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(2, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(mockLastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: true
			});
		});

		it('should load transactions if the transactions have undefined timestamp', async () => {
			const transactions: IcTransactionUi[] = createMockIcTransactionsUi(17).map((transaction) => ({
				...transaction,
				timestamp: undefined
			}));
			const lastId = transactions[0].id;

			const result = await loadNextIcTransactionsByOldest({ ...mockParams, transactions });

			expect(result).toEqual({ success: true });

			expect(getTransactionsIcp).toHaveBeenCalledTimes(2);
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(1, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(lastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: false
			});
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(2, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(lastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: true
			});
		});

		it('should handle minimum timestamp correctly in different units', async () => {
			const resultWithNano = await loadNextIcTransactionsByOldest(mockParams);

			expect(resultWithNano).toEqual({ success: true });

			expect(getTransactionsIcp).toHaveBeenCalledTimes(2);
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(1, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(mockLastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: false
			});
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(2, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(mockLastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: true
			});

			vi.clearAllMocks();

			const resultWithMillis = await loadNextIcTransactionsByOldest(mockParams);

			expect(resultWithMillis).toEqual({ success: true });

			expect(getTransactionsIcp).toHaveBeenCalledTimes(2);
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(1, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(mockLastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: false
			});
			expect(getTransactionsIcp).toHaveBeenNthCalledWith(2, {
				indexCanisterId: mockToken.indexCanisterId,
				start: BigInt(mockLastId),
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				certified: true
			});
		});
	});
});
