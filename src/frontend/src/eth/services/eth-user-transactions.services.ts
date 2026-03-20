import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import {
	isTransactionFinalized,
	mapTransactionToUserTransaction,
	mapUserTransactionToTransaction
} from '$eth/utils/user-transactions.utils';
import { getUserTransactions, saveUserTransactions } from '$lib/api/backend.api';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { ethAddress as addressStore } from '$lib/derived/address.derived';
import { authIdentity } from '$lib/derived/auth.derived';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import type { ResultSuccess } from '$lib/types/utils';
import { consoleError } from '$lib/utils/console.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export interface LoadUserTransactionsResult {
	transactions: Transaction[];
	newestBlockIndex: number | undefined;
	oldestBlockIndex: number | undefined;
	totalStored: bigint;
	nextStart: bigint | undefined;
}

/**
 * Loads stored finalized transactions from the backend canister.
 * Returns the transactions and block index boundaries (for incremental loading).
 */
export const loadUserTransactions = async ({
	tokenId,
	start,
	maxResults = WALLET_PAGINATION
}: {
	tokenId: BackendTokenId;
	start?: bigint;
	maxResults?: bigint;
}): Promise<LoadUserTransactionsResult | null> => {
	const identity = get(authIdentity);

	if (isNullish(identity)) {
		return null;
	}

	try {
		const response = await getUserTransactions({
			identity,
			tokenId,
			start,
			maxResults
		});

		const transactions = response.transactions.map(mapUserTransactionToTransaction);
		const newestBlockIndex =
			response.newest_block_index.length > 0 ? Number(response.newest_block_index[0]) : undefined;
		const oldestBlockIndex =
			response.oldest_block_index.length > 0 ? Number(response.oldest_block_index[0]) : undefined;
		const totalStored = response.total_stored;
		const nextStart = response.next_start.length > 0 ? response.next_start[0] : undefined;

		return { transactions, newestBlockIndex, oldestBlockIndex, totalStored, nextStart };
	} catch (err) {
		consoleError('Failed to load stored transactions from backend:', err);
		return null;
	}
};

/**
 * Saves finalized transactions to the backend canister.
 * Only transactions that are confirmed as finalized (based on block depth) will be saved.
 */
export const saveFinalizedTransactions = async ({
	tokenId,
	transactions,
	currentBlockNumber
}: {
	tokenId: BackendTokenId;
	transactions: Transaction[];
	currentBlockNumber: number;
}): Promise<ResultSuccess> => {
	const identity = get(authIdentity);

	if (isNullish(identity)) {
		return { success: false };
	}

	const finalized = transactions.filter(
		(tx) =>
			nonNullish(tx.blockNumber) &&
			nonNullish(tx.hash) &&
			isTransactionFinalized({ blockNumber: tx.blockNumber, currentBlockNumber })
	);

	if (finalized.length === 0) {
		return { success: true };
	}

	try {
		await saveUserTransactions({
			identity,
			tokenId,
			transactions: finalized.map(mapTransactionToUserTransaction)
		});
		return { success: true };
	} catch (err) {
		consoleError('Failed to save finalized transactions to backend:', err);
		return { success: false };
	}
};

/**
 * Loads the next page of stored transactions from the backend and appends to the store.
 * When the backend has no more pages, falls back to Etherscan to fetch older transactions
 * and persists them in the backend for future sessions.
 *
 * @param oldestLoadedBlockNumber - The lowest block number among transactions already
 *   displayed in the UI. Used as the upper bound when querying Etherscan for older history.
 * @returns Whether more pages may exist beyond the returned batch.
 */
export const loadNextEthUserTransactions = async ({
	transactionTokenId,
	tokenId,
	networkId,
	cursor,
	oldestLoadedBlockNumber,
	beAtCapacity = false
}: {
	transactionTokenId: BackendTokenId;
	tokenId: TokenId;
	networkId: NetworkId;
	cursor: bigint | undefined;
	oldestLoadedBlockNumber: number | undefined;
	beAtCapacity?: boolean;
}): Promise<{ hasMore: boolean }> => {
	if (nonNullish(cursor)) {
		const result = await loadUserTransactions({
			tokenId: transactionTokenId,
			start: cursor,
			maxResults: WALLET_PAGINATION
		});

		if (nonNullish(result) && result.transactions.length > 0) {
			const certifiedTransactions = result.transactions.map((transaction) => ({
				data: transaction,
				certified: false
			}));

			ethTransactionsStore.append({ tokenId, transactions: certifiedTransactions });

			return { hasMore: nonNullish(result.nextStart) || nonNullish(result.oldestBlockIndex) };
		}
	}

	return loadOlderFromEtherscan({
		transactionTokenId,
		tokenId,
		networkId,
		oldestLoadedBlockNumber,
		skipSave: beAtCapacity
	});
};

/**
 * Fetches transactions older than what the UI currently has from Etherscan,
 * persists finalized ones in the backend, and appends them to the store.
 */
const loadOlderFromEtherscan = async ({
	transactionTokenId,
	tokenId,
	networkId,
	oldestLoadedBlockNumber,
	skipSave
}: {
	transactionTokenId: BackendTokenId;
	tokenId: TokenId;
	networkId: NetworkId;
	oldestLoadedBlockNumber: number | undefined;
	skipSave: boolean;
}): Promise<{ hasMore: boolean }> => {
	if (isNullish(oldestLoadedBlockNumber) || oldestLoadedBlockNumber <= 0) {
		return { hasMore: false };
	}

	const address = get(addressStore);
	if (isNullish(address)) {
		return { hasMore: false };
	}

	try {
		const { transactions: transactionsProvider } = etherscanProviders(networkId);

		const olderTransactions = await transactionsProvider({
			address,
			endBlock: oldestLoadedBlockNumber - 1
		});

		if (olderTransactions.length === 0) {
			return { hasMore: false };
		}

		const certifiedTransactions = olderTransactions.map((transaction) => ({
			data: transaction,
			certified: false
		}));

		ethTransactionsStore.append({ tokenId, transactions: certifiedTransactions });

		if (!skipSave) {
			saveFinalizedTransactions({
				tokenId: transactionTokenId,
				transactions: olderTransactions,
				currentBlockNumber: oldestLoadedBlockNumber - 1
			}).catch((err) =>
				consoleError('Background save of older finalized transactions failed:', err)
			);
		}

		return { hasMore: true };
	} catch (err) {
		consoleError('Failed to fetch older transactions from Etherscan:', err);
		return { hasMore: false };
	}
};
