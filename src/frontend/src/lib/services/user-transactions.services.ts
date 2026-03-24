import type { TokenId as BackendTokenId, UserTransaction } from '$declarations/backend/backend.did';
import { getUserTransactions, saveUserTransactions } from '$lib/api/backend.api';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { OptionIdentity } from '$lib/types/identity';
import type { Transaction as EthTransaction } from '$lib/types/transaction';
import type { LoadUserTransactionsResult } from '$lib/types/user-transactions';
import type { ResultSuccess } from '$lib/types/utils';
import { consoleError } from '$lib/utils/console.utils';
import { isNullish } from '@dfinity/utils';

/**
 * Loads stored finalized transactions from the backend canister.
 * Returns the transactions and block index boundaries (for incremental loading).
 */
export const loadUserTransactions = async <T extends EthTransaction>({
	identity,
	tokenId,
	start,
	maxResults = WALLET_PAGINATION,
	mapFromBackend
}: {
	identity: OptionIdentity;
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
 * Attempts to extract a numeric block number from a transaction object.
 */
const getBlockNumber = (tx: EthTransaction): number | undefined => {
	if ('blockNumber' in tx) {
		return tx.blockNumber;
	}

	// TODO: support other transaction types (e.g. Solana) by checking other possible block number fields
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
export const saveFinalizedTransactions = async <T extends EthTransaction>({
	identity,
	tokenId,
	transactions,
	currentBlockNumber,
	isFinalizedFn,
	mapToBackend,
	canSave
}: {
	identity: OptionIdentity;
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
	} catch (_: unknown) {
		return { success: false };
	}
};
