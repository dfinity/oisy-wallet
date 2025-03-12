import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { last } from '$lib/utils/array.utils';
import * as solanaApi from '$sol/api/solana.api';
import { loadSolLamportsBalance } from '$sol/api/solana.api';
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
import { notEmptyString } from '@dfinity/utils';
import * as solProgramToken from '@solana-program/token';
import { address } from '@solana/web3.js';
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
		it('should match the total balance of an account', async () => {
			// If the Alchemy API is empty, the test will fail.
			assert(
				notEmptyString(ALCHEMY_API_KEY),
				'ALCHEMY_API_KEY is empty, please provide a valid key in the env file as VITE_ALCHEMY_API_KEY'
			);

			// We use a real address here to test the function. Ideally, the address is a very active one.
			const address = '7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1';

			const loadTransactions = async (
				lastSignature?: string | undefined
			): Promise<SolTransactionUi[]> => {
				const transactions = await getSolTransactions({
					address,
					network: SolanaNetworks.mainnet,
					before: lastSignature,
					limit: 100
				});

				if (transactions.length === 0) {
					return transactions;
				}

				const nextTransactions: SolTransactionUi[] = await loadTransactions(
					last(transactions)?.signature
				);

				return [...transactions, ...nextTransactions];
			};

			const transactions = await loadTransactions();

			const { solBalance: transactionSolBalance, totalFee } = transactions.reduce<{
				solBalance: bigint;
				totalFee: bigint;
				signatures: string[];
			}>(
				({ solBalance, totalFee, signatures }, { value, type, fee, signature }) => ({
					solBalance: solBalance + (value ?? 0n) * (type === 'send' ? -1n : 1n),
					totalFee: signatures.includes(signature) ? totalFee : totalFee + (fee ?? 0n),
					signatures: [...signatures, signature]
				}),
				{
					solBalance: 0n,
					totalFee: 0n,
					signatures: []
				}
			);

			const fetchedSolBalance = await loadSolLamportsBalance({
				address,
				network: SolanaNetworks.mainnet
			});

			expect(transactionSolBalance - totalFee).toBe(fetchedSolBalance);
		}, 600000);

		// describe('with mocked dependencies', () => {
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
			spyFindAssociatedTokenPda.mockResolvedValueOnce([mockSplAddress]);

			await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				tokenAddress: mockSplAddress,
				tokenOwnerAddress: TOKEN_PROGRAM_ADDRESS
			});

			expect(spyFindAssociatedTokenPda).toHaveBeenCalledOnce();
			expect(spyFindAssociatedTokenPda).toHaveBeenCalledWith({
				owner: mockSolAddress,
				tokenProgram: address(TOKEN_PROGRAM_ADDRESS),
				mint: mockSplAddress
			});
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
		// });
	});
});
