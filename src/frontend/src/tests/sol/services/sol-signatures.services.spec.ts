import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { SolAddress } from '$lib/types/address';
import * as solanaApi from '$sol/api/solana.api';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import { getSolSignatures, getSolTransactions } from '$sol/services/sol-signatures.services';
import * as solTransactionsServices from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { SolanaNetworks } from '$sol/types/network';
import type { SolSignature, SolTransactionUi } from '$sol/types/sol-transaction';
import type { RequiredSplToken, SplTokenAddress } from '$sol/types/spl';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	mockSolSignature,
	mockSolSignatureResponse,
	mockSolSignatureResponses
} from '$tests/mocks/sol-signatures.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockSolAddress,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import * as solProgramToken from '@solana-program/token';
import { address, type Address } from '@solana/kit';
import type { MockInstance } from 'vitest';

vi.mock('@solana-program/token', () => ({
	findAssociatedTokenPda: vi.fn()
}));

describe('sol-signatures.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
		vi.restoreAllMocks();

		solTransactionsStore.reset(SOLANA_TOKEN_ID);
	});

	describe('getSolSignatures', () => {
		let spyFetchSignatures: MockInstance;
		let spyFindAssociatedTokenPda: MockInstance;

		const mockNetwork = SolanaNetworks.mainnet;
		const mockTokensList: RequiredSplToken[] = [BONK_TOKEN, USDC_TOKEN];
		const mockAtaAddresses: Record<SplTokenAddress, SolAddress> = {
			[BONK_TOKEN.address]: address(mockAtaAddress),
			[USDC_TOKEN.address]: address(mockAtaAddress2)
		};
		const mockParams = {
			address: mockSolAddress,
			network: mockNetwork,
			tokensList: mockTokensList
		};

		const mockError = new Error('Mock Error');

		const mockSignaturesSol: SolSignature[] = mockSolSignatureResponses(7);
		const mockSignaturesAta1: SolSignature[] = mockSolSignatureResponses(3);
		const mockSignaturesAta2: SolSignature[] = mockSolSignatureResponses(5);
		const mockSignatures: SolSignature[] = [
			...mockSignaturesSol,
			...mockSignaturesAta1,
			...mockSignaturesAta2
		];

		beforeEach(() => {
			spyFetchSignatures = vi.spyOn(solanaApi, 'fetchSignatures');
			spyFetchSignatures.mockImplementation(({ wallet }: { wallet: Address }) =>
				wallet.toString() === mockAtaAddress
					? mockSignaturesAta1
					: wallet.toString() === mockAtaAddress2
						? mockSignaturesAta2
						: mockSignaturesSol
			);

			spyFindAssociatedTokenPda = vi.spyOn(solProgramToken, 'findAssociatedTokenPda');
			spyFindAssociatedTokenPda.mockImplementation(({ mint }: { mint: Address }) => [
				mockAtaAddresses[mint.toString()]
			]);
		});

		it('should fetch all signatures successfully', async () => {
			const signatures = await getSolSignatures(mockParams);

			expect(signatures).toEqual(mockSignatures);

			expect(spyFetchSignatures).toHaveBeenCalledTimes(1 + mockTokensList.length);
			expect(spyFetchSignatures).toHaveBeenNthCalledWith(1, {
				network: mockNetwork,
				wallet: mockSolAddress,
				limit: Number(WALLET_PAGINATION)
			});

			mockTokensList.forEach(({ address }, index) => {
				expect(spyFetchSignatures).toHaveBeenNthCalledWith(index + 2, {
					network: mockNetwork,
					wallet: mockAtaAddresses[address],
					limit: Number(WALLET_PAGINATION)
				});
			});
		});

		it('should remove duplicates signatures', async () => {
			spyFetchSignatures.mockImplementation(({ wallet }: { wallet: Address }) =>
				wallet.toString() === mockAtaAddress
					? mockSignaturesAta1
					: wallet.toString() === mockAtaAddress2
						? mockSignaturesSol
						: mockSignaturesSol
			);

			const signatures = await getSolSignatures(mockParams);

			expect(signatures).toEqual([...mockSignaturesSol, ...mockSignaturesAta1]);
		});

		it('should handle no token list', async () => {
			const { tokensList: _, ...params } = mockParams;

			const signatures = await getSolSignatures(params);

			expect(signatures).toEqual(mockSignaturesSol);

			expect(spyFetchSignatures).toHaveBeenCalledOnce();
			expect(spyFetchSignatures).toHaveBeenNthCalledWith(1, {
				network: mockNetwork,
				wallet: mockSolAddress,
				limit: Number(WALLET_PAGINATION)
			});
		});

		it('should handle an empty token list', async () => {
			const signatures = await getSolSignatures({
				...mockParams,
				tokensList: []
			});

			expect(signatures).toEqual(mockSignaturesSol);

			expect(spyFetchSignatures).toHaveBeenCalledOnce();
			expect(spyFetchSignatures).toHaveBeenNthCalledWith(1, {
				network: mockNetwork,
				wallet: mockSolAddress,
				limit: Number(WALLET_PAGINATION)
			});
		});

		it('should handle empty signatures for a token', async () => {
			spyFetchSignatures.mockImplementation(({ wallet }: { wallet: Address }) =>
				wallet.toString() === mockAtaAddress
					? mockSignaturesAta1
					: wallet.toString() === mockAtaAddress2
						? []
						: mockSignaturesSol
			);

			const signatures = await getSolSignatures(mockParams);

			expect(signatures).toEqual([...mockSignaturesSol, ...mockSignaturesAta1]);
		});

		it('should handle empty signatures for the native token', async () => {
			spyFetchSignatures.mockImplementation(({ wallet }: { wallet: Address }) =>
				wallet.toString() === mockAtaAddress
					? mockSignaturesAta1
					: wallet.toString() === mockAtaAddress2
						? mockSignaturesAta2
						: []
			);

			const signatures = await getSolSignatures(mockParams);

			expect(signatures).toEqual([...mockSignaturesAta1, ...mockSignaturesAta2]);
		});

		it('should handle before parameter', async () => {
			const signature = mockSolSignature();

			await getSolSignatures({ ...mockParams, before: signature });

			expect(spyFetchSignatures).toHaveBeenCalledWith(
				expect.objectContaining({
					before: signature
				})
			);
		});

		it('should handle limit parameter', async () => {
			await getSolSignatures({ ...mockParams, limit: 5 });

			expect(spyFetchSignatures).toHaveBeenCalledWith(
				expect.objectContaining({
					limit: 5
				})
			);
		});

		it('should handle empty signatures response', async () => {
			spyFetchSignatures.mockReturnValue([]);

			const transactions = await getSolSignatures(mockParams);

			expect(transactions).toEqual([]);
		});

		it('should handle RPC errors gracefully', async () => {
			spyFetchSignatures.mockRejectedValue(mockError);

			await expect(getSolSignatures(mockParams)).rejects.toThrow(mockError);
		});
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

			mockAuthStore();
		});

		it('should fetch transactions successfully', async () => {
			const transactions = await getSolTransactions({
				identity: mockIdentity,
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
				identity: mockIdentity,
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
				identity: mockIdentity,
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
				identity: mockIdentity,
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
				identity: mockIdentity,
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
				identity: mockIdentity,
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(0);
		});

		it('should handle RPC errors gracefully', async () => {
			spyFetchSignatures.mockRejectedValue(mockError);

			await expect(
				getSolTransactions({
					identity: mockIdentity,
					address: mockSolAddress,
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow(mockError);
		});
	});
});
