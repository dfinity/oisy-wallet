import type { Value } from '$declarations/icrc3/icrc3.did';
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
import { loadIcrc3BlockLog, type Icrc3Block } from '$icp/services/icrc3.services';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { TRACK_COUNT_IC_LOADING_TRANSACTIONS_ERROR } from '$lib/constants/analytics.constants';
import { WALLET_PAGINATION, ZERO } from '$lib/constants/app.constants';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTIONS,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import * as analytics from '$lib/services/analytics.services';
import { balancesStore } from '$lib/stores/balances.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { bn1Bi } from '$tests/mocks/balances.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { mockValidIcrc7Token } from '$tests/mocks/icrc7-tokens.mock';
import { mockIdentity, mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$icp/api/icp-index.api', () => ({
	getTransactions: vi.fn()
}));

vi.mock('$icp/api/icrc-index-ng.api', () => ({
	getTransactions: vi.fn()
}));

vi.mock('$icp/services/icrc3.services', () => ({
	loadIcrc3BlockLog: vi.fn()
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

		let spyTrackEvent: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			spyTrackEvent = vi.spyOn(analytics, 'trackEvent');

			icTransactionsStore.append({ tokenId, transactions: mockTransactions });
		});

		it('should reset transactions store', () => {
			onTransactionsCleanUp(mockData);

			expect(get(icTransactionsStore)?.[tokenId]).toStrictEqual(mockTransactions.slice(n));
		});

		it('should track a plausible event', () => {
			onTransactionsCleanUp(mockData);

			expect(spyTrackEvent).toHaveBeenCalledWith({
				name: PLAUSIBLE_EVENTS.LOAD_TRANSACTIONS,
				metadata: {
					event_context: PLAUSIBLE_EVENT_CONTEXTS.TRANSACTIONS,
					event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTIONS.UNCERTIFIED_REMOVED,
					token_id: tokenId.description,
					removed_count: `${n}`
				}
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
			txExplorerUrl: `${ICP_EXPLORER_URL}/transaction/${transaction.id}`,
			fee: 456n
		}));

		const mockCertifiedTransactions = mockTransactions.map((transaction) => ({
			data: transaction,
			certified: false
		}));

		const accountValue = (principal: typeof mockPrincipal): Value => ({
			Map: [['owner', { Text: principal.toText() }]]
		});

		const icrc7Block = ({
			id,
			btype,
			tx
		}: {
			id: bigint;
			btype: '7mint' | '7burn' | '7xfer';
			tx: Array<[string, Value]>;
		}): Icrc3Block => ({
			id,
			block: {
				Map: [
					['btype', { Text: btype }],
					['ts', { Nat: 1_700_000_000_000_000_000n }],
					['tx', { Map: [['tid', { Nat: 50n }] as [string, Value], ...tx] }]
				]
			}
		});

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			icTransactionsStore.reset(mockToken.id);
			icTransactionsStore.reset(mockValidIcrc7Token.id);

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
						}) as IcpIndexDid.TransactionWithId
				)
			} as IcpIndexDid.GetAccountIdentifierTransactionsResponse);
		});

		it('should not load transactions if the last ID is not parseable', async () => {
			await loadNextIcTransactions({ ...mockParams, lastId: 'mock-last-id' });

			expect(getTransactionsIcp).not.toHaveBeenCalled();
			expect(getTransactionsIcrc).not.toHaveBeenCalled();
		});

		it('should not load transactions if the token is nullish', async () => {
			await loadNextIcTransactions({
				...mockParams,
				token: undefined as unknown as typeof mockToken
			});

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

		it('should load transactions from ICRC-3 blocks for ICRC-7 tokens', async () => {
			const blocks = [
				icrc7Block({
					id: 1n,
					btype: '7mint',
					tx: [['to', accountValue(mockPrincipal2)]]
				}),
				icrc7Block({
					id: 2n,
					btype: '7xfer',
					tx: [
						['from', accountValue(mockPrincipal2)],
						['to', accountValue(mockPrincipal)]
					]
				})
			];

			vi.mocked(loadIcrc3BlockLog)
				.mockResolvedValueOnce({ logLength: 3n, blocks: [] })
				.mockResolvedValueOnce({ logLength: 3n, blocks })
				.mockResolvedValueOnce({ logLength: 3n, blocks: [] })
				.mockResolvedValueOnce({ logLength: 3n, blocks });

			icTransactionsStore.reset(mockValidIcrc7Token.id);

			await loadNextIcTransactions({
				...mockParams,
				lastId: undefined,
				token: mockValidIcrc7Token
			});

			expect(getTransactionsIcp).not.toHaveBeenCalled();
			expect(getTransactionsIcrc).not.toHaveBeenCalled();
			expect(loadIcrc3BlockLog).toHaveBeenCalledWith({
				identity: mockIdentity,
				canisterId: mockValidIcrc7Token.canisterId,
				start: ZERO,
				length: ZERO,
				certified: expect.any(Boolean)
			});
			expect(loadIcrc3BlockLog).toHaveBeenCalledWith({
				identity: mockIdentity,
				canisterId: mockValidIcrc7Token.canisterId,
				start: ZERO,
				length: 3n,
				certified: expect.any(Boolean)
			});

			expect(get(icTransactionsStore)?.[mockValidIcrc7Token.id]).toEqual([
				{
					data: expect.objectContaining({
						id: '2',
						type: 'receive',
						incoming: true,
						tokenId: 50n
					}),
					certified: true
				}
			]);
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
			await loadNextIcTransactions({
				...mockParams,
				token: { ...mockToken, standard: { code: 'icrc' } }
			});

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
				transactions: [] as IcpIndexDid.TransactionWithId[]
			} as IcpIndexDid.GetAccountIdentifierTransactionsResponse);

			await loadNextIcTransactions(mockParams);

			expect(get(icTransactionsStore)?.[mockToken.id]).toStrictEqual(initialTransactions);
		});

		it('should call signalEnd if no transactions are returned', async () => {
			vi.spyOn(icpIndexApi, 'getTransactions').mockResolvedValue({
				transactions: [] as IcpIndexDid.TransactionWithId[]
			} as IcpIndexDid.GetAccountIdentifierTransactionsResponse);

			await loadNextIcTransactions(mockParams);

			// Twice because we do both query and update calls
			expect(signalEnd).toHaveBeenCalledTimes(2);
		});

		it('should keep loaded transactions and balance if loading the next ICP page raises an error', async () => {
			const initialTransactions = createMockIcTransactionsUi(11).map((transaction) => ({
				data: transaction,
				certified: false
			}));
			icTransactionsStore.append({ tokenId: mockToken.id, transactions: initialTransactions });
			balancesStore.set({ id: mockToken.id, data: { data: bn1Bi, certified: false } });

			const mockError = new Error('Test error');
			vi.spyOn(icpIndexApi, 'getTransactions').mockRejectedValue(mockError);

			await loadNextIcTransactions(mockParams);

			expect(get(icTransactionsStore)?.[mockToken.id]).toStrictEqual(initialTransactions);
			expect(get(balancesStore)?.[mockToken.id]).toStrictEqual({
				data: bn1Bi,
				certified: false
			});

			expect(signalEnd).toHaveBeenCalledOnce();
		});

		it('should keep loaded transactions and balance if loading the next ICRC-7 page raises an error', async () => {
			const initialTransactions = createMockIcTransactionsUi(11).map((transaction) => ({
				data: transaction,
				certified: false
			}));
			icTransactionsStore.append({
				tokenId: mockValidIcrc7Token.id,
				transactions: initialTransactions
			});
			balancesStore.set({
				id: mockValidIcrc7Token.id,
				data: { data: bn1Bi, certified: false }
			});

			vi.mocked(loadIcrc3BlockLog).mockRejectedValue(new Error('Test error'));

			await loadNextIcTransactions({
				...mockParams,
				lastId: undefined,
				token: mockValidIcrc7Token
			});

			expect(get(icTransactionsStore)?.[mockValidIcrc7Token.id]).toStrictEqual(initialTransactions);
			expect(get(balancesStore)?.[mockValidIcrc7Token.id]).toStrictEqual({
				data: bn1Bi,
				certified: false
			});

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
				timestamp: timestampBuffer + BigInt(17 - index)
			})
		);
		const expectedOldestTransaction = mockTransactions[mockTransactions.length - 1];
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
			const lastId = transactions[transactions.length - 1].id;

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

		it('should use the last transaction cursor if oldest timestamps are tied', async () => {
			const transactions = mockTransactions.map((transaction) => ({
				...transaction,
				timestamp: timestampBuffer
			}));
			const lastId = transactions[transactions.length - 1].id;

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
