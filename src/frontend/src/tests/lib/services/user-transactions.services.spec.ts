import type { UserTransaction } from '$declarations/backend/backend.did';
import * as backendApi from '$lib/api/backend.api';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import {
	loadUserTransactions,
	saveFinalizedTransactions
} from '$lib/services/user-transactions.services';
import type { Transaction } from '$lib/types/transaction';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	mockGetUserTransactionsResponse,
	mockUserTransaction,
	mockUserTransactionTokenId
} from '$tests/mocks/user-transactions.mock';

vi.mock('$lib/api/backend.api');

describe('user-transactions.services', () => {
	const mapFromBackend = (tx: UserTransaction): Transaction =>
		({
			from: tx.from,
			blockNumber: Number(tx.block_index),
			hash: tx.id
		}) as unknown as Transaction;

	const mapToBackend = (_tx: Transaction): UserTransaction => mockUserTransaction;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('loadUserTransactions', () => {
		it('should return undefined when identity is nullish', async () => {
			const result = await loadUserTransactions({
				identity: null,
				tokenId: mockUserTransactionTokenId,
				mapFromBackend
			});

			expect(result).toBeUndefined();
			expect(backendApi.getUserTransactions).not.toHaveBeenCalled();
		});

		it('should call getUserTransactions with correct params', async () => {
			vi.spyOn(backendApi, 'getUserTransactions').mockResolvedValue(
				mockGetUserTransactionsResponse
			);

			await loadUserTransactions({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				start: 5n,
				maxResults: 20n,
				mapFromBackend
			});

			expect(backendApi.getUserTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				start: 5n,
				maxResults: 20n
			});
		});

		it('should use WALLET_PAGINATION as default maxResults', async () => {
			vi.spyOn(backendApi, 'getUserTransactions').mockResolvedValue(
				mockGetUserTransactionsResponse
			);

			await loadUserTransactions({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				mapFromBackend
			});

			expect(backendApi.getUserTransactions).toHaveBeenCalledWith(
				expect.objectContaining({ maxResults: WALLET_PAGINATION })
			);
		});

		it('should map backend transactions using mapFromBackend', async () => {
			vi.spyOn(backendApi, 'getUserTransactions').mockResolvedValue(
				mockGetUserTransactionsResponse
			);

			const result = await loadUserTransactions({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				mapFromBackend
			});

			expect(result?.transactions).toHaveLength(
				mockGetUserTransactionsResponse.transactions.length
			);
			expect(result?.transactions[0]).toEqual(
				mapFromBackend(mockGetUserTransactionsResponse.transactions[0])
			);
		});

		it('should pass through metadata fields from the response', async () => {
			vi.spyOn(backendApi, 'getUserTransactions').mockResolvedValue(
				mockGetUserTransactionsResponse
			);

			const result = await loadUserTransactions({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				mapFromBackend
			});

			expect(result).toEqual(
				expect.objectContaining({
					newestBlockIndex: mockGetUserTransactionsResponse.newestBlockIndex,
					oldestBlockIndex: mockGetUserTransactionsResponse.oldestBlockIndex,
					totalStored: mockGetUserTransactionsResponse.totalStored,
					nextStart: mockGetUserTransactionsResponse.nextStart
				})
			);
		});

		it('should return undefined when getUserTransactions throws', async () => {
			vi.spyOn(backendApi, 'getUserTransactions').mockRejectedValue(new Error('canister error'));

			const result = await loadUserTransactions({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				mapFromBackend
			});

			expect(result).toBeUndefined();
		});
	});

	describe('saveFinalizedTransactions', () => {
		const alwaysFinalized = () => true;
		const neverFinalized = () => false;
		const alwaysSaveable = () => true;
		const neverSaveable = () => false;

		const mockTx = {
			from: '0xdef',
			blockNumber: 100,
			hash: 'tx-1'
		} as unknown as Transaction;

		const mockTx2 = {
			from: '0x123',
			blockNumber: 101,
			hash: 'tx-2'
		} as unknown as Transaction;

		it('should return { success: false } when identity is nullish', async () => {
			const result = await saveFinalizedTransactions({
				identity: null,
				tokenId: mockUserTransactionTokenId,
				transactions: [mockTx],
				currentBlockNumber: 200,
				isFinalizedFn: alwaysFinalized,
				mapToBackend,
				canSave: alwaysSaveable
			});

			expect(result).toEqual({ success: false });
			expect(backendApi.saveUserTransactions).not.toHaveBeenCalled();
		});

		it('should return { success: true } when no transactions pass filters', async () => {
			const result = await saveFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				transactions: [mockTx],
				currentBlockNumber: 200,
				isFinalizedFn: neverFinalized,
				mapToBackend,
				canSave: alwaysSaveable
			});

			expect(result).toEqual({ success: true });
			expect(backendApi.saveUserTransactions).not.toHaveBeenCalled();
		});

		it('should return { success: true } when canSave rejects all', async () => {
			const result = await saveFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				transactions: [mockTx],
				currentBlockNumber: 200,
				isFinalizedFn: alwaysFinalized,
				mapToBackend,
				canSave: neverSaveable
			});

			expect(result).toEqual({ success: true });
			expect(backendApi.saveUserTransactions).not.toHaveBeenCalled();
		});

		it('should save finalized transactions that pass both filters', async () => {
			vi.spyOn(backendApi, 'saveUserTransactions').mockResolvedValue();

			const result = await saveFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				transactions: [mockTx, mockTx2],
				currentBlockNumber: 200,
				isFinalizedFn: alwaysFinalized,
				mapToBackend,
				canSave: alwaysSaveable
			});

			expect(result).toEqual({ success: true });
			expect(backendApi.saveUserTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				transactions: [mockUserTransaction, mockUserTransaction]
			});
		});

		it('should only save transactions that pass canSave filter', async () => {
			vi.spyOn(backendApi, 'saveUserTransactions').mockResolvedValue();

			const canSaveOnlyFirst = (tx: Transaction) => tx === (mockTx as unknown as Transaction);

			const result = await saveFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				transactions: [mockTx, mockTx2],
				currentBlockNumber: 200,
				isFinalizedFn: alwaysFinalized,
				mapToBackend,
				canSave: canSaveOnlyFirst
			});

			expect(result).toEqual({ success: true });
			expect(backendApi.saveUserTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				transactions: [mockUserTransaction]
			});
		});

		it('should pass blockNumber and currentBlockNumber to isFinalizedFn', async () => {
			vi.spyOn(backendApi, 'saveUserTransactions').mockResolvedValue();

			const isFinalizedFn = vi.fn().mockReturnValue(true);

			await saveFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				transactions: [mockTx],
				currentBlockNumber: 200,
				isFinalizedFn,
				mapToBackend,
				canSave: alwaysSaveable
			});

			expect(isFinalizedFn).toHaveBeenCalledWith({
				blockNumber: 100,
				currentBlockNumber: 200
			});
		});

		it('should return { success: false } when saveUserTransactions throws', async () => {
			vi.spyOn(backendApi, 'saveUserTransactions').mockRejectedValue(new Error('canister error'));

			const result = await saveFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				transactions: [mockTx],
				currentBlockNumber: 200,
				isFinalizedFn: alwaysFinalized,
				mapToBackend,
				canSave: alwaysSaveable
			});

			expect(result).toEqual({ success: false });
		});

		it('should return { success: true } when transactions array is empty', async () => {
			const result = await saveFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockUserTransactionTokenId,
				transactions: [],
				currentBlockNumber: 200,
				isFinalizedFn: alwaysFinalized,
				mapToBackend,
				canSave: alwaysSaveable
			});

			expect(result).toEqual({ success: true });
			expect(backendApi.saveUserTransactions).not.toHaveBeenCalled();
		});
	});
});
