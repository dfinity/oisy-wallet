import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import * as solanaApi from '$sol/api/solana.api';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import * as solTransactionsServices from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { SolanaNetworks } from '$sol/types/network';
import { mockSolSignature, mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { type MockInstance } from 'vitest';

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

		const mockError = new Error('Mock Error');

		const mockSignatures = [mockSolSignatureResponse(), mockSolSignatureResponse()];

		const mockSolTransactions = createMockSolTransactionsUi(3);

		beforeEach(() => {
			spyFetchSignatures = vi.spyOn(solanaApi, 'fetchSignatures');
			spyFetchSignatures.mockReturnValue(mockSignatures);

			spyFetchTransactionsForSignature = vi.spyOn(
				solTransactionsServices,
				'fetchSolTransactionsForSignature'
			);
			spyFetchTransactionsForSignature.mockResolvedValue(mockSolTransactions);
		});

		it('should fetch transactions successfully', async () => {
			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(mockSignatures.length * mockSolTransactions.length);
			expect(spyFetchSignatures).toHaveBeenCalledTimes(1);
			expect(spyFetchTransactionsForSignature).toHaveBeenCalledTimes(2);
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
