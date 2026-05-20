import type { UserTransaction } from '$declarations/backend/backend.did';
import { WALLET_PAGINATION, ZERO } from '$lib/constants/app.constants';
import * as userTransactionsServices from '$lib/services/user-transactions.services';
import {
	loadSolUserTransactions,
	saveSolFinalizedTransactions
} from '$sol/services/sol-user-transactions.services';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { createMockSolTransactionUi, mockSignature } from '$tests/mocks/sol-transactions.mock';
import {
	mockSolBackendUserTransaction,
	mockSolNativeMainnetTokenId,
	mockSolUserTransactionUi
} from '$tests/mocks/sol-user-transactions.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { assertNonNullish } from '@dfinity/utils';
import { signature } from '@solana/kit';

vi.mock('$lib/services/user-transactions.services', () => ({
	loadUserTransactions: vi.fn(),
	saveFinalizedTransactions: vi.fn()
}));

describe('sol-user-transactions.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('loadSolUserTransactions', () => {
		it('should call loadUserTransactions with correct params and defaults', async () => {
			vi.spyOn(userTransactionsServices, 'loadUserTransactions').mockResolvedValue(undefined);

			await loadSolUserTransactions({
				identity: mockIdentity,
				tokenId: mockSolNativeMainnetTokenId,
				address: mockSolAddress
			});

			expect(userTransactionsServices.loadUserTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokenId: mockSolNativeMainnetTokenId,
				start: undefined,
				maxResults: WALLET_PAGINATION,
				mapFromBackend: expect.any(Function)
			});
		});

		it('should pass custom start and maxResults', async () => {
			vi.spyOn(userTransactionsServices, 'loadUserTransactions').mockResolvedValue(undefined);

			await loadSolUserTransactions({
				identity: mockIdentity,
				tokenId: mockSolNativeMainnetTokenId,
				address: mockSolAddress,
				start: 5n,
				maxResults: 20n
			});

			expect(userTransactionsServices.loadUserTransactions).toHaveBeenCalledWith(
				expect.objectContaining({
					start: 5n,
					maxResults: 20n
				})
			);
		});

		it('should provide a mapFromBackend that correctly maps UserTransaction to SolTransactionUi', async () => {
			let capturedMapper: ((tx: UserTransaction) => SolTransactionUi) | undefined;

			vi.spyOn(userTransactionsServices, 'loadUserTransactions').mockImplementation(
				({ mapFromBackend }) => {
					capturedMapper = mapFromBackend as (tx: UserTransaction) => SolTransactionUi;
					return Promise.resolve(undefined);
				}
			);

			await loadSolUserTransactions({
				identity: mockIdentity,
				tokenId: mockSolNativeMainnetTokenId,
				address: mockSolAddress
			});

			assertNonNullish(capturedMapper);

			const result = capturedMapper(mockSolBackendUserTransaction);

			expect(result.id).toBe(mockSolBackendUserTransaction.id);
			expect(result.from).toBe(mockSolAddress);
			expect(result.to).toBe(mockSolAddress2);
			expect(result.type).toBe('send');
			expect(result.status).toBe('finalized');
		});

		it('should return the result from loadUserTransactions', async () => {
			const mockResult = {
				transactions: [],
				newestBlockIndex: 10n,
				oldestBlockIndex: 1n,
				totalStored: ZERO,
				nextStart: undefined
			};

			vi.spyOn(userTransactionsServices, 'loadUserTransactions').mockResolvedValue(mockResult);

			const result = await loadSolUserTransactions({
				identity: mockIdentity,
				tokenId: mockSolNativeMainnetTokenId,
				address: mockSolAddress
			});

			expect(result).toBe(mockResult);
		});

		it('should return undefined when loadUserTransactions returns undefined', async () => {
			vi.spyOn(userTransactionsServices, 'loadUserTransactions').mockResolvedValue(undefined);

			const result = await loadSolUserTransactions({
				identity: mockIdentity,
				tokenId: mockSolNativeMainnetTokenId,
				address: mockSolAddress
			});

			expect(result).toBeUndefined();
		});
	});

	describe('saveSolFinalizedTransactions', () => {
		const mockFinalizedTx: SolTransactionUi = {
			...createMockSolTransactionUi('tx-1'),
			signature: signature(mockSignature),
			status: 'finalized',
			timestamp: 1700000000n
		};

		it('should call saveFinalizedTransactions with correct params', async () => {
			vi.spyOn(userTransactionsServices, 'saveFinalizedTransactions').mockResolvedValue({
				success: true
			});

			await saveSolFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockSolNativeMainnetTokenId,
				transactions: [mockFinalizedTx]
			});

			expect(userTransactionsServices.saveFinalizedTransactions).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tokenId: mockSolNativeMainnetTokenId,
				transactions: [mockFinalizedTx],
				isFinalizedFn: expect.any(Function),
				mapToBackend: expect.any(Function),
				canSave: expect.any(Function)
			});
		});

		it('should provide an isFinalizedFn that checks for finalized status', async () => {
			let capturedIsFinalizedFn: ((tx: SolTransactionUi) => boolean) | undefined;

			vi.spyOn(userTransactionsServices, 'saveFinalizedTransactions').mockImplementation(
				({ isFinalizedFn }) => {
					capturedIsFinalizedFn = isFinalizedFn as (tx: SolTransactionUi) => boolean;
					return Promise.resolve({ success: true });
				}
			);

			await saveSolFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockSolNativeMainnetTokenId,
				transactions: [mockFinalizedTx]
			});

			assertNonNullish(capturedIsFinalizedFn);

			expect(capturedIsFinalizedFn({ ...mockFinalizedTx, status: 'finalized' })).toBeTruthy();
			expect(capturedIsFinalizedFn({ ...mockFinalizedTx, status: 'confirmed' })).toBeFalsy();
		});

		it('should provide a canSave that requires signature and timestamp', async () => {
			let capturedCanSave: ((tx: SolTransactionUi) => boolean) | undefined;

			vi.spyOn(userTransactionsServices, 'saveFinalizedTransactions').mockImplementation(
				({ canSave }) => {
					capturedCanSave = canSave as (tx: SolTransactionUi) => boolean;
					return Promise.resolve({ success: true });
				}
			);

			await saveSolFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockSolNativeMainnetTokenId,
				transactions: [mockFinalizedTx]
			});

			assertNonNullish(capturedCanSave);

			expect(capturedCanSave(mockFinalizedTx)).toBeTruthy();

			expect(
				capturedCanSave({
					...mockFinalizedTx,
					signature: undefined as unknown as SolTransactionUi['signature']
				})
			).toBeFalsy();

			expect(capturedCanSave({ ...mockFinalizedTx, timestamp: undefined })).toBeFalsy();
		});

		it('should provide a mapToBackend that correctly maps SolTransactionUi to UserTransaction', async () => {
			let capturedMapper: ((tx: SolTransactionUi) => UserTransaction) | undefined;

			vi.spyOn(userTransactionsServices, 'saveFinalizedTransactions').mockImplementation(
				({ mapToBackend }) => {
					capturedMapper = mapToBackend as (tx: SolTransactionUi) => UserTransaction;
					return Promise.resolve({ success: true });
				}
			);

			await saveSolFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockSolNativeMainnetTokenId,
				transactions: [mockSolUserTransactionUi]
			});

			assertNonNullish(capturedMapper);

			const result = capturedMapper(mockSolUserTransactionUi);

			expect(result.id).toBe(mockSolUserTransactionUi.id);
			expect(result.from).toBe(mockSolUserTransactionUi.from);
		});

		it('should return the result from saveFinalizedTransactions', async () => {
			vi.spyOn(userTransactionsServices, 'saveFinalizedTransactions').mockResolvedValue({
				success: true
			});

			const result = await saveSolFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockSolNativeMainnetTokenId,
				transactions: [mockFinalizedTx]
			});

			expect(result).toEqual({ success: true });
		});
	});
});
