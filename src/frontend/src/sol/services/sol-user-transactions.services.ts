import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import {
	loadUserTransactions,
	saveFinalizedTransactions
} from '$lib/services/user-transactions.services';
import type { NullishIdentity } from '$lib/types/identity';
import type { LoadUserTransactionsResult } from '$lib/types/user-transactions';
import type { ResultSuccess } from '$lib/types/utils';
import type { SolAddress } from '$sol/types/address';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import {
	isSolTransactionFinalized,
	mapSolTransactionToUserTransaction,
	mapUserTransactionToSolTransaction
} from '$sol/utils/user-transactions.utils';
import { nonNullish } from '@dfinity/utils';

/**
 * Loads a page of stored Solana transactions from the backend, mapping each
 * `UserTransaction` into a frontend `SolTransactionUi`.
 */
export const loadSolUserTransactions = ({
	identity,
	tokenId,
	address,
	start,
	maxResults = WALLET_PAGINATION
}: {
	identity: NullishIdentity;
	tokenId: BackendTokenId;
	address: SolAddress;
	start?: bigint;
	maxResults?: bigint;
}): Promise<LoadUserTransactionsResult<SolTransactionUi> | undefined> =>
	loadUserTransactions({
		identity,
		tokenId,
		start,
		maxResults,
		mapFromBackend: (transaction) => mapUserTransactionToSolTransaction({ transaction, address })
	});

/**
 * Persists finalized Solana transactions to the backend.
 * Only transactions with `status === 'finalized'` and a valid signature are saved.
 */
export const saveSolFinalizedTransactions = ({
	identity,
	tokenId,
	transactions
}: {
	identity: NullishIdentity;
	tokenId: BackendTokenId;
	transactions: SolTransactionUi[];
}): Promise<ResultSuccess> =>
	saveFinalizedTransactions({
		identity,
		tokenId,
		transactions,
		isFinalizedFn: isSolTransactionFinalized,
		mapToBackend: mapSolTransactionToUserTransaction,
		canSave: (tx) => nonNullish(tx.signature) && nonNullish(tx.timestamp)
	});
