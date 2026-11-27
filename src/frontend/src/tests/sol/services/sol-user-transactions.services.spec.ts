import type { UserTransaction } from '$declarations/backend/backend.did';
import * as backendApi from '$lib/api/backend.api';
import * as userTransactionsServices from '$lib/services/user-transactions.services';
import { saveSolFinalizedTransactions } from '$sol/services/sol-user-transactions.services';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { createMockSolTransactionUi, mockSignature } from '$tests/mocks/sol-transactions.mock';
import {
	mockSolNativeMainnetTokenId,
	mockSolUserTransactionUi
} from '$tests/mocks/sol-user-transactions.mock';
import { assertNonNullish } from '@dfinity/utils';
import { signature } from '@solana/kit';

vi.mock('$lib/services/user-transactions.services', () => ({
	saveFinalizedTransactions: vi.fn()
}));

vi.mock('$lib/api/backend.api', () => ({
	saveUserTransactions: vi.fn()
}));

describe('sol-user-transactions.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
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

		describe('when the canister refuses the save for its rate limit', () => {
			beforeEach(() => {
				vi.useFakeTimers();
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			it('should send it again once the window has passed', async () => {
				const { saveFinalizedTransactions } = await vi.importActual<
					typeof userTransactionsServices
				>('$lib/services/user-transactions.services');

				vi.spyOn(userTransactionsServices, 'saveFinalizedTransactions').mockImplementation(
					saveFinalizedTransactions
				);

				vi.mocked(backendApi.saveUserTransactions)
					.mockRejectedValueOnce({
						RateLimited: { max_calls: 30, window_ns: 60_000_000_000n, caller: mockPrincipal }
					})
					.mockResolvedValue(undefined);

				const result = saveSolFinalizedTransactions({
					identity: mockIdentity,
					tokenId: mockSolNativeMainnetTokenId,
					transactions: [mockFinalizedTx]
				});

				await vi.advanceTimersByTimeAsync(60_000);

				await expect(result).resolves.toEqual({ success: true });
				expect(backendApi.saveUserTransactions).toHaveBeenCalledTimes(2);
			});
		});
	});
});
