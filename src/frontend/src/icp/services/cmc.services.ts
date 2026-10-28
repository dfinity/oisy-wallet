import { ICP_INDEX_CANISTER_ID } from '$env/networks/networks.icp.env';
import { getAccountIdentifierTransactions } from '$icp/api/icp-index.api';
import {
	CMC_DEPOSIT_LOOKUP_PAGE_SIZE,
	ICP_LEDGER_PERMITTED_DRIFT_NS
} from '$icp/constants/cmc.constants';
import { isCmcDeposit } from '$icp/utils/cmc.utils';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

/**
 * Finds a deposit to the CMC for a row whose tab died before the transfer returned, in the
 * history of the deposit account rather than the caller's own. Newest first, stopping at
 * the first entry older than any block the deposit could be in (the transfer timestamp
 * minus the ledger's permitted drift).
 *
 * Certified, because both answers are acted on: a deposit that is found is notified, and
 * one that is not, once the index has synced past it, closes its row as never sent. A
 * single replica answering either would otherwise be enough to report a funded deposit as
 * failed, or to strand one.
 */
export const findCmcDeposit = async ({
	identity,
	depositAccountIdentifier,
	memo,
	amount,
	transferCreatedAtNs
}: {
	identity: Identity;
	depositAccountIdentifier: string;
	memo: Uint8Array;
	// ICP e8s, without the ledger fee.
	amount: bigint;
	transferCreatedAtNs: bigint;
}): Promise<bigint | undefined> => {
	const ownAccountIdentifier = getAccountIdentifier(identity.getPrincipal()).toHex();
	const oldestPossibleNs = transferCreatedAtNs - ICP_LEDGER_PERMITTED_DRIFT_NS;

	let start: bigint | undefined;
	let hasOlderPages = true;

	while (hasOlderPages) {
		const { transactions, oldest_tx_id } = await getAccountIdentifierTransactions({
			identity,
			accountIdentifier: depositAccountIdentifier,
			start,
			maxResults: CMC_DEPOSIT_LOOKUP_PAGE_SIZE,
			indexCanisterId: ICP_INDEX_CANISTER_ID,
			certified: true
		});

		if (transactions.length === 0) {
			return undefined;
		}

		const deposit = transactions.find(({ transaction }) =>
			isCmcDeposit({
				transaction,
				depositAccountIdentifier,
				ownAccountIdentifier,
				memo,
				amount,
				transferCreatedAtNs
			})
		);

		if (nonNullish(deposit)) {
			return deposit.id;
		}

		const oldestFetched = transactions.reduce((min, tx) => (tx.id < min.id ? tx : min));
		const oldestFetchedNs = fromNullable(oldestFetched.transaction.timestamp)?.timestamp_nanos;

		if (nonNullish(oldestFetchedNs) && oldestFetchedNs < oldestPossibleNs) {
			return undefined;
		}

		// As in `hasCkBtcMintForDeposit`: stop when the history is exhausted, or when a page
		// fails to move the cursor.
		const oldestTxId = fromNullable(oldest_tx_id);
		hasOlderPages =
			(isNullish(oldestTxId) || oldestFetched.id > oldestTxId) &&
			(isNullish(start) || oldestFetched.id < start);

		start = oldestFetched.id;
	}

	return undefined;
};
