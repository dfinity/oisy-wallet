import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import {
	isTransactionFinalized,
	mapStoredToTransaction,
	mapTransactionToStored
} from '$eth/utils/stored-transactions.utils';
import {
	getStoredTransactions,
	saveStoredTransactions
} from '$lib/api/backend.api';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { authIdentity } from '$lib/derived/auth.derived';
import type { TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import type { ResultSuccess } from '$lib/types/utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Loads stored finalized transactions from the backend canister.
 * Returns the transactions and the newest stored block number (for incremental loading).
 */
export const loadStoredTransactions = async ({
	tokenId,
	start,
	maxResults = WALLET_PAGINATION
}: {
	tokenId: BackendTokenId;
	start?: bigint;
	maxResults?: bigint;
}): Promise<{
	transactions: Transaction[];
	newestBlockNumber: number | undefined;
	nextStart: bigint | undefined;
} | null> => {
	const identity = get(authIdentity);

	if (isNullish(identity)) {
		return null;
	}

	try {
		const response = await getStoredTransactions({
			identity,
			tokenId,
			start,
			maxResults
		});

		const transactions = response.transactions.map(mapStoredToTransaction);
		const newestBlockNumber =
			response.newest_block_number.length > 0
				? Number(response.newest_block_number[0])
				: undefined;
		const nextStart =
			response.next_start.length > 0 ? response.next_start[0] : undefined;

		return { transactions, newestBlockNumber, nextStart };
	} catch (err) {
		console.error('Failed to load stored transactions from backend:', err);
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
		await saveStoredTransactions({
			identity,
			tokenId,
			transactions: finalized.map(mapTransactionToStored)
		});
		return { success: true };
	} catch (err) {
		console.error('Failed to save finalized transactions to backend:', err);
		return { success: false };
	}
};

/**
 * Loads the next page of stored transactions from the backend and appends to the store.
 * Designed to be used with infinite scroll, similar to ICRC's `loadNextIcTransactions`.
 *
 * @returns `true` if more pages exist, `false` if we reached the end.
 */
export const loadNextEthStoredTransactions = async ({
	transactionTokenId,
	tokenId,
	lastBlockNumber
}: {
	transactionTokenId: BackendTokenId;
	tokenId: TokenId;
	lastBlockNumber: bigint;
}): Promise<{ hasMore: boolean }> => {
	const result = await loadStoredTransactions({
		tokenId: transactionTokenId,
		start: lastBlockNumber,
		maxResults: WALLET_PAGINATION
	});

	if (isNullish(result) || result.transactions.length === 0) {
		return { hasMore: false };
	}

	const certifiedTransactions = result.transactions.map((transaction) => ({
		data: transaction,
		certified: false
	}));

	certifiedTransactions.forEach((transaction) =>
		ethTransactionsStore.append({ tokenId, transactions: [transaction] })
	);

	return { hasMore: nonNullish(result.nextStart) };
};
