import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import {
	getEthBackendPaginationCursor,
	isEthBackendAtCapacity,
	setEthBackendAtCapacity,
	setEthBackendPaginationCursor
} from '$eth/services/eth-user-transactions.services';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc4626Token } from '$eth/types/erc4626';
import { filterSpamErc20Transfers } from '$eth/utils/eth-transactions-spam.utils';
import {
	isTransactionFinalized,
	mapTransactionToUserTransaction,
	mapUserTransactionToTransaction
} from '$eth/utils/user-transactions.utils';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { retryWithDelay } from '$lib/services/rest.services';
import {
	loadUserTransactions,
	saveFinalizedTransactions
} from '$lib/services/user-transactions.services';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import type { LoadUserTransactionsResult } from '$lib/types/user-transactions';
import type { ResultSuccess } from '$lib/types/utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Fetches ERC-20 transfers from Etherscan and drops address-poisoning spam.
 *
 * Returns the transfers alongside the block of the oldest one whose spam verdict could not be
 * resolved. Nothing re-examines a transfer once it is cached, so persisting past that block would
 * fix an unresolved guess in place forever.
 *
 * `startBlock` / `endBlock` bound the window so incremental loads never refetch history the
 * backend already holds. That matters more here than for the native asset: the spam filter
 * resolves the outer transaction sender over RPC for every zero-value transfer, so each
 * refetched page costs Alchemy calls on top of the Etherscan one.
 */
export const fetchErc20Transfers = async ({
	networkId,
	token,
	address,
	startBlock,
	endBlock
}: {
	networkId: NetworkId;
	token: Erc20Token | Erc4626Token;
	address: EthAddress;
	startBlock?: number;
	endBlock?: number;
}): Promise<{ transactions: Transaction[]; oldestUnresolvedBlockNumber: number | undefined }> => {
	const { erc20Transactions } = etherscanProviders(networkId);

	const transactions = await retryWithDelay({
		request: async () =>
			await erc20Transactions({
				contract: token,
				address,
				...(nonNullish(startBlock) && { startBlock }),
				...(nonNullish(endBlock) && { endBlock })
			})
	});

	const { getTransaction } = alchemyProviders(networkId);

	const { transactions: filtered, unresolvedHashes } = await filterSpamErc20Transfers({
		transactions,
		userAddress: address,
		// The `transaction.from` is the `Transfer` event's _from (who tokens move from), not
		// the EOA that signed the tx. In address-poisoning scams the attacker emits
		// `Transfer(victim, attacker, 0)`, so `transaction.from == victim`. We need the
		// outer tx sender via RPC to tell whether the user actually initiated it.
		getTransactionSender: async (hash: string): Promise<EthAddress | undefined> => {
			const tx = await getTransaction(hash);
			return tx?.from;
		}
	});

	const unresolvedBlockNumbers = filtered
		.filter(({ hash }) => nonNullish(hash) && unresolvedHashes.has(hash))
		.map(({ blockNumber }) => blockNumber)
		.filter(nonNullish);

	return {
		transactions: filtered,
		oldestUnresolvedBlockNumber:
			unresolvedBlockNumbers.length > 0 ? Math.min(...unresolvedBlockNumbers) : undefined
	};
};

/**
 * Drops everything at or above the oldest unresolved spam verdict, so the stored high-water mark
 * stays below it and a later load re-examines that transfer instead of inheriting the guess.
 */
export const persistableErc20Transfers = ({
	transactions,
	oldestUnresolvedBlockNumber
}: {
	transactions: Transaction[];
	oldestUnresolvedBlockNumber: number | undefined;
}): Transaction[] =>
	isNullish(oldestUnresolvedBlockNumber)
		? transactions
		: transactions.filter(
				({ blockNumber }) => nonNullish(blockNumber) && blockNumber < oldestUnresolvedBlockNumber
			);

/**
 * Loads a page of stored ERC-20 transfers from the backend.
 */
export const loadErc20UserTransactions = ({
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
 * Persists finalized ERC-20 transfers to the backend.
 *
 * Only transfers already filtered by {@link fetchErc20Transfers} reach here, so the spam
 * verdict is stored alongside the transfer and never has to be recomputed.
 */
export const saveErc20FinalizedTransactions = ({
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
 * Loads the next page of older ERC-20 transfers: the backend cache first, then Etherscan
 * once the stored pages run out. Mirrors `loadNextEthUserTransactions` for the native asset.
 *
 * @returns Whether more pages may exist beyond the returned batch.
 */
export const loadNextErc20UserTransactions = async ({
	identity,
	address,
	transactionTokenId,
	token,
	tokenId,
	networkId,
	oldestLoadedBlockNumber
}: {
	identity: NullishIdentity;
	address: OptionEthAddress;
	transactionTokenId: BackendTokenId;
	token: Erc20Token;
	tokenId: TokenId;
	networkId: NetworkId;
	oldestLoadedBlockNumber: number | undefined;
}): Promise<{ hasMore: boolean }> => {
	const cursor = getEthBackendPaginationCursor(tokenId);

	if (nonNullish(cursor)) {
		const result = await loadErc20UserTransactions({
			identity,
			tokenId: transactionTokenId,
			start: cursor,
			maxResults: WALLET_PAGINATION
		});

		// Record the capacity signal from any successful read, not only one that returned a page. An
		// empty page still carries `totalStored`, and it is the shape a cursor invalidated by eviction
		// comes back as, so dropping it leaves the tracker stale exactly as the fall-through below is
		// about to save.
		if (nonNullish(result)) {
			setEthBackendAtCapacity({ tokenId, totalStored: result.totalStored });
		}

		if (nonNullish(result) && result.transactions.length > 0) {
			const loadedBefore = (get(ethTransactionsStore)?.[tokenId] ?? []).length;

			ethTransactionsStore.append({
				tokenId,
				transactions: result.transactions.map((transaction) => ({
					data: transaction,
					certified: false
				}))
			});

			// See the native loader: a cursor that no longer lines up after a trim serves rows we
			// already have, and the explorer is the way forward from there.
			if ((get(ethTransactionsStore)?.[tokenId] ?? []).length > loadedBefore) {
				setEthBackendPaginationCursor({ tokenId, nextStart: result.nextStart });

				return { hasMore: nonNullish(result.nextStart) || nonNullish(result.oldestBlockIndex) };
			}
		}
	}

	// The backend has nothing more to give, so the next intersection must not ask it again.
	setEthBackendPaginationCursor({ tokenId, nextStart: undefined });

	if (isNullish(address) || isNullish(oldestLoadedBlockNumber) || oldestLoadedBlockNumber <= 0) {
		return { hasMore: false };
	}

	try {
		const { transactions: olderTransactions, oldestUnresolvedBlockNumber } =
			await fetchErc20Transfers({
				networkId,
				token,
				address,
				endBlock: oldestLoadedBlockNumber - 1
			});

		if (olderTransactions.length === 0) {
			return { hasMore: false };
		}

		ethTransactionsStore.append({
			tokenId,
			transactions: olderTransactions.map((transaction) => ({
				data: transaction,
				certified: false
			}))
		});

		// At the cap the canister trims the oldest entries on every save, so history older than what it
		// already holds would be written and evicted in the same call.
		if (!isEthBackendAtCapacity(tokenId)) {
			try {
				const { getBlockNumber } = infuraProviders(networkId);

				const latestBlockNumber = await getBlockNumber();

				await saveErc20FinalizedTransactions({
					identity,
					tokenId: transactionTokenId,
					transactions: persistableErc20Transfers({
						transactions: olderTransactions,
						oldestUnresolvedBlockNumber
					}),
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
