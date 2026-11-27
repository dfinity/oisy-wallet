import type {
	TokenId as BackendTokenId,
	UserTransaction,
	UserTransactionError
} from '$declarations/backend/backend.did';
import { getUserTransactions, saveUserTransactions } from '$lib/api/backend.api';
import { NANO_SECONDS_IN_MILLISECOND, WALLET_PAGINATION } from '$lib/constants/app.constants';
import { MAX_SAVE_USER_TRANSACTIONS_BATCH } from '$lib/constants/user-transactions.constants';
import type { NullishIdentity } from '$lib/types/identity';
import type { Transaction as EthTransaction } from '$lib/types/transaction';
import type { LoadUserTransactionsResult } from '$lib/types/user-transactions';
import type { ResultSuccess } from '$lib/types/utils';
import { consoleError } from '$lib/utils/console.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
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

const isRateLimited = (
	err: unknown
): err is Extract<UserTransactionError, { RateLimited: unknown }> =>
	typeof err === 'object' && err !== null && 'RateLimited' in err;

const saveBatch = async ({
	identity,
	tokenId,
	batch
}: {
	identity: NullishIdentity;
	tokenId: BackendTokenId;
	batch: UserTransaction[];
}): Promise<boolean> => {
	try {
		await saveUserTransactions({ identity, tokenId, transactions: batch });

		return true;
	} catch (err: unknown) {
		// The canister limits how often a caller saves, and a caller may already have moved its cursor
		// past these transactions, so a batch dropped here might never be sent again. It is held until
		// the limit's window has passed and then sent again, before the batches after it.
		if (isRateLimited(err)) {
			await waitForMilliseconds(Number(err.RateLimited.window_ns / NANO_SECONDS_IN_MILLISECOND));

			return saveBatch({ identity, tokenId, batch });
		}

		// Not worth surfacing to the user: the cache is a warm-up, and the transactions are already
		// on screen. Worth logging, because a silent failure here is what kept a rejected batch
		// invisible in the first place.
		consoleError('Failed to save a batch of user transactions:', err);

		return false;
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

	// Callers supply the mapper, and some of them throw on a shape they cannot store, so this stays
	// inside the failure path rather than escaping to the caller.
	let mapped: UserTransaction[];

	try {
		mapped = finalized.map(mapToBackend);
	} catch (err: unknown) {
		consoleError('Failed to map transactions for saving:', err);

		return { success: false };
	}

	let allSaved = true;

	// The canister rejects an over-sized batch outright rather than truncating it, so sending a long
	// history in one call persists nothing at all. A cold start fetches the full history from the
	// explorer, which is exactly when the list is long enough to trip that.
	//
	// Sliced as we go rather than precomputed: a cold-start history is long, and the batches are only
	// ever consumed one at a time.
	//
	// Sequential rather than concurrent: each call is an update, and the canister merges into one
	// entry per (user, token), so firing them together buys nothing and multiplies the load.
	for (let index = 0; index < mapped.length; index += MAX_SAVE_USER_TRANSACTIONS_BATCH) {
		const batch = mapped.slice(index, index + MAX_SAVE_USER_TRANSACTIONS_BATCH);

		// Keep going rather than abandoning the rest. The canister validates a batch as a unit and
		// refuses all of it on the first transaction that breaches a field bound, so bailing here
		// would let one unusual transaction cost the user every later batch too. Saves are
		// deduplicated by id, so retrying the survivors on a future load stays cheap.
		const saved = await saveBatch({ identity, tokenId, batch });

		if (!saved) {
			allSaved = false;
		}
	}

	return { success: allSaved };
};
