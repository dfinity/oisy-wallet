import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import * as solanaApi from '$sol/api/solana.api';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import * as solTransactionsServices from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { SolanaNetworks } from '$sol/types/network';
import type { SolSignature, SolTransactionUi } from '$sol/types/sol-transaction';
import {
	mockSolSignature,
	mockSolSignatureResponse,
	mockSolSignatureResponses
} from '$tests/mocks/sol-signatures.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress, mockSplAddress } from '$tests/mocks/sol.mock';
import * as solProgramToken from '@solana-program/token';
import { address } from '@solana/addresses';
import { type MockInstance } from 'vitest';

vi.mock('@solana-program/token', () => ({
	findAssociatedTokenPda: vi.fn()
}));

describe('sol-transactions.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
		vi.restoreAllMocks();

		solTransactionsStore.reset(SOLANA_TOKEN_ID);
	});

	describe('getSolTransactions', () => {
		let spyFetchSignatures: MockInstance;
		let spyFetchTransactionsForSignature: MockInstance;
		let spyFindAssociatedTokenPda: MockInstance;

		const mockError = new Error('Mock Error');

		const mockSignatures: SolSignature[] = mockSolSignatureResponses(7);

		const mockSolTransactions: SolTransactionUi[] = createMockSolTransactionsUi(3);

		beforeEach(() => {
			spyFetchSignatures = vi.spyOn(solanaApi, 'fetchSignatures');
			spyFetchSignatures.mockReturnValue(mockSignatures);

			spyFetchTransactionsForSignature = vi.spyOn(
				solTransactionsServices,
				'fetchSolTransactionsForSignature'
			);
			spyFetchTransactionsForSignature.mockResolvedValue(mockSolTransactions);

			spyFindAssociatedTokenPda = vi.spyOn(solProgramToken, 'findAssociatedTokenPda');
		});

		it('should fetch transactions successfully', async () => {
			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(mockSignatures.length * mockSolTransactions.length);
			expect(spyFetchSignatures).toHaveBeenCalledOnce();
			expect(spyFetchTransactionsForSignature).toHaveBeenCalledTimes(mockSignatures.length);
		});

		it('should correctly handle a token address', async () => {
			// Mocking the signatures for the token address
			const mockNewSignatures: SolSignature[] = mockSolSignatureResponses(13);
			spyFetchSignatures
				.mockReturnValueOnce(mockSignatures)
				.mockReturnValueOnce([...mockSignatures, ...mockNewSignatures]);

			spyFindAssociatedTokenPda.mockResolvedValueOnce([mockSplAddress]);

			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				tokenAddress: mockSplAddress
			});

			expect(spyFindAssociatedTokenPda).toHaveBeenCalledWith({
				owner: mockSolAddress,
				tokenProgram: address(TOKEN_PROGRAM_ADDRESS),
				mint: mockSplAddress
			});

			expect(transactions).toHaveLength(
				(mockSignatures.length + mockNewSignatures.length) * mockSolTransactions.length
			);
			expect(spyFetchSignatures).toHaveBeenCalledTimes(2);
			expect(spyFetchTransactionsForSignature).toHaveBeenCalledTimes(
				mockSignatures.length + mockNewSignatures.length
			);
		});

		it('should handle before parameter', async () => {
			const signature = mockSolSignature();
			await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before: signature
			});

			expect(spyFetchSignatures).toHaveBeenCalledWith(
				expect.objectContaining({
					before: signature
				})
			);
		});

		it('should handle limit parameter', async () => {
			await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				limit: 5
			});

			expect(spyFetchSignatures).toHaveBeenCalledWith(
				expect.objectContaining({
					limit: 5
				})
			);
		});

		it('should handle empty signatures response', async () => {
			spyFetchSignatures.mockReturnValue([]);

			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(0);
			expect(spyFetchTransactionsForSignature).not.toHaveBeenCalled();
		});

		it('should handle empty transactions responses', async () => {
			spyFetchSignatures.mockReturnValue([mockSolSignatureResponse()]);
			spyFetchTransactionsForSignature.mockReturnValue([]);

			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(0);
		});

		it('should handle RPC errors gracefully', async () => {
			spyFetchSignatures.mockRejectedValue(mockError);

			await expect(
				getSolTransactions({
					address: mockSolAddress,
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow(mockError);
		});
	});
});
