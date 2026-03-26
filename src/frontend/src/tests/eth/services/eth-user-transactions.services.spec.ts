import type { UserTransaction } from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import type { EtherscanProvider } from '$eth/providers/etherscan.providers';
import * as etherscanProvidersModule from '$eth/providers/etherscan.providers';
import type { InfuraProvider } from '$eth/providers/infura.providers';
import * as infuraProvidersModule from '$eth/providers/infura.providers';
import {
	loadEthUserTransactions,
	loadNextEthUserTransactions,
	saveEthFinalizedTransactions
} from '$eth/services/eth-user-transactions.services';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { ZERO } from '$lib/constants/app.constants';
import type { GetUserTransactionsResponse } from '$lib/types/api';
import type { Transaction } from '$lib/types/transaction';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { createMockBackendUserTransaction } from '$tests/mocks/user-transactions.mock';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$lib/api/backend.api', () => ({
	getUserTransactions: vi.fn(),
	saveUserTransactions: vi.fn()
}));

vi.mock('$eth/providers/etherscan.providers', () => ({
	etherscanProviders: vi.fn()
}));

vi.mock('$eth/providers/infura.providers', () => ({
	infuraProviders: vi.fn()
}));

let mockGetUserTransactions: MockInstance;
let mockSaveUserTransactions: MockInstance;

const mockBackendTokenId = { EvmNative: 1n };
const mockNetworkId = ETHEREUM_NETWORK_ID;
const mockTokenId = ETHEREUM_TOKEN_ID;

const makeTx = ({
	hash,
	blockNumber,
	timestamp
}: {
	hash: string;
	blockNumber: number;
	timestamp?: number;
}): Transaction => ({
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
	gasUsed: 21000n,
	data: ''
});

const makeBackendResponse = ({
	overrides = {}
}: {
	overrides?: Partial<GetUserTransactionsResponse>;
} = {}): GetUserTransactionsResponse => ({
	transactions: [],
	totalStored: ZERO,
	...overrides
});

const MOCK_LATEST_BLOCK_NUMBER = 1000;

describe('eth-user-transactions.services', () => {
	let etherscanProvidersSpy: MockInstance;
	let infuraProvidersSpy: MockInstance;
	let mockTransactionsProvider: MockInstance;
	let mockGetBlockNumber: MockInstance;

	beforeEach(async () => {
		vi.clearAllMocks();

		ethTransactionsStore.reinitialize();

		const backendApi = await import('$lib/api/backend.api');
		mockGetUserTransactions = vi.mocked(backendApi.getUserTransactions);
		mockSaveUserTransactions = vi.mocked(backendApi.saveUserTransactions);

		mockTransactionsProvider = vi.fn().mockResolvedValue([]);
		etherscanProvidersSpy = vi.spyOn(etherscanProvidersModule, 'etherscanProviders');
		etherscanProvidersSpy.mockReturnValue({
			transactions: mockTransactionsProvider
		} as unknown as EtherscanProvider);

		mockGetBlockNumber = vi.fn().mockResolvedValue(MOCK_LATEST_BLOCK_NUMBER);
		infuraProvidersSpy = vi.spyOn(infuraProvidersModule, 'infuraProviders');
		infuraProvidersSpy.mockReturnValue({
			getBlockNumber: mockGetBlockNumber
		} as unknown as InfuraProvider);
	});

	describe('loadEthUserTransactions', () => {
		it('returns undefined when identity is missing', async () => {
			const result = await loadEthUserTransactions({ identity: null, tokenId: mockBackendTokenId });

			expect(result).toBeUndefined();
			expect(mockGetUserTransactions).not.toHaveBeenCalled();
		});

		it('returns mapped transactions with block index boundaries', async () => {
			mockGetUserTransactions.mockResolvedValue(
				makeBackendResponse({
					overrides: {
						transactions: [
							createMockBackendUserTransaction({ hash: '0xhash3', blockIndex: 300n, timestamp: 3000n }),
							createMockBackendUserTransaction({ hash: '0xhash2', blockIndex: 200n, timestamp: 2000n }),
							createMockBackendUserTransaction({ hash: '0xhash1', blockIndex: 100n, timestamp: 1000n })
						],
						newestBlockIndex: 300n,
						oldestBlockIndex: 100n,
						totalStored: 3n
					}
				})
			);

			const result = await loadEthUserTransactions({
				identity: mockIdentity,
				tokenId: mockBackendTokenId
			});

			expect(result).toBeDefined();

			if (result === undefined) {
				return;
			}

			expect(result.transactions).toHaveLength(3);
			expect(result.newestBlockIndex).toBe(300n);
			expect(result.oldestBlockIndex).toBe(100n);
			expect(result.totalStored).toBe(3n);
			expect(result.nextStart).toBeUndefined();
		});

		it('returns empty result for empty backend', async () => {
			mockGetUserTransactions.mockResolvedValue(makeBackendResponse());

			const result = await loadEthUserTransactions({
				identity: mockIdentity,
				tokenId: mockBackendTokenId
			});

			expect(result).toBeDefined();

			if (result === undefined) {
				return;
			}

			expect(result.transactions).toHaveLength(0);
			expect(result.newestBlockIndex).toBeUndefined();
			expect(result.oldestBlockIndex).toBeUndefined();
			expect(result.totalStored).toBe(ZERO);
		});

		it('returns undefined on backend error', async () => {
			mockGetUserTransactions.mockRejectedValue(new Error('canister error'));

			const result = await loadEthUserTransactions({
				identity: mockIdentity,
				tokenId: mockBackendTokenId
			});

			expect(result).toBeUndefined();
		});
	});

	describe('loadNextEthUserTransactions', () => {
		// Case 1: Fresh user — backend empty, Etherscan has no older data
		it('returns hasMore false when backend is empty and Etherscan has nothing older', async () => {
			const { hasMore } = await loadNextEthUserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: undefined
			});

			expect(hasMore).toBeFalsy();
			expect(mockTransactionsProvider).not.toHaveBeenCalled();
		});

		// Case 2: Paginating through backend — more pages available
		it('paginates through backend when cursor is defined', async () => {
			mockGetUserTransactions.mockResolvedValue(
				makeBackendResponse({
					overrides: {
						transactions: [
							createMockBackendUserTransaction({ hash: '0xhash2', blockIndex: 200n, timestamp: 2000n }),
							createMockBackendUserTransaction({ hash: '0xhash1', blockIndex: 100n, timestamp: 1000n })
						],
						newestBlockIndex: 500n,
						oldestBlockIndex: 50n,
						totalStored: 300n,
						nextStart: 100n
					}
				})
			);

			const { hasMore } = await loadNextEthUserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: 200n,
				oldestLoadedBlockNumber: 300
			});

			expect(hasMore).toBeTruthy();
			expect(mockGetUserTransactions).toHaveBeenCalledOnce();
			expect(mockTransactionsProvider).not.toHaveBeenCalled();

			const store = get(ethTransactionsStore);

			expect(store?.[mockTokenId]).toHaveLength(2);
		});

		// Case 2b: Last backend page — nextStart is None but oldestBlockIndex exists
		it('signals hasMore when backend exhausted but Etherscan may have older', async () => {
			mockGetUserTransactions.mockResolvedValue(
				makeBackendResponse({
					overrides: {
						transactions: [
							createMockBackendUserTransaction({ hash: '0xhash1', blockIndex: 100n, timestamp: 1000n })
						],
						newestBlockIndex: 500n,
						oldestBlockIndex: 100n,
						totalStored: 50n
					}
				})
			);

			const { hasMore } = await loadNextEthUserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: 1n,
				oldestLoadedBlockNumber: 200
			});

			// nextStart is None but oldestBlockIndex is defined → Etherscan may have older
			expect(hasMore).toBeTruthy();
		});

		// Case 3: Backend exhausted, falls back to Etherscan for older data
		it('falls back to Etherscan when cursor is undefined and older data exists', async () => {
			const olderTxs = [
				makeTx({ hash: '0xold2', blockNumber: 90 }),
				makeTx({ hash: '0xold1', blockNumber: 80 })
			];
			mockTransactionsProvider.mockResolvedValue(olderTxs);
			mockSaveUserTransactions.mockResolvedValue(undefined);

			const { hasMore } = await loadNextEthUserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 100,
				beAtCapacity: false
			});

			expect(hasMore).toBeTruthy();
			expect(mockTransactionsProvider).toHaveBeenCalledWith({
				address: mockEthAddress,
				endBlock: 99,
				sort: 'desc'
			});

			const store = get(ethTransactionsStore);

			expect(store?.[mockTokenId]).toHaveLength(2);
		});

		// Case 4: Etherscan returns empty — reached the beginning of history
		it('returns hasMore false when Etherscan has no older transactions', async () => {
			mockTransactionsProvider.mockResolvedValue([]);

			const { hasMore } = await loadNextEthUserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 50
			});

			expect(hasMore).toBeFalsy();
			expect(mockTransactionsProvider).toHaveBeenCalledWith({
				address: mockEthAddress,
				endBlock: 49,
				sort: 'desc'
			});
		});

		// Case 5: Backend at capacity — skips saving older Etherscan data
		it('skips saving to backend when beAtCapacity is true', async () => {
			const olderTxs = [makeTx({ hash: '0xold1', blockNumber: 80 })];
			mockTransactionsProvider.mockResolvedValue(olderTxs);

			await loadNextEthUserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
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
			const olderTxs = [makeTx({ hash: '0xold1', blockNumber: 80, timestamp: 800 })];
			mockTransactionsProvider.mockResolvedValue(olderTxs);
			mockSaveUserTransactions.mockResolvedValue(undefined);

			await loadNextEthUserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 100,
				beAtCapacity: false
			});

			expect(mockTransactionsProvider).toHaveBeenCalledOnce();
			expect(mockGetBlockNumber).toHaveBeenCalledOnce();
			expect(mockSaveUserTransactions).toHaveBeenCalledOnce();
		});

		// Case 6: oldestLoadedBlockNumber is 0 — no older history possible
		it('returns hasMore false when oldestLoadedBlockNumber is 0', async () => {
			const { hasMore } = await loadNextEthUserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 0
			});

			expect(hasMore).toBeFalsy();
			expect(mockTransactionsProvider).not.toHaveBeenCalled();
		});

		// Case 7: No address — short-circuits
		it('returns hasMore false when address is nullish', async () => {
			const { hasMore } = await loadNextEthUserTransactions({
				identity: mockIdentity,
				address: undefined,
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 100
			});

			expect(hasMore).toBeFalsy();
			expect(mockTransactionsProvider).not.toHaveBeenCalled();
		});

		// Case 8: Etherscan error — returns hasMore false gracefully
		it('returns hasMore false when Etherscan call fails', async () => {
			mockTransactionsProvider.mockRejectedValue(new Error('Etherscan rate limit'));

			const { hasMore } = await loadNextEthUserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: undefined,
				oldestLoadedBlockNumber: 100
			});

			expect(hasMore).toBeFalsy();
		});

		// Case 9: Backend returns empty on cursor — falls through to Etherscan
		it('falls to Etherscan when backend returns empty for a cursor', async () => {
			mockGetUserTransactions.mockResolvedValue(makeBackendResponse());

			const olderTxs = [makeTx({ hash: '0xold1', blockNumber: 80 })];
			mockTransactionsProvider.mockResolvedValue(olderTxs);

			const { hasMore } = await loadNextEthUserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: mockBackendTokenId,
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				cursor: 5n,
				oldestLoadedBlockNumber: 100
			});

			expect(hasMore).toBeTruthy();
			expect(mockGetUserTransactions).toHaveBeenCalledOnce();
			expect(mockTransactionsProvider).toHaveBeenCalledWith({
				address: mockEthAddress,
				endBlock: 99,
				sort: 'desc'
			});
		});

		// Case 10: Appending Etherscan results deduplicates against store
		it('appends Etherscan results without duplicating existing store entries', async () => {
			const existingTx = makeTx({ hash: '0xexisting', blockNumber: 100 });
			ethTransactionsStore.set({
				tokenId: mockTokenId,
				transactions: [{ data: existingTx, certified: false }]
			});

			const olderTxs = [
				makeTx({ hash: '0xexisting', blockNumber: 100 }),
				makeTx({ hash: '0xnew', blockNumber: 90 })
			];
			mockTransactionsProvider.mockResolvedValue(olderTxs);

			await loadNextEthUserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
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

	describe('saveEthFinalizedTransactions', () => {
		it('returns success false when identity is missing', async () => {
			const result = await saveEthFinalizedTransactions({
				identity: null,
				tokenId: mockBackendTokenId,
				transactions: [makeTx({ hash: '0xhash1', blockNumber: 100 })],
				currentBlockNumber: 200
			});

			expect(result).toEqual({ success: false });
			expect(mockSaveUserTransactions).not.toHaveBeenCalled();
		});

		it('returns success true without saving when no finalized transactions', async () => {
			// Block 100 with currentBlockNumber 100 — not enough depth (needs 64+ blocks)
			const result = await saveEthFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockBackendTokenId,
				transactions: [makeTx({ hash: '0xhash1', blockNumber: 100 })],
				currentBlockNumber: 100
			});

			expect(result).toEqual({ success: true });
			expect(mockSaveUserTransactions).not.toHaveBeenCalled();
		});

		it('saves only finalized transactions', async () => {
			const finalized = makeTx({ hash: '0xfinalized', blockNumber: 100 });
			const pending = makeTx({ hash: '0xpending', blockNumber: 190 });

			mockSaveUserTransactions.mockResolvedValue(undefined);

			const result = await saveEthFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockBackendTokenId,
				transactions: [finalized, pending],
				currentBlockNumber: 200
			});

			expect(result).toEqual({ success: true });
			expect(mockSaveUserTransactions).toHaveBeenCalledOnce();

			// Only the finalized transaction (block 100, depth=100 >= 64) should be saved
			const savedTxs = (
				mockSaveUserTransactions.mock.calls[0][0] as { transactions: UserTransaction[] }
			).transactions;

			expect(savedTxs).toHaveLength(1);
			expect(savedTxs[0].id).toBe('0xfinalized');
		});

		it('returns success false on backend error', async () => {
			mockSaveUserTransactions.mockRejectedValue(new Error('canister error'));

			const result = await saveEthFinalizedTransactions({
				identity: mockIdentity,
				tokenId: mockBackendTokenId,
				transactions: [makeTx({ hash: '0xfinalized', blockNumber: 100 })],
				currentBlockNumber: 200
			});

			expect(result).toEqual({ success: false });
		});
	});
});
