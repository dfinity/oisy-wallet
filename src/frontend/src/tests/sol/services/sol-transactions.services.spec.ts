import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import * as solanaApi from '$sol/api/solana.api';
import { loadNextSolTransactions } from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { SolanaNetworks } from '$sol/types/network';
import { mockSolSignature } from '$tests/mocks/sol-signatures.mock';
import {
	mockSolCertifiedTransactions,
	mockSolRpcReceiveTransaction,
	mockSolRpcSendTransaction
} from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('sol-transactions.services', () => {
	let spyGetTransactions: MockInstance;
	const signalEnd = vi.fn();

	const mockTransactions = [mockSolRpcReceiveTransaction, mockSolRpcSendTransaction];

	beforeEach(() => {
		vi.clearAllMocks();
		solTransactionsStore.reset(SOLANA_TOKEN_ID);
		spyGetTransactions = vi.spyOn(solanaApi, 'getSolTransactions');
	});

	describe('loadNextSolTransactions', () => {
		it('should load and return transactions successfully', async () => {
			spyGetTransactions.mockResolvedValue(mockTransactions);

			const transactions = await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				signalEnd
			});

			expect(transactions).toEqual(mockSolCertifiedTransactions);
			expect(signalEnd).not.toHaveBeenCalled();
			expect(spyGetTransactions).toHaveBeenCalledWith({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});
		});

		it('should handle pagination parameters', async () => {
			spyGetTransactions.mockResolvedValue(mockTransactions);
			const before = mockSolSignature();
			const limit = 10;

			await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before,
				limit,
				signalEnd
			});

			expect(spyGetTransactions).toHaveBeenCalledWith({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before,
				limit
			});
		});

		it('should signal end when no transactions are returned', async () => {
			spyGetTransactions.mockResolvedValue([]);

			const transactions = await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				signalEnd
			});

			expect(transactions).toEqual([]);
			expect(signalEnd).toHaveBeenCalled();
		});

		it('should append transactions to the store', async () => {
			spyGetTransactions.mockResolvedValue(mockTransactions);

			await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				signalEnd
			});

			const storeData = get(solTransactionsStore)?.[SOLANA_TOKEN_ID];
			expect(storeData).toEqual(mockSolCertifiedTransactions);
		});

		it('should handle errors and reset store', async () => {
			const error = new Error('Failed to load transactions');
			spyGetTransactions.mockRejectedValue(error);

			const transactions = await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				signalEnd
			});

			expect(transactions).toEqual([]);
			const storeData = get(solTransactionsStore)?.[SOLANA_TOKEN_ID];
			expect(storeData).toBeNull();
		});

		it('should work with different networks', async () => {
			spyGetTransactions.mockResolvedValue(mockTransactions);

			await loadNextSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.devnet,
				signalEnd
			});

			expect(spyGetTransactions).toHaveBeenCalledWith({
				address: mockSolAddress,
				network: SolanaNetworks.devnet
			});
		});
	});
});
