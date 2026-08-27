import type { TokenId as BackendTokenId, UserTransaction } from '$declarations/backend/backend.did';
import { getUserTransactions, saveUserTransactions } from '$lib/api/backend.api';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import { MAX_SAVE_USER_TRANSACTIONS_BATCH } from '$lib/constants/user-transactions.constants';
import type { NullishIdentity } from '$lib/types/identity';
import type { Transaction as EthTransaction } from '$lib/types/transaction';
import type { LoadUserTransactionsResult } from '$lib/types/user-transactions';
import type { ResultSuccess } from '$lib/types/utils';
import { consoleError } from '$lib/utils/console.utils';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { isNullish } from '@dfinity/utils';

/**
 * Loads stored finalized transactions from the backend canister.
 * Returns the transactions and block index boundaries (for incremental loading).
 */
export const loadUserTransactions = async <T extends EthTransaction | SolTransactionUi>({
	identity,
	tokenId,
	start,
	maxResults = WALLET_PAGINATION,
	mapFromBackend
}: {
	identity: NullishIdentity;
	tokenId: BackendTokenId;
	start?: bigint;
	maxResults?: bigint;
	mapFromBackend: (transaction: UserTransaction) => T;
}): Promise<LoadUserTransactionsResult<T> | undefined> => {
	if (isNullish(identity)) {
		return;
	}

	try {
		const response = await getUserTransactions({
			identity,
			tokenId,
			start,
			maxResults
		});

		const { transactions: rawTransactions, ...rest } = response;

		return {
			...rest,
			transactions: rawTransactions.map(mapFromBackend)
		};
	} catch (_: unknown) {
		// We don't necessarily want to treat a failure to load transactions as an error worth surfacing to the user,
		// since it's not critical to the functioning of the app (transactions can be re-loaded on demand).
	}
};

/**
 * Saves finalized transactions to the backend canister.
 * Only transactions that pass `canSave` and `isFinalizedFn` will be persisted.
 *
 * Generic over `T` — callers supply:
 * - `canSave`: pre-filter (e.g. must have a hash and block number)
 * - `isFinalizedFn`: network-specific finality check (receives the full transaction)
 * - `mapToBackend`: converts the network-specific transaction into `UserTransaction`
 */
export const saveFinalizedTransactions = async <T>({
	identity,
	tokenId,
	transactions,
	isFinalizedFn,
	mapToBackend,
	canSave
}: {
	identity: NullishIdentity;
	tokenId: BackendTokenId;
	transactions: T[];
	isFinalizedFn: (tx: T) => boolean;
	mapToBackend: (tx: T) => UserTransaction;
	canSave: (tx: T) => boolean;
}): Promise<ResultSuccess> => {
	if (isNullish(identity)) {
		return { success: false };
	}

	const finalized = transactions.filter((tx) => canSave(tx) && isFinalizedFn(tx));

	if (finalized.length === 0) {
		return { success: true };
	}

	const mapped = finalized.map(mapToBackend);

	// The canister rejects an over-sized batch outright rather than truncating it, so sending a long
	// history in one call persists nothing at all. A cold start fetches the full history from the
	// explorer, which is exactly when the list is long enough to trip that.
	const batches = Array.from(
		{ length: Math.ceil(mapped.length / MAX_SAVE_USER_TRANSACTIONS_BATCH) },
		(_, index) =>
			mapped.slice(
				index * MAX_SAVE_USER_TRANSACTIONS_BATCH,
				(index + 1) * MAX_SAVE_USER_TRANSACTIONS_BATCH
			)
	);

	// Sequential rather than concurrent: each call is an update, and the canister merges into one
	// entry per (user, token), so firing them together buys nothing and multiplies the load.
	for (const batch of batches) {
		try {
			await saveUserTransactions({ identity, tokenId, transactions: batch });
		} catch (err: unknown) {
			// Not worth surfacing to the user: the cache is a warm-up, and the transactions are already
			// on screen. Worth logging, because a silent total failure here is what kept a rejected
			// over-sized batch invisible.
			consoleError('Failed to save a batch of user transactions:', err);

			return { success: false };
		}
	}

	return { success: true };
};
