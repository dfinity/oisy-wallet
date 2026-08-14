import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import { fetchErc20Transfers } from '$eth/services/erc-transfers.services';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import type { OptionEthAddress } from '$eth/types/address';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626, normalizeErc4626MintBurnTransfers } from '$eth/utils/erc4626.utils';
import {
	isTransactionFinalized,
	mapTransactionToUserTransaction,
	mapUserTransactionToTransaction,
	toBackendTokenId
} from '$eth/utils/user-transactions.utils';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import {
	loadUserTransactions,
	saveFinalizedTransactions
} from '$lib/services/user-transactions.services';
import type { NullishIdentity } from '$lib/types/identity';
import type { Token, TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import type { LoadUserTransactionsResult } from '$lib/types/user-transactions';
import type { ResultSuccess } from '$lib/types/utils';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Where paging through the backend's stored history has got to, per token.
 *
 * The initial load reads the newest page and is handed the cursor to the one below it. Without
 * keeping that cursor, scrolling back would skip the backend and ask Etherscan for history the
 * backend already holds.
 */
const ethBackendPaginationCursors = new Map<TokenId, bigint>();

export const setEthBackendPaginationCursor = ({
	tokenId,
	nextStart
}: {
	tokenId: TokenId;
	nextStart: bigint | undefined;
}) => {
	if (nonNullish(nextStart)) {
		ethBackendPaginationCursors.set(tokenId, nextStart);

		return;
	}

	ethBackendPaginationCursors.delete(tokenId);
};

export const getEthBackendPaginationCursor = (tokenId: TokenId): bigint | undefined =>
	ethBackendPaginationCursors.get(tokenId);

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
	identity: NullishIdentity;
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
	identity: NullishIdentity;
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
 * Presents stored rows the way the token's own load path would.
 *
 * Stored history is held as the chain reported it, so a vault's share mints and burns still name the
 * zero address and have to be read as transfers with the vault - the same convention the initial load
 * applies. Every other token passes through untouched.
 */
const forDisplay = ({
	transactions,
	token
}: {
	transactions: Transaction[];
	token: Token;
}): Transaction[] =>
	isTokenErc4626(token)
		? normalizeErc4626MintBurnTransfers({ transactions, vaultAddress: token.address })
		: transactions;

/**
 * Loads the next page of stored transactions from the backend and appends to the store.
 * When the backend has no more pages, falls back to Etherscan to fetch older transactions
 * and persists them in the backend for future sessions.
 *
 * @param identity - The caller's identity; if nullish the backend call is skipped.
 * @param address - The user's ETH address used to query Etherscan for older history;
 *   if nullish the Etherscan fallback is skipped.
 * @param token - The token whose history is being paged; determines both the backend key and which
 *   Etherscan action answers for older history. A token this path cannot store pages nothing.
 * @param oldestLoadedBlockNumber - The lowest block number among transactions already
 *   displayed in the UI. Used as the upper bound when querying Etherscan for older history.
 * @param beAtCapacity - When `true`, skip persisting Etherscan results to the backend
 *   (e.g. the backend storage is full).
 * @returns Whether more pages may exist beyond the returned batch.
 */
export const loadNextEthUserTransactions = async ({
	identity,
	address,
	token,
	oldestLoadedBlockNumber,
	beAtCapacity = false
}: {
	identity: NullishIdentity;
	address: OptionEthAddress;
	token: Token;
	oldestLoadedBlockNumber: number | undefined;
	beAtCapacity?: boolean;
}): Promise<{ hasMore: boolean }> => {
	const transactionTokenId = toBackendTokenId(token);

	if (isNullish(transactionTokenId)) {
		return { hasMore: false };
	}

	const { id: tokenId } = token;

	const cursor = getEthBackendPaginationCursor(tokenId);

	if (nonNullish(cursor)) {
		const result = await loadEthUserTransactions({
			identity,
			tokenId: transactionTokenId,
			start: cursor,
			maxResults: WALLET_PAGINATION
		});

		if (nonNullish(result) && result.transactions.length > 0) {
			const certifiedTransactions = forDisplay({ transactions: result.transactions, token }).map(
				(transaction) => ({
					data: transaction,
					certified: false
				})
			);

			ethTransactionsStore.append({ tokenId, transactions: certifiedTransactions });

			setEthBackendPaginationCursor({ tokenId, nextStart: result.nextStart });

			return {
				hasMore: nonNullish(result.nextStart) || nonNullish(result.oldestBlockIndex)
			};
		}
	}

	// The backend has nothing more to give, so the next intersection must not ask it again.
	setEthBackendPaginationCursor({ tokenId, nextStart: undefined });

	return loadOlderFromEtherscan({
		identity,
		address,
		transactionTokenId,
		token,
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
 * @param token - The token being paged; decides which Etherscan action answers for its history.
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
	token,
	oldestLoadedBlockNumber,
	skipSave
}: {
	identity: NullishIdentity;
	address: OptionEthAddress;
	transactionTokenId: BackendTokenId;
	token: Token;
	oldestLoadedBlockNumber: number | undefined;
	skipSave: boolean;
}): Promise<{ hasMore: boolean }> => {
	if (isNullish(oldestLoadedBlockNumber) || oldestLoadedBlockNumber <= 0) {
		return { hasMore: false };
	}

	if (isNullish(address)) {
		return { hasMore: false };
	}

	const {
		id: tokenId,
		network: { id: networkId }
	} = token;

	try {
		const endBlock = oldestLoadedBlockNumber - 1;

		// A token transfer's history is in `tokentx`, keyed by contract; the chain's own is in `txlist`.
		// Asking the wrong one would append another asset's transactions under this token.
		const olderTransactions =
			isTokenErc20(token) || isTokenErc4626(token)
				? await fetchErc20Transfers({ networkId, token, address, endBlock })
				: await etherscanProviders(networkId).transactions({
						address,
						endBlock,
						sort: 'desc'
					});

		if (olderTransactions.length === 0) {
			return { hasMore: false };
		}

		const certifiedTransactions = forDisplay({ transactions: olderTransactions, token }).map(
			(transaction) => ({
				data: transaction,
				certified: false
			})
		);

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
