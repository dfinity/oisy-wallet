import type { TokenId as BackendTokenId, UserTransaction } from '$declarations/backend/backend.did';
import { getUserTransactions, saveUserTransactions } from '$lib/api/backend.api';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { authIdentity } from '$lib/derived/auth.derived';
import type { ResultSuccess } from '$lib/types/utils';
import { consoleError } from '$lib/utils/console.utils';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export interface LoadUserTransactionsResult<T> {
	transactions: T[];
	newestBlockIndex: number | undefined;
	oldestBlockIndex: number | undefined;
	totalStored: bigint;
	nextStart: bigint | undefined;
}

/**
 * Loads stored finalized transactions from the backend canister.
 * Returns the transactions and block index boundaries (for incremental loading).
 *
 * Generic over `T` — callers supply a `mapFromBackend` function that converts
 * the backend `UserTransaction` into their network-specific transaction type.
 */
export const loadUserTransactions = async <T>({
	tokenId,
	start,
	maxResults = WALLET_PAGINATION,
	mapFromBackend
}: {
	tokenId: BackendTokenId;
	start?: bigint;
	maxResults?: bigint;
	mapFromBackend: (ut: UserTransaction) => T;
}): Promise<LoadUserTransactionsResult<T> | null> => {
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

		const transactions = response.transactions.map(mapFromBackend);
		const newestIdx = fromNullable(response.newest_block_index);
		const oldestIdx = fromNullable(response.oldest_block_index);
		const newestBlockIndex = nonNullish(newestIdx) ? Number(newestIdx) : undefined;
		const oldestBlockIndex = nonNullish(oldestIdx) ? Number(oldestIdx) : undefined;
		const totalStored = response.total_stored;
		const nextStart = fromNullable(response.next_start);

		return { transactions, newestBlockIndex, oldestBlockIndex, totalStored, nextStart };
	} catch (err) {
		consoleError('Failed to load stored transactions from backend:', err);
		return null;
	}
};

/**
 * Saves finalized transactions to the backend canister.
 * Only transactions that pass `canSave` and `isFinalizedFn` will be persisted.
 *
 * Generic over `T` — callers supply:
 * - `canSave`: pre-filter (e.g. must have a hash and block number)
 * - `isFinalizedFn`: network-specific finality check
 * - `mapToBackend`: converts the network-specific transaction into `UserTransaction`
 */
export const saveFinalizedTransactions = async <T>({
	tokenId,
	transactions,
	currentBlockNumber,
	isFinalizedFn,
	mapToBackend,
	canSave
}: {
	tokenId: BackendTokenId;
	transactions: T[];
	currentBlockNumber: number;
	isFinalizedFn: (params: {
		blockNumber: number | undefined;
		currentBlockNumber: number;
	}) => boolean;
	mapToBackend: (tx: T) => UserTransaction;
	canSave: (tx: T) => boolean;
}): Promise<ResultSuccess> => {
	const identity = get(authIdentity);

	if (isNullish(identity)) {
		return { success: false };
	}

	const finalized = transactions.filter(
		(tx) =>
			canSave(tx) &&
			isFinalizedFn({
				blockNumber: getBlockNumber(tx),
				currentBlockNumber
			})
	);

	if (finalized.length === 0) {
		return { success: true };
	}

	try {
		await saveUserTransactions({
			identity,
			tokenId,
			transactions: finalized.map(mapToBackend)
		});
		return { success: true };
	} catch (err) {
		consoleError('Failed to save finalized transactions to backend:', err);
		return { success: false };
	}
};

/**
 * Attempts to extract a numeric block number from a transaction object.
 * Works with any object that may have a `blockNumber` property.
 */
const getBlockNumber = <T>(tx: T): number | undefined => {
	if (
		typeof tx === 'object' &&
		tx !== null &&
		'blockNumber' in tx &&
		typeof (tx as Record<string, unknown>).blockNumber === 'number'
	) {
		return (tx as Record<string, unknown>).blockNumber as number;
	}
	return undefined;
};
