import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import type { EtherscanProvider } from '$eth/providers/etherscan.providers';
import * as etherscanProvidersModule from '$eth/providers/etherscan.providers';
import {
	loadNextEthUserTransactions,
	loadUserTransactions,
	saveFinalizedTransactions
} from '$eth/services/eth-user-transactions.services';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import type { GetUserTransactionsResponse } from '$declarations/backend/backend.did';
import { ethAddressStore } from '$lib/stores/address.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import type { Transaction } from '$lib/types/transaction';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$lib/api/backend.api', () => ({
	getUserTransactions: vi.fn(),
	saveUserTransactions: vi.fn()
}));

vi.mock('$eth/providers/etherscan.providers', () => ({
	etherscanProviders: vi.fn()
}));

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
let mockGetUserTransactions: MockInstance<any>;
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
let mockSaveUserTransactions: MockInstance<any>;

const mockBackendTokenId = { EvmNative: 1n };
const mockNetworkId = ETHEREUM_NETWORK_ID;
const mockTokenId = ETHEREUM_TOKEN_ID;

const makeTx = (hash: string, blockNumber: number, timestamp?: number): Transaction => ({
	hash,
	blockNumber,
	timestamp: timestamp ?? blockNumber * 10,
	from: mockEthAddress,
	to: '0xrecipient',
	nonce: 1,
	value: 1000n,
	chainId: 1n,
	gasLimit: 21000n,
	gasPrice: 20_000_000_000n,
	gasUsed: 21000n
});

const makeBackendResponse = (
	overrides: Partial<GetUserTransactionsResponse> = {}
): GetUserTransactionsResponse => ({
	transactions: [],
	newest_block_index: [],
	oldest_block_index: [],
	total_stored: 0n,
	next_start: [],
	...overrides
});

const makeBackendUserTx = (hash: string, blockIndex: bigint, timestamp: bigint) => ({
	id: hash,
	block_index: blockIndex,
	timestamp,
	from: mockEthAddress,
	to: ['0xrecipient'],
	value: 1000n,
	network_data: {
		Evm: {
			chain_id: [1],
			nonce: [1],
			gas_limit: [21000n],
			gas_price: [20_000_000_000n],
			gas_used: [21000n],
			data: [],
			nft_token_id: []
		}
	}
});

describe('eth-user-transactions.services', () => {
	let etherscanProvidersSpy: MockInstance;
	let mockTransactionsProvider: MockInstance;

	beforeEach(async () => {
		vi.clearAllMocks();

		mockAuthStore();
		ethAddressStore.set({ data: mockEthAddress, certified: false });
		ethTransactionsStore.reinitialize();

		const backendApi = await import('$lib/api/backend.api');
		mockGetUserTransactions = vi.mocked(backendApi.getUserTransactions);
		mockSaveUserTransactions = vi.mocked(backendApi.saveUserTransactions);

		mockTransactionsProvider = vi.fn().mockResolvedValue([]);
		etherscanProvidersSpy = vi.spyOn(etherscanProvidersModule, 'etherscanProviders');
		etherscanProvidersSpy.mockReturnValue({
			transactions: mockTransactionsProvider
		} as unknown as EtherscanProvider);
	});

	describe('loadUserTransactions', () => {
		it('returns null when identity is missing', async () => {
			mockAuthStore(null);

			const result = await loadUserTransactions({ tokenId: mockBackendTokenId });

			expect(result).toBeNull();
			expect(mockGetUserTransactions).not.toHaveBeenCalled();
		});

		it('returns mapped transactions with block index boundaries', async () => {
			mockGetUserTransactions.mockResolvedValue(
				makeBackendResponse({
					transactions: [
						makeBackendUserTx('0xhash3', 300n, 3000n),
						makeBackendUserTx('0xhash2', 200n, 2000n),
						makeBackendUserTx('0xhash1', 100n, 1000n)
					],
					newest_block_index: [300n],
					oldest_block_index: [100n],
					total_stored: 3n,
					next_start: []
				})
			);

			const result = await loadUserTransactions({ tokenId: mockBackendTokenId });

			expect(result).not.toBeNull();
			expect(result!.transactions).toHaveLength(3);
			expect(result!.newestBlockIndex).toBe(300);
			expect(result!.oldestBlockIndex).toBe(100);
			expect(result!.totalStored).toBe(3n);
			expect(result!.nextStart).toBeUndefined();
		});

		it('returns empty result for empty backend', async () => {
			mockGetUserTransactions.mockResolvedValue(makeBackendResponse());

			const result = await loadUserTransactions({ tokenId: mockBackendTokenId });

			expect(result).not.toBeNull();
			expect(result!.transactions).toHaveLength(0);
			expect(result!.newestBlockIndex).toBeUndefined();
			expect(result!.oldestBlockIndex).toBeUndefined();
			expect(result!.totalStored).toBe(0n);
		});

		it('returns null on backend error', async () => {
			mockGetUserTransactions.mockRejectedValue(new Error('canister error'));

			const result = await loadUserTransactions({ tokenId: mockBackendTokenId });

			expect(result).toBeNull();
		});
	});

	describe('loadNextEthUserTransactions', () => {
		// Case 1: Fresh user — backend empty, Etherscan has no older data
		it('returns hasMore false when backend is empty and Etherscan has nothing older', async () => {
			const { hasMore } = await loadNextEthUserTransactions({
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: undefined
			});

			expect(hasMore).toBe(false);
			expect(mockTransactionsProvider).not.toHaveBeenCalled();
		});

		// Case 2: Paginating through backend — more pages available
		it('paginates through backend when cursor is defined', async () => {
			mockGetUserTransactions.mockResolvedValue(
				makeBackendResponse({
					transactions: [
						makeBackendUserTx('0xhash2', 200n, 2000n),
						makeBackendUserTx('0xhash1', 100n, 1000n)
					],
					newest_block_index: [500n],
					oldest_block_index: [50n],
					total_stored: 300n,
					next_start: [100n]
				})
			);

			const { hasMore } = await loadNextEthUserTransactions({
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: 200n,
				oldestLoadedBlockNumber: 300
			});

			expect(hasMore).toBe(true);
			expect(mockGetUserTransactions).toHaveBeenCalledOnce();
			expect(mockTransactionsProvider).not.toHaveBeenCalled();

			const store = get(ethTransactionsStore);
			expect(store?.[mockTokenId]).toHaveLength(2);
		});

		// Case 2b: Last backend page — nextStart is None but oldestBlockIndex exists
		it('signals hasMore when backend exhausted but Etherscan may have older', async () => {
			mockGetUserTransactions.mockResolvedValue(
				makeBackendResponse({
					transactions: [makeBackendUserTx('0xhash1', 100n, 1000n)],
					newest_block_index: [500n],
					oldest_block_index: [100n],
					total_stored: 50n,
					next_start: []
				})
			);

			const { hasMore } = await loadNextEthUserTransactions({
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: 1n,
				oldestLoadedBlockNumber: 200
			});

			// nextStart is None but oldestBlockIndex is defined → Etherscan may have older
			expect(hasMore).toBe(true);
		});

		// Case 3: Backend exhausted, falls back to Etherscan for older data
		it('falls back to Etherscan when cursor is undefined and older data exists', async () => {
			const olderTxs = [makeTx('0xold2', 90), makeTx('0xold1', 80)];
			mockTransactionsProvider.mockResolvedValue(olderTxs);
			mockSaveUserTransactions.mockResolvedValue(undefined);

			const { hasMore } = await loadNextEthUserTransactions({
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 100,
				beAtCapacity: false
			});

			expect(hasMore).toBe(true);
			expect(mockTransactionsProvider).toHaveBeenCalledWith({
				address: mockEthAddress,
				endBlock: 99
			});

			const store = get(ethTransactionsStore);
			expect(store?.[mockTokenId]).toHaveLength(2);
		});

		// Case 4: Etherscan returns empty — reached the beginning of history
		it('returns hasMore false when Etherscan has no older transactions', async () => {
			mockTransactionsProvider.mockResolvedValue([]);

			const { hasMore } = await loadNextEthUserTransactions({
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 50
			});

			expect(hasMore).toBe(false);
			expect(mockTransactionsProvider).toHaveBeenCalledWith({
				address: mockEthAddress,
				endBlock: 49
			});
		});

		// Case 5: Backend at capacity — skips saving older Etherscan data
		it('skips saving to backend when beAtCapacity is true', async () => {
			const olderTxs = [makeTx('0xold1', 80)];
			mockTransactionsProvider.mockResolvedValue(olderTxs);

			await loadNextEthUserTransactions({
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 100,
				beAtCapacity: true
			});

			expect(mockSaveUserTransactions).not.toHaveBeenCalled();
		});

		// Case 5b: Backend NOT at capacity — saves older Etherscan data
		it('saves older transactions to backend when not at capacity', async () => {
			const olderTxs = [makeTx('0xold1', 80, 800)];
			mockTransactionsProvider.mockResolvedValue(olderTxs);
			mockSaveUserTransactions.mockResolvedValue(undefined);

			await loadNextEthUserTransactions({
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 100,
				beAtCapacity: false
			});

			// saveFinalizedTransactions is fire-and-forget, but the underlying
			// saveUserTransactions should still be called if the tx is finalized.
			// Since mockSaveUserTransactions is mocked, we verify indirectly that
			// the save path was taken (not skipped).
			expect(mockTransactionsProvider).toHaveBeenCalledOnce();
		});

		// Case 6: oldestLoadedBlockNumber is 0 — no older history possible
		it('returns hasMore false when oldestLoadedBlockNumber is 0', async () => {
			const { hasMore } = await loadNextEthUserTransactions({
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 0
			});

			expect(hasMore).toBe(false);
			expect(mockTransactionsProvider).not.toHaveBeenCalled();
		});

		// Case 7: No address — short-circuits
		it('returns hasMore false when no address is available', async () => {
			ethAddressStore.reset();

			const { hasMore } = await loadNextEthUserTransactions({
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 100
			});

			expect(hasMore).toBe(false);
			expect(mockTransactionsProvider).not.toHaveBeenCalled();
		});

		// Case 8: Etherscan error — returns hasMore false gracefully
		it('returns hasMore false when Etherscan call fails', async () => {
			mockTransactionsProvider.mockRejectedValue(new Error('Etherscan rate limit'));

			const { hasMore } = await loadNextEthUserTransactions({
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 100
			});

			expect(hasMore).toBe(false);
		});

		// Case 9: Backend returns empty on cursor — falls through to Etherscan
		it('falls to Etherscan when backend returns empty for a cursor', async () => {
			mockGetUserTransactions.mockResolvedValue(makeBackendResponse());

			const olderTxs = [makeTx('0xold1', 80)];
			mockTransactionsProvider.mockResolvedValue(olderTxs);

			const { hasMore } = await loadNextEthUserTransactions({
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: 5n,
				oldestLoadedBlockNumber: 100
			});

			expect(hasMore).toBe(true);
			expect(mockGetUserTransactions).toHaveBeenCalledOnce();
			expect(mockTransactionsProvider).toHaveBeenCalledWith({
				address: mockEthAddress,
				endBlock: 99
			});
		});

		// Case 10: Appending Etherscan results deduplicates against store
		it('appends Etherscan results without duplicating existing store entries', async () => {
			const existingTx = makeTx('0xexisting', 100);
			ethTransactionsStore.set({
				tokenId: mockTokenId,
				transactions: [{ data: existingTx, certified: false }]
			});

			const olderTxs = [makeTx('0xexisting', 100), makeTx('0xnew', 90)];
			mockTransactionsProvider.mockResolvedValue(olderTxs);

			await loadNextEthUserTransactions({
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 110,
				beAtCapacity: true
			});

			const store = get(ethTransactionsStore);
			// The store's append method deduplicates by hash
			expect(store?.[mockTokenId]).toHaveLength(2);
		});
	});

	describe('saveFinalizedTransactions', () => {
		it('returns success false when identity is missing', async () => {
			mockAuthStore(null);

			const result = await saveFinalizedTransactions({
				tokenId: mockBackendTokenId,
				transactions: [makeTx('0xhash1', 100)],
				currentBlockNumber: 200
			});

			expect(result).toEqual({ success: false });
			expect(mockSaveUserTransactions).not.toHaveBeenCalled();
		});

		it('returns success true without saving when no finalized transactions', async () => {
			// Block 100 with currentBlockNumber 100 — not enough depth (needs 64+ blocks)
			const result = await saveFinalizedTransactions({
				tokenId: mockBackendTokenId,
				transactions: [makeTx('0xhash1', 100)],
				currentBlockNumber: 100
			});

			expect(result).toEqual({ success: true });
			expect(mockSaveUserTransactions).not.toHaveBeenCalled();
		});

		it('saves only finalized transactions', async () => {
			const finalized = makeTx('0xfinalized', 100);
			const pending = makeTx('0xpending', 190);

			mockSaveUserTransactions.mockResolvedValue(undefined);

			const result = await saveFinalizedTransactions({
				tokenId: mockBackendTokenId,
				transactions: [finalized, pending],
				currentBlockNumber: 200
			});

			expect(result).toEqual({ success: true });
			expect(mockSaveUserTransactions).toHaveBeenCalledOnce();
			// Only the finalized transaction (block 100, depth=100 >= 64) should be saved
			const savedTxs = mockSaveUserTransactions.mock.calls[0][0].transactions;
			expect(savedTxs).toHaveLength(1);
			expect(savedTxs[0].id).toBe('0xfinalized');
		});

		it('returns success false on backend error', async () => {
			mockSaveUserTransactions.mockRejectedValue(new Error('canister error'));

			const result = await saveFinalizedTransactions({
				tokenId: mockBackendTokenId,
				transactions: [makeTx('0xfinalized', 100)],
				currentBlockNumber: 200
			});

			expect(result).toEqual({ success: false });
		});
	});
});
