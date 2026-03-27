import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import type { OptionEthAddress } from '$eth/types/address';
import {
	isTransactionFinalized,
	mapTransactionToUserTransaction,
	mapUserTransactionToTransaction
} from '$eth/utils/user-transactions.utils';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
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
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Loads a page of stored ETH transactions from the backend, mapping each
 * `UserTransaction` into a frontend `Transaction`.
 *
 * @param identity - The caller's identity; returns `undefined` when nullish.
 * @param tokenId - The backend-typed token identifier.
 * @param start - Optional cursor for pagination (value of `nextStart` from a previous call).
 * @param maxResults - Page size; defaults to {@link WALLET_PAGINATION}.
 * @returns The mapped transactions with block-index boundaries, or `undefined` on failure.
 */
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

/**
 * Persists finalized ETH transactions to the backend.
 * Only transactions with a valid hash, block number, and sufficient depth
 * (>= the ETH finality threshold in blocks behind the tip) are saved.
 *
 * @param identity - The caller's identity; returns `{ success: false }` when nullish.
 * @param tokenId - The backend-typed token identifier.
 * @param transactions - The full set of transactions to filter and persist.
 * @param currentBlockNumber - The latest known block number, used to determine finality.
 * @returns Whether the save operation succeeded.
 */
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
		isFinalizedFn: (tx) =>
			isTransactionFinalized({ blockNumber: tx.blockNumber, currentBlockNumber }),
		mapToBackend: mapTransactionToUserTransaction,
		canSave: (tx) => nonNullish(tx.blockNumber) && nonNullish(tx.hash)
	});

/**
 * Loads the next page of stored transactions from the backend and appends to the store.
 * When the backend has no more pages, falls back to Etherscan to fetch older transactions
 * and persists them in the backend for future sessions.
 *
 * @param identity - The caller's identity; if nullish the backend call is skipped.
 * @param address - The user's ETH address used to query Etherscan for older history;
 *   if nullish the Etherscan fallback is skipped.
 * @param transactionTokenId - The backend-typed token identifier used for API calls.
 * @param tokenId - The frontend token identifier used to key the transactions store.
 * @param networkId - The network to query when falling back to Etherscan.
 * @param cursor - The `nextStart` value from a previous page; `undefined` when the backend is exhausted.
 * @param oldestLoadedBlockNumber - The lowest block number among transactions already
 *   displayed in the UI. Used as the upper bound when querying Etherscan for older history.
 * @param beAtCapacity - When `true`, skip persisting Etherscan results to the backend
 *   (e.g. the backend storage is full).
 * @returns Whether more pages may exist beyond the returned batch.
 */
export const loadNextEthUserTransactions = async ({
	identity,
	address,
	transactionTokenId,
	tokenId,
	networkId,
	cursor,
	oldestLoadedBlockNumber,
	beAtCapacity = false
}: {
	identity: OptionIdentity;
	address: OptionEthAddress;
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
				hasMore: nonNullish(result.nextStart) || nonNullish(result.oldestBlockIndex)
			};
		}
	}

	return loadOlderFromEtherscan({
		identity,
		address,
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
 *
 * @param identity - The caller's identity, used when persisting finalized transactions.
 * @param address - The user's ETH address to query Etherscan with;
 *   returns `{ hasMore: false }` when nullish.
 * @param transactionTokenId - The backend-typed token identifier used for saving.
 * @param tokenId - The frontend token identifier used to key the transactions store.
 * @param networkId - The network whose Etherscan provider will be used.
 * @param oldestLoadedBlockNumber - The lowest block number currently displayed;
 *   Etherscan is queried for blocks strictly below this value. Returns early when
 *   `undefined` or `<= 0`.
 * @param skipSave - When `true`, fetched transactions are appended to the store
 *   but not persisted to the backend (e.g. storage is at capacity).
 */
const loadOlderFromEtherscan = async ({
	identity,
	address,
	transactionTokenId,
	tokenId,
	networkId,
	oldestLoadedBlockNumber,
	skipSave
}: {
	identity: OptionIdentity;
	address: OptionEthAddress;
	transactionTokenId: BackendTokenId;
	tokenId: TokenId;
	networkId: NetworkId;
	oldestLoadedBlockNumber: number | undefined;
	skipSave: boolean;
}): Promise<{ hasMore: boolean }> => {
	if (isNullish(oldestLoadedBlockNumber) || oldestLoadedBlockNumber <= 0) {
		return { hasMore: false };
	}

	if (isNullish(address)) {
		return { hasMore: false };
	}

	try {
		const { transactions: transactionsProvider } = etherscanProviders(networkId);

		const olderTransactions = await transactionsProvider({
			address,
			endBlock: oldestLoadedBlockNumber - 1,
			sort: 'desc'
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
			try {
				const { getBlockNumber } = infuraProviders(networkId);

				const latestBlockNumber = await getBlockNumber();

				await saveEthFinalizedTransactions({
					identity,
					tokenId: transactionTokenId,
					transactions: olderTransactions,
					currentBlockNumber: latestBlockNumber
				});
			} catch (_: unknown) {
				// We silently ignore the saving errors since it is just useful for the next time, and not necessary for the user experience
			}
		}

		return { hasMore: true };
	} catch (_: unknown) {
		return { hasMore: false };
	}
};
