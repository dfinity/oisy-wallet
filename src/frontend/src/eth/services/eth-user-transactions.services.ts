import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import {
	isTransactionFinalized,
	mapTransactionToUserTransaction,
	mapUserTransactionToTransaction
} from '$eth/utils/user-transactions.utils';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { ethAddress as addressStore } from '$lib/derived/address.derived';
import {
	loadUserTransactions,
	saveFinalizedTransactions
} from '$lib/services/user-transactions.services';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import type { LoadUserTransactionsResult } from '$lib/types/user-transactions';
import type { ResultSuccess } from '$lib/types/utils';
import { consoleError } from '$lib/utils/console.utils';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadEthUserTransactions = ({
	identity,
	tokenId,
	start,
	maxResults = WALLET_PAGINATION
}: {
	identity: OptionIdentity;
	tokenId: BackendTokenId;
	start?: bigint;
	maxResults?: bigint;
}): Promise<LoadUserTransactionsResult<Transaction> | undefined> =>
	loadUserTransactions({
		identity,
		tokenId,
		start,
		maxResults,
		mapFromBackend: mapUserTransactionToTransaction
	});

export const saveEthFinalizedTransactions = ({
	identity,
	tokenId,
	transactions,
	currentBlockNumber
}: {
	identity: OptionIdentity;
	tokenId: BackendTokenId;
	transactions: Transaction[];
	currentBlockNumber: number;
}): Promise<ResultSuccess> =>
	saveFinalizedTransactions({
		identity,
		tokenId,
		transactions,
		currentBlockNumber,
		isFinalizedFn: isTransactionFinalized,
		mapToBackend: mapTransactionToUserTransaction,
		canSave: (tx) => nonNullish(tx.blockNumber) && nonNullish(tx.hash)
	});

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
	identity,
	transactionTokenId,
	tokenId,
	networkId,
	cursor,
	oldestLoadedBlockNumber,
	beAtCapacity = false
}: {
	identity: OptionIdentity;
	transactionTokenId: BackendTokenId;
	tokenId: TokenId;
	networkId: NetworkId;
	cursor: bigint | undefined;
	oldestLoadedBlockNumber: number | undefined;
	beAtCapacity?: boolean;
}): Promise<{ hasMore: boolean }> => {
	if (nonNullish(cursor)) {
		const result = await loadEthUserTransactions({
			identity,
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

			return {
				hasMore:
					nonNullish(fromNullable(result.next_start)) ||
					nonNullish(fromNullable(result.oldest_block_index))
			};
		}
	}

	return loadOlderFromEtherscan({
		identity,
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
	identity,
	transactionTokenId,
	tokenId,
	networkId,
	oldestLoadedBlockNumber,
	skipSave
}: {
	identity: OptionIdentity;
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
			saveEthFinalizedTransactions({
				identity,
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
