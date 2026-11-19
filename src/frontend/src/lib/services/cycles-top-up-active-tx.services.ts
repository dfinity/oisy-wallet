import type { ActiveUserTransaction, CyclesTopUpData } from '$declarations/backend/backend.did';
import {
	CMC_DEPOSIT_LANDING_WINDOW_NS,
	CMC_SETTLE_GRACE_OBSERVATIONS,
	CMC_TOP_UP_MEMO
} from '$icp/constants/cmc.constants';
import { findCmcDeposit, hasIcpIndexSyncedPast } from '$icp/services/cmc.services';
import { notifyCyclesTopUp } from '$icp/services/cycles-top-up.services';
import { getCmcDepositAccountIdentifier } from '$icp/utils/cmc.utils';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import { CYCLES_TOP_UP_EXTERNAL_REF_KEYS } from '$lib/types/cycles-top-up-active-tx';
import { advanceStatus } from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import { toCyclesMintRefBlockIndex } from '$lib/utils/cycles-mint-active-tx.utils';
import {
	toCyclesTopUpExternalRefs,
	toCyclesTopUpExternalRefsMap,
	toCyclesTopUpRowUpdate
} from '$lib/utils/cycles-top-up-active-tx.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

/**
 * How many consecutive ticks each row has been seen unwritten for, as for a mint: a row that
 * stays unwritten for the grace period has nobody else working on it. In memory: a refresh
 * restarts the count, which only ever delays the poller.
 */
const settleObservations = new Map<string, { updatedAtNs: bigint; count: number }>();

// Test seam — module-level state would otherwise leak between cases.
export const resetCyclesTopUpSettleObservations = (): void => {
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
 * Finds a top-up's deposit in the history of the CMC's deposit account for the canister.
 * Unlike a mint's, that account is shared by everyone who tops the canister up through the
 * CMC, so the search runs over all of the canister's deposits since the transfer; only the
 * caller's own transfer matches every field. See `findCmcDeposit`.
 */
export const findCyclesTopUpDeposit = ({
	identity,
	data: { canister_id, amount, transfer_created_at_ns }
}: {
	identity: Identity;
	data: CyclesTopUpData;
}): Promise<bigint | undefined> =>
	findCmcDeposit({
		identity,
		depositAccountIdentifier: getCmcDepositAccountIdentifier(canister_id),
		memo: CMC_TOP_UP_MEMO,
		amount,
		transferCreatedAtNs: transfer_created_at_ns
	});

/**
 * A row without a deposit: its tab died between opening the row and learning the transfer's
 * block. As for a mint, the ICP history says whether the transfer landed, and recovery never
 * sends: a deposit that is not there is never made up for.
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
	data: CyclesTopUpData;
}): Promise<bigint | undefined> => {
	// Asked before the lookup, for the reason `cycles-mint-active-tx.services` gives: an index
	// that has synced past the last moment the transfer could land already holds the deposit
	// if there is one. Only a `Pending` row can close.
	const notFoundIsFinal =
		'Pending' in tx.status &&
		(await hasIcpIndexSyncedPast({
			identity,
			timestampNs: tx.created_at_ns + CMC_DEPOSIT_LANDING_WINDOW_NS
		}));

	const blockIndex = await findCyclesTopUpDeposit({ identity, data });

	if (nonNullish(blockIndex)) {
		await applyActiveUserTransactionPollUpdate({
			identity,
			tx,
			update: {
				status: advanceStatus({ current: tx.status, candidate: { Executing: null } }),
				externalRefs: toCyclesTopUpExternalRefs({
					...toCyclesTopUpExternalRefsMap(tx.external_refs),
					[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: `${blockIndex}`
				})
			}
		});

		return blockIndex;
	}

	if (!notFoundIsFinal) {
		forgetRow(tx.id);
		return undefined;
	}

	// Nothing moved, but the user started this top-up and may be watching it in Active
	// transactions: the row closes as failed, never sent, rather than vanishing.
	const status = advanceStatus({ current: tx.status, candidate: { Failed: null } });

	forgetRow(tx.id);

	if (nonNullish(status)) {
		await applyActiveUserTransactionPollUpdate({
			identity,
			tx,
			update: {
				status,
				externalRefs: toCyclesTopUpExternalRefs({
					...toCyclesTopUpExternalRefsMap(tx.external_refs),
					[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.OUTCOME]: 'not_sent'
				})
			}
		});
	}

	return undefined;
};

const pollCyclesTopUpTransaction = async ({
	identity,
	tx
}: {
	identity: Identity;
	tx: ActiveUserTransaction;
}): Promise<void> => {
	if (!('CyclesTopUp' in tx.data)) {
		return;
	}

	if (recordSettleObservation(tx) < CMC_SETTLE_GRACE_OBSERVATIONS) {
		return;
	}

	const { CyclesTopUp: data } = tx.data;

	const refs = toCyclesTopUpExternalRefsMap(tx.external_refs);

	const blockIndex =
		toCyclesMintRefBlockIndex(refs[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]) ??
		(await resolveDeposit({ identity, tx, data }));

	if (isNullish(blockIndex)) {
		return;
	}

	const update = toCyclesTopUpRowUpdate(
		await notifyCyclesTopUp({ identity, blockIndex, canisterId: data.canister_id })
	);

	// `Processing`, a transient CMC error or no answer at all: the ICP is in the CMC's custody
	// and notifying again can still top up, so the row stays in flight and is asked again about
	// once a minute.
	if (isNullish(update)) {
		forgetRow(tx.id);
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
			externalRefs: toCyclesTopUpExternalRefs({
				...refs,
				[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: `${blockIndex}`,
				...update.learned
			})
		}
	});
};

/**
 * Finishes the top-ups paid with ICP that no modal finished: notifies the CMC for a row with
 * a deposit, and looks the deposit up for a row whose tab died during the transfer. A
 * recovery path, like the mint's: notifying the same deposit twice is harmless, so no
 * ownership guard is needed. Sequential, and one failing row never stops the others.
 */
export const pollCyclesTopUpActiveUserTransactions = async ({
	identity,
	transactions
}: {
	identity: Identity;
	transactions: ActiveUserTransaction[];
}): Promise<void> => {
	for (const tx of transactions) {
		try {
			await pollCyclesTopUpTransaction({ identity, tx });
		} catch (err: unknown) {
			consoleError(err);

			// An index or backend that does not answer backs the row off the same way.
			forgetRow(tx.id);
		}
	}
};
