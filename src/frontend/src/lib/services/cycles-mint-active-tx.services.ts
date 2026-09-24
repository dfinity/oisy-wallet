import type { ActiveUserTransaction, CyclesMintData } from '$declarations/backend/backend.did';
import { ICP_INDEX_CANISTER_ID } from '$env/networks/networks.icp.env';
import { getAccountIdentifierTransactions } from '$icp/api/icp-index.api';
import {
	CYCLES_MINT_DEPOSIT_LANDING_WINDOW_NS,
	CYCLES_MINT_DEPOSIT_LOOKUP_PAGE_SIZE,
	CYCLES_MINT_SETTLE_GRACE_OBSERVATIONS,
	ICP_LEDGER_PERMITTED_DRIFT_NS
} from '$icp/constants/cmc.constants';
import { notifyCyclesMint } from '$icp/services/cycles-mint.services';
import { getCyclesMintDepositAccountIdentifier } from '$icp/utils/cycles-mint.utils';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import {
	applyActiveUserTransactionPollUpdate,
	deleteActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { trackCyclesMint } from '$lib/services/cycles-mint-analytics.services';
import { CYCLES_MINT_EXTERNAL_REF_KEYS } from '$lib/types/cycles-mint-active-tx';
import { advanceStatus } from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import {
	isCyclesMintDeposit,
	toCyclesMintExternalRefs,
	toCyclesMintExternalRefsMap,
	toCyclesMintRefBlockIndex,
	toCyclesMintRowUpdate
} from '$lib/utils/cycles-mint-active-tx.utils';
import { fromNullable, isNullish, nonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

/**
 * How many consecutive ticks each row has been seen unwritten for. The modal that opened
 * a row writes it at every step, so a row that stays unwritten for the grace period has
 * nobody else working on it. In memory, like `oisy-trade-active-tx.services`: a refresh
 * restarts the count, which only ever delays the poller.
 */
const settleObservations = new Map<string, { updatedAtNs: bigint; count: number }>();

// Test seam — module-level state would otherwise leak between cases.
export const resetCyclesMintSettleObservations = (): void => {
	settleObservations.clear();
};

const forgetRow = (id: string): void => {
	settleObservations.delete(id);
};

const recordSettleObservation = ({ id, updated_at_ns }: ActiveUserTransaction): number => {
	const previous = settleObservations.get(id);

	const count =
		nonNullish(previous) && previous.updatedAtNs === updated_at_ns ? previous.count + 1 : 1;

	settleObservations.set(id, { updatedAtNs: updated_at_ns, count });

	return count;
};

/**
 * Finds a mint's deposit for a row whose tab died before the transfer returned, in the
 * history of the CMC's deposit account for the caller rather than the caller's own: that
 * account only ever sees mint deposits, their burns and their refunds, so the deposit is
 * a page or two away however busy the caller's wallet is. Newest first, stopping at the
 * first entry older than any block the deposit could be in (the transfer timestamp minus
 * the ledger's permitted drift).
 *
 * Certified, because both answers are acted on: a deposit that is found is notified, and
 * one that is not closes its row as never sent. A single replica answering either would
 * otherwise be enough to report a funded mint as failed, or to strand one.
 */
export const findCyclesMintDeposit = async ({
	identity,
	data
}: {
	identity: Identity;
	data: CyclesMintData;
}): Promise<bigint | undefined> => {
	const depositAccountIdentifier = getCyclesMintDepositAccountIdentifier(identity.getPrincipal());
	const oldestPossibleNs = data.transfer_created_at_ns - ICP_LEDGER_PERMITTED_DRIFT_NS;

	let start: bigint | undefined;
	let hasOlderPages = true;

	while (hasOlderPages) {
		const { transactions, oldest_tx_id } = await getAccountIdentifierTransactions({
			identity,
			accountIdentifier: depositAccountIdentifier,
			start,
			maxResults: CYCLES_MINT_DEPOSIT_LOOKUP_PAGE_SIZE,
			indexCanisterId: ICP_INDEX_CANISTER_ID,
			certified: true
		});

		if (transactions.length === 0) {
			return undefined;
		}

		const deposit = transactions.find(({ transaction }) =>
			isCyclesMintDeposit({ transaction, depositAccountIdentifier, data })
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

/**
 * A row without a deposit: its tab died between opening the row and learning the
 * transfer's block. The transfer either landed or it did not, and the ICP history says
 * which. Recovery never sends: a deposit that is not there is never made up for.
 *
 * Returns the deposit's block when there is one, after recording it on the row.
 */
const resolveDeposit = async ({
	identity,
	tx,
	data
}: {
	identity: Identity;
	tx: ActiveUserTransaction;
	data: CyclesMintData;
}): Promise<bigint | undefined> => {
	const blockIndex = await findCyclesMintDeposit({ identity, data });

	if (nonNullish(blockIndex)) {
		await applyActiveUserTransactionPollUpdate({
			identity,
			tx,
			update: {
				status: advanceStatus({ current: tx.status, candidate: { Executing: null } }),
				externalRefs: toCyclesMintExternalRefs({
					...toCyclesMintExternalRefsMap(tx.external_refs),
					[CYCLES_MINT_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: `${blockIndex}`
				})
			}
		});

		return blockIndex;
	}

	// Until the transfer can no longer land, "not found" only means "not yet". The row
	// earns the whole grace period again before the next look.
	const canStillLand =
		nowInBigIntNanoSeconds() < data.transfer_created_at_ns + CYCLES_MINT_DEPOSIT_LANDING_WINDOW_NS;

	// Only a `Pending` row: every write that learns a deposit also moves the row to
	// `Executing`, so an `Executing` row without one is malformed rather than unsent, and is
	// left alone rather than deleted.
	if (canStillLand || !('Pending' in tx.status)) {
		forgetRow(tx.id);
		return undefined;
	}

	// Nothing moved, so the row is deleted rather than failed: a failed mint would have
	// the user look for ICP that never left the wallet.
	await deleteActiveUserTransaction({ identity, id: tx.id });
	forgetRow(tx.id);

	trackCyclesMint({
		step: 'mint',
		resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
		errorCode: 'not_sent'
	});

	return undefined;
};

const pollCyclesMintTransaction = async ({
	identity,
	tx
}: {
	identity: Identity;
	tx: ActiveUserTransaction;
}): Promise<void> => {
	if (!('CyclesMint' in tx.data)) {
		return;
	}

	if (recordSettleObservation(tx) < CYCLES_MINT_SETTLE_GRACE_OBSERVATIONS) {
		return;
	}

	const { CyclesMint: data } = tx.data;

	const refs = toCyclesMintExternalRefsMap(tx.external_refs);

	const blockIndex =
		toCyclesMintRefBlockIndex(refs[CYCLES_MINT_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]) ??
		(await resolveDeposit({ identity, tx, data }));

	if (isNullish(blockIndex)) {
		return;
	}

	const update = toCyclesMintRowUpdate(await notifyCyclesMint({ identity, blockIndex }));

	// `Processing`, a transient CMC error or no answer at all: the ICP is in the CMC's
	// custody and notifying again can still mint, so the row stays in flight.
	if (isNullish(update)) {
		return;
	}

	const status = advanceStatus({ current: tx.status, candidate: update.status });

	if (isNullish(status)) {
		return;
	}

	forgetRow(tx.id);

	await applyActiveUserTransactionPollUpdate({
		identity,
		tx,
		update: {
			status,
			...(nonNullish(update.error) && { error: update.error }),
			externalRefs: toCyclesMintExternalRefs({
				...refs,
				[CYCLES_MINT_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: `${blockIndex}`,
				...update.learned
			})
		}
	});
};

/**
 * Finishes the mints no modal finished: notifies the CMC for a row with a deposit, and
 * looks the deposit up for a row whose tab died during the transfer.
 *
 * **A recovery path.** The Mint modal transfers, notifies and closes its own row; what
 * reaches this poller is a mint whose modal was closed, refreshed or logged out of
 * before the CMC answered. Notifying the same deposit twice is harmless (the CMC answers
 * the second call from the first one's result), so unlike OISY Trade no ownership guard
 * is needed; the grace period only saves duplicate calls. Sequential, and one failing row
 * never stops the others.
 */
export const pollCyclesMintActiveUserTransactions = async ({
	identity,
	transactions
}: {
	identity: Identity;
	transactions: ActiveUserTransaction[];
}): Promise<void> => {
	for (const tx of transactions) {
		try {
			await pollCyclesMintTransaction({ identity, tx });
		} catch (err: unknown) {
			consoleError(err);
		}
	}
};
