import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import type { AlchemyProvider } from '$eth/providers/alchemy.providers';
import * as alchemyProvidersModule from '$eth/providers/alchemy.providers';
import type { EtherscanProvider } from '$eth/providers/etherscan.providers';
import * as etherscanProvidersModule from '$eth/providers/etherscan.providers';
import type { InfuraProvider } from '$eth/providers/infura.providers';
import * as infuraProvidersModule from '$eth/providers/infura.providers';
import {
	fetchErc20Transfers,
	loadNextErc20UserTransactions,
	persistableErc20Transfers,
	saveErc20FinalizedTransactions
} from '$eth/services/erc20-user-transactions.services';
import {
	isEthBackendAtCapacity,
	setEthBackendAtCapacity,
	setEthBackendPaginationCursor
} from '$eth/services/eth-user-transactions.services';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { ZERO } from '$lib/constants/app.constants';
import { MAX_USER_TRANSACTIONS_PER_TOKEN } from '$lib/constants/user-transactions.constants';
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

vi.mock('$eth/providers/alchemy.providers', () => ({
	alchemyProviders: vi.fn()
}));

describe('erc20-user-transactions.services', () => {
	const backendTokenId: BackendTokenId = {
		Erc20: [USDC_TOKEN.address, USDC_TOKEN.network.chainId]
	};

	let mockGetUserTransactions: MockInstance;
	let mockSaveUserTransactions: MockInstance;
	let mockErc20Transactions: MockInstance;
	let mockGetBlockNumber: MockInstance;
	let mockGetTransaction: MockInstance;

	const makeTx = ({
		hash,
		blockNumber,
		value = 1000n
	}: {
		hash: string;
		blockNumber: number;
		value?: bigint;
	}): Transaction => ({
		hash,
		blockNumber,
		timestamp: blockNumber * 10,
		from: mockEthAddress,
		to: '0xrecipient',
		nonce: 1,
		value,
		chainId: USDC_TOKEN.network.chainId,
		gasLimit: 21000n,
		gasPrice: 20_000_000_000n,
		gasUsed: 21000n,
		data: ''
	});

	beforeEach(async () => {
		vi.clearAllMocks();

		ethTransactionsStore.reinitialize();

		setEthBackendPaginationCursor({ tokenId: USDC_TOKEN.id, nextStart: undefined });
		setEthBackendAtCapacity({ tokenId: USDC_TOKEN.id, totalStored: undefined });

		const backendApi = await import('$lib/api/backend.api');
		mockGetUserTransactions = vi.mocked(backendApi.getUserTransactions);
		mockSaveUserTransactions = vi.mocked(backendApi.saveUserTransactions);

		mockErc20Transactions = vi.fn().mockResolvedValue([]);
		mockGetBlockNumber = vi.fn().mockResolvedValue(1_000_000);
		mockGetTransaction = vi.fn().mockResolvedValue({ from: mockEthAddress });

		vi.spyOn(etherscanProvidersModule, 'etherscanProviders').mockReturnValue({
			erc20Transactions: mockErc20Transactions
		} as unknown as EtherscanProvider);

		vi.spyOn(infuraProvidersModule, 'infuraProviders').mockReturnValue({
			getBlockNumber: mockGetBlockNumber
		} as unknown as InfuraProvider);

		vi.spyOn(alchemyProvidersModule, 'alchemyProviders').mockReturnValue({
			getTransaction: mockGetTransaction
		} as unknown as AlchemyProvider);
	});

	describe('fetchErc20Transfers', () => {
		it('should forward the block window to Etherscan', async () => {
			await fetchErc20Transfers({
				networkId: ETHEREUM_NETWORK_ID,
				token: USDC_TOKEN,
				address: mockEthAddress,
				startBlock: 500,
				endBlock: 900
			});

			expect(mockErc20Transactions).toHaveBeenCalledExactlyOnceWith({
				contract: USDC_TOKEN,
				address: mockEthAddress,
				startBlock: 500,
				endBlock: 900
			});
		});

		it('should omit the bounds when none are given', async () => {
			await fetchErc20Transfers({
				networkId: ETHEREUM_NETWORK_ID,
				token: USDC_TOKEN,
				address: mockEthAddress
			});

			expect(mockErc20Transactions).toHaveBeenCalledExactlyOnceWith({
				contract: USDC_TOKEN,
				address: mockEthAddress
			});
		});

		it('should drop zero-value transfers the user did not sign', async () => {
			const kept = makeTx({ hash: '0xkept', blockNumber: 10 });
			const spam = makeTx({ hash: '0xspam', blockNumber: 11, value: ZERO });

			mockErc20Transactions.mockResolvedValue([kept, spam]);
			mockGetTransaction.mockResolvedValue({ from: '0xattacker' });

			const { transactions } = await fetchErc20Transfers({
				networkId: ETHEREUM_NETWORK_ID,
				token: USDC_TOKEN,
				address: mockEthAddress
			});

			expect(transactions).toEqual([kept]);
		});
	});

	describe('persistableErc20Transfers', () => {
		it('should keep everything when every verdict was resolved', () => {
			const transactions = [
				makeTx({ hash: '0xa', blockNumber: 10 }),
				makeTx({ hash: '0xb', blockNumber: 20 })
			];

			expect(
				persistableErc20Transfers({ transactions, oldestUnresolvedBlockNumber: undefined })
			).toEqual(transactions);
		});

		// Nothing re-examines a transfer once it is cached, so the stored high-water mark has to stay
		// below the oldest unresolved one for a later load to get another look at it.
		it('should drop everything at or above the oldest unresolved verdict', () => {
			const older = makeTx({ hash: '0xolder', blockNumber: 10 });

			const transactions = [
				older,
				makeTx({ hash: '0xunresolved', blockNumber: 20 }),
				makeTx({ hash: '0xnewer', blockNumber: 30 })
			];

			expect(persistableErc20Transfers({ transactions, oldestUnresolvedBlockNumber: 20 })).toEqual([
				older
			]);
		});

		it('should keep nothing when the oldest transfer is the unresolved one', () => {
			const transactions = [makeTx({ hash: '0xunresolved', blockNumber: 10 })];

			expect(persistableErc20Transfers({ transactions, oldestUnresolvedBlockNumber: 10 })).toEqual(
				[]
			);
		});
	});

	describe('saveErc20FinalizedTransactions', () => {
		it('should only persist transfers deep enough behind the tip', async () => {
			const finalized = makeTx({ hash: '0xold', blockNumber: 100 });
			const tooRecent = makeTx({ hash: '0xnew', blockNumber: 990 });

			await saveErc20FinalizedTransactions({
				identity: mockIdentity,
				tokenId: backendTokenId,
				transactions: [finalized, tooRecent],
				currentBlockNumber: 1000
			});

			expect(mockSaveUserTransactions).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					tokenId: backendTokenId,
					transactions: [expect.objectContaining({ id: '0xold' })]
				})
			);
		});
	});

	describe('loadNextErc20UserTransactions', () => {
		// An empty page is the shape a cursor invalidated by eviction comes back as, and eviction only
		// happens because the token is at capacity. Dropping `totalStored` there re-enabled the very
		// saves this branch exists to skip.
		it('should record the capacity signal even when the cursor page comes back empty', async () => {
			setEthBackendAtCapacity({ tokenId: USDC_TOKEN.id, totalStored: undefined });
			setEthBackendPaginationCursor({ tokenId: USDC_TOKEN.id, nextStart: 42n });

			mockGetUserTransactions.mockResolvedValue({
				transactions: [],
				newestBlockIndex: undefined,
				oldestBlockIndex: undefined,
				totalStored: BigInt(MAX_USER_TRANSACTIONS_PER_TOKEN),
				nextStart: undefined
			});

			await loadNextErc20UserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: backendTokenId,
				token: USDC_TOKEN,
				tokenId: USDC_TOKEN.id,
				networkId: ETHEREUM_NETWORK_ID,
				oldestLoadedBlockNumber: 60
			});

			expect(isEthBackendAtCapacity(USDC_TOKEN.id)).toBeTruthy();
		});

		it('should serve the next page from the backend without touching Etherscan', async () => {
			setEthBackendPaginationCursor({ tokenId: USDC_TOKEN.id, nextStart: 42n });

			mockGetUserTransactions.mockResolvedValue({
				transactions: [
					createMockBackendUserTransaction({
						hash: '0xstored',
						blockIndex: 50n,
						timestamp: 500n
					})
				],
				newestBlockIndex: 50n,
				oldestBlockIndex: 50n,
				totalStored: 1n,
				nextStart: 32n
			});

			const { hasMore } = await loadNextErc20UserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: backendTokenId,
				token: USDC_TOKEN,
				tokenId: USDC_TOKEN.id,
				networkId: ETHEREUM_NETWORK_ID,
				oldestLoadedBlockNumber: 60
			});

			expect(hasMore).toBeTruthy();
			expect(mockErc20Transactions).not.toHaveBeenCalled();

			expect(get(ethTransactionsStore)?.[USDC_TOKEN.id]).toHaveLength(1);
		});

		it('should fall back to Etherscan below the oldest loaded block once the cache is drained', async () => {
			const older = makeTx({ hash: '0xolder', blockNumber: 20 });

			mockErc20Transactions.mockResolvedValue([older]);

			const { hasMore } = await loadNextErc20UserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: backendTokenId,
				token: USDC_TOKEN,
				tokenId: USDC_TOKEN.id,
				networkId: ETHEREUM_NETWORK_ID,
				oldestLoadedBlockNumber: 60
			});

			expect(hasMore).toBeTruthy();

			expect(mockErc20Transactions).toHaveBeenCalledExactlyOnceWith({
				contract: USDC_TOKEN,
				address: mockEthAddress,
				endBlock: 59
			});

			expect(get(ethTransactionsStore)?.[USDC_TOKEN.id]).toHaveLength(1);
		});

		// A page of older history sits under what the canister already holds. Keeping its resolved part
		// and dropping the rest leaves a hole nothing ever reads back, so the whole page has to wait.
		it('should not persist an older page at all while a verdict is unresolved', async () => {
			mockErc20Transactions.mockResolvedValue([
				makeTx({ hash: '0xresolved', blockNumber: 20 }),
				makeTx({ hash: '0xspam', blockNumber: 30, value: ZERO })
			]);

			// An unresolved sender is what leaves the verdict open.
			mockGetTransaction.mockResolvedValue(undefined);

			const { hasMore } = await loadNextErc20UserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: backendTokenId,
				token: USDC_TOKEN,
				tokenId: USDC_TOKEN.id,
				networkId: ETHEREUM_NETWORK_ID,
				oldestLoadedBlockNumber: 60
			});

			// Still shown, just not cached.
			expect(hasMore).toBeTruthy();
			expect(get(ethTransactionsStore)?.[USDC_TOKEN.id]).toHaveLength(2);

			expect(mockSaveUserTransactions).not.toHaveBeenCalled();
		});

		it('should persist what Etherscan returned against the real chain tip', async () => {
			mockErc20Transactions.mockResolvedValue([makeTx({ hash: '0xolder', blockNumber: 20 })]);

			await loadNextErc20UserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: backendTokenId,
				token: USDC_TOKEN,
				tokenId: USDC_TOKEN.id,
				networkId: ETHEREUM_NETWORK_ID,
				oldestLoadedBlockNumber: 60
			});

			expect(mockGetBlockNumber).toHaveBeenCalledOnce();

			expect(mockSaveUserTransactions).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					tokenId: backendTokenId,
					transactions: [expect.objectContaining({ id: '0xolder' })]
				})
			);
		});

		// At the cap the canister trims the oldest entries on every save, so persisting older history
		// writes and evicts it in the same call.
		it('should not persist older history once the stored cache is at capacity', async () => {
			setEthBackendAtCapacity({
				tokenId: USDC_TOKEN.id,
				totalStored: BigInt(MAX_USER_TRANSACTIONS_PER_TOKEN)
			});

			mockErc20Transactions.mockResolvedValue([makeTx({ hash: '0xolder', blockNumber: 20 })]);

			const { hasMore } = await loadNextErc20UserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: backendTokenId,
				token: USDC_TOKEN,
				tokenId: USDC_TOKEN.id,
				networkId: ETHEREUM_NETWORK_ID,
				oldestLoadedBlockNumber: 60
			});

			// The page still reaches the user, it just is not written back.
			expect(hasMore).toBeTruthy();
			expect(get(ethTransactionsStore)?.[USDC_TOKEN.id]).toHaveLength(1);
			expect(mockSaveUserTransactions).not.toHaveBeenCalled();
		});

		it('should still persist older history below the capacity', async () => {
			setEthBackendAtCapacity({
				tokenId: USDC_TOKEN.id,
				totalStored: BigInt(MAX_USER_TRANSACTIONS_PER_TOKEN - 1)
			});

			mockErc20Transactions.mockResolvedValue([makeTx({ hash: '0xolder', blockNumber: 20 })]);

			await loadNextErc20UserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: backendTokenId,
				token: USDC_TOKEN,
				tokenId: USDC_TOKEN.id,
				networkId: ETHEREUM_NETWORK_ID,
				oldestLoadedBlockNumber: 60
			});

			expect(mockSaveUserTransactions).toHaveBeenCalledOnce();
		});

		it('should report no more pages when Etherscan has nothing older', async () => {
			const { hasMore } = await loadNextErc20UserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: backendTokenId,
				token: USDC_TOKEN,
				tokenId: USDC_TOKEN.id,
				networkId: ETHEREUM_NETWORK_ID,
				oldestLoadedBlockNumber: 60
			});

			expect(hasMore).toBeFalsy();
		});

		it('should not query Etherscan without an oldest loaded block', async () => {
			const { hasMore } = await loadNextErc20UserTransactions({
				identity: mockIdentity,
				address: mockEthAddress,
				transactionTokenId: backendTokenId,
				token: USDC_TOKEN,
				tokenId: USDC_TOKEN.id,
				networkId: ETHEREUM_NETWORK_ID,
				oldestLoadedBlockNumber: undefined
			});

			expect(hasMore).toBeFalsy();
			expect(mockErc20Transactions).not.toHaveBeenCalled();
		});
	});
});
