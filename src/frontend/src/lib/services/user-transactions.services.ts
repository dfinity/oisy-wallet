import type { TokenId as BackendTokenId, UserTransaction } from '$declarations/backend/backend.did';
import { getUserTransactions, saveUserTransactions } from '$lib/api/backend.api';
import { USER_TRANSACTIONS_SAVE_BATCH_SIZE, WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { NullishIdentity } from '$lib/types/identity';
import type { Transaction as EthTransaction } from '$lib/types/transaction';
import type { LoadUserTransactionsResult } from '$lib/types/user-transactions';
import type { ResultSuccess } from '$lib/types/utils';
import { chunk } from '$lib/utils/array.utils';
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

	// The backend rejects an oversized batch outright rather than storing part of it, so a token whose
	// whole history is offered at once - as an ERC20 token's first save is - has to be split up.
	const batches = chunk({
		elements: finalized.map(mapToBackend),
		size: USER_TRANSACTIONS_SAVE_BATCH_SIZE
	});

	try {
		for (const batch of batches) {
			await saveUserTransactions({
				identity,
				tokenId,
				transactions: batch
			});
		}

		return { success: true };
	} catch (_: unknown) {
		return { success: false };
	}
};
