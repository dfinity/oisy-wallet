import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
import { saveFinalizedTransactions } from '$lib/services/user-transactions.services';
import type { NullishIdentity } from '$lib/types/identity';
import type { ResultSuccess } from '$lib/types/utils';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import {
	isSolTransactionFinalized,
	mapSolTransactionToUserTransaction
} from '$sol/utils/user-transactions.utils';
import { nonNullish } from '@dfinity/utils';

/**
 * Persists finalized Solana transactions to the backend.
 * Only transactions with `status === 'finalized'` and a valid signature are saved.
 *
 * Solana history is never read back from it: the stored copy cannot carry the summary and the net
 * changes a record is shown from, and the backend never replaces an id it already holds, so a copy
 * that was saved wrong would stay wrong.
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
