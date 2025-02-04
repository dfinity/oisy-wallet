import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import * as solanaApi from '$sol/api/solana.api';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { SolanaNetworks } from '$sol/types/network';
import { mockSolSignature, mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import { mockSolRpcSendTransaction } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { vi, type MockInstance } from 'vitest';

describe('sol-transactions.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
		vi.restoreAllMocks();

		solTransactionsStore.reset(SOLANA_TOKEN_ID);
	});

	describe('getSolTransactions', () => {
		let spyFetchSignatures: MockInstance;
		let spyFetchTransactionDetailForSignature: MockInstance;

		const mockError = new Error('RPC Error');

		beforeEach(() => {
			spyFetchSignatures = vi.spyOn(solanaApi, 'fetchSignatures');
			spyFetchSignatures.mockReturnValue([mockSolSignatureResponse(), mockSolSignatureResponse()]);

			spyFetchTransactionDetailForSignature = vi.spyOn(
				solanaApi,
				'fetchTransactionDetailForSignature'
			);
			spyFetchTransactionDetailForSignature.mockResolvedValue(mockSolRpcSendTransaction);
		});

		it('should fetch transactions successfully', async () => {
			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(2);
			expect(spyFetchSignatures).toHaveBeenCalledTimes(1);
			expect(spyFetchTransactionDetailForSignature).toHaveBeenCalledTimes(2);
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

		it('should not return transactions that do not change SOL balance', async () => {
			spyFetchTransactionDetailForSignature.mockReturnValue({
				...mockSolRpcSendTransaction,
				meta: {
					...mockSolRpcSendTransaction.meta,
					postBalances: mockSolRpcSendTransaction.meta?.postBalances,
					preBalances: mockSolRpcSendTransaction.meta?.postBalances
				}
			});

			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				limit: 5
			});

			expect(transactions).toHaveLength(0);
		});

		it('should handle empty signatures response', async () => {
			spyFetchSignatures.mockReturnValue([]);

			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(0);
			expect(spyFetchTransactionDetailForSignature).not.toHaveBeenCalled();
		});

		it('should handle null transaction responses', async () => {
			spyFetchSignatures.mockReturnValue([mockSolSignatureResponse()]);
			spyFetchTransactionDetailForSignature.mockReturnValue(null);

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
