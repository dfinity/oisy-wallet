import type { ActiveUserTransaction, CyclesMintData } from '$declarations/backend/backend.did';
import { ICP_INDEX_CANISTER_ID, ICP_LEDGER_CANISTER_ID } from '$env/networks/networks.icp.env';
import { getIcpIndexNumBlocksSynced } from '$icp/api/icp-index.api';
import { getIcpLedgerBlockTimestamp } from '$icp/api/icp-ledger.api';
import {
	CMC_MINT_CYCLES_MEMO,
	CYCLES_MINT_DEPOSIT_LANDING_WINDOW_NS,
	CYCLES_MINT_SETTLE_GRACE_OBSERVATIONS
} from '$icp/constants/cmc.constants';
import { findCmcDeposit } from '$icp/services/cmc.services';
import { notifyCyclesMint } from '$icp/services/cycles-mint.services';
import { getCmcDepositAccountIdentifier } from '$icp/utils/cmc.utils';
import { ZERO } from '$lib/constants/app.constants';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import { CYCLES_MINT_EXTERNAL_REF_KEYS } from '$lib/types/cycles-mint-active-tx';
import { advanceStatus } from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import {
	toCyclesMintExternalRefs,
	toCyclesMintExternalRefsMap,
	toCyclesMintRefBlockIndex,
	toCyclesMintRowUpdate
} from '$lib/utils/cycles-mint-active-tx.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
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
 * Finds a mint's deposit in the history of the CMC's deposit account for the caller: that
 * account only ever sees mint deposits, their burns and their refunds, so the deposit is a
 * page or two away however busy the caller's wallet is. See `findCmcDeposit`.
 */
export const findCyclesMintDeposit = ({
	identity,
	data: { amount, transfer_created_at_ns }
}: {
	identity: Identity;
	data: CyclesMintData;
}): Promise<bigint | undefined> =>
	findCmcDeposit({
		identity,
		depositAccountIdentifier: getCmcDepositAccountIdentifier(identity.getPrincipal()),
		memo: CMC_MINT_CYCLES_MEMO,
		amount,
		transferCreatedAtNs: transfer_created_at_ns
	});

/**
 * Whether the ICP index already holds every block up to `timestampNs`. The ledger appends
 * blocks in time order and the index takes them in the same order, so it does once the
 * last block it has taken is later. The index keeps its blocks only encoded, so that
 * block's time is read from the ledger. A block the ledger has already archived reads as
 * "not yet": the index is then far behind anyway, and the row only waits longer.
 *
 * Certified, like the lookup: a "yes" lets a row close as never sent.
 */
export const hasIcpIndexSyncedPast = async ({
	identity,
	timestampNs
}: {
	identity: Identity;
	timestampNs: bigint;
}): Promise<boolean> => {
	const numBlocksSynced = await getIcpIndexNumBlocksSynced({
		identity,
		indexCanisterId: ICP_INDEX_CANISTER_ID,
		certified: true
	});

	if (numBlocksSynced === ZERO) {
		return false;
	}

	const lastSyncedAtNs = await getIcpLedgerBlockTimestamp({
		identity,
		ledgerCanisterId: ICP_LEDGER_CANISTER_ID,
		index: numBlocksSynced - 1n,
		certified: true
	});

	return nonNullish(lastSyncedAtNs) && lastSyncedAtNs > timestampNs;
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
	// Whether "not found" is final, asked before the lookup rather than after: an index that
	// has synced past the last moment the transfer could land already holds the deposit if
	// there is one, so the lookup that follows settles it. Asked after, the index could take
	// the deposit in between, and the lookup would still have missed it. Both times are the
	// IC's, the row's creation on the backend and the ledger's block, so no device clock
	// decides it. Only a `Pending` row can close: every write that learns a deposit also
	// moves the row to `Executing`, so an `Executing` row without one is malformed rather
	// than unsent, and is left alone.
	const notFoundIsFinal =
		'Pending' in tx.status &&
		(await hasIcpIndexSyncedPast({
			identity,
			timestampNs: tx.created_at_ns + CYCLES_MINT_DEPOSIT_LANDING_WINDOW_NS
		}));

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

	// Until then, "not found" only means "not yet", however late the poller's own clock
	// says it is. The row earns the whole grace period again before the next look.
	if (!notFoundIsFinal) {
		forgetRow(tx.id);
		return undefined;
	}

	// Nothing moved, but the user started this mint and may be watching it in Active
	// transactions: the row closes as failed, never sent, rather than vanishing. The
	// modal's own dead ends delete their rows instead, having just shown the failure. The
	// terminal analytics fire from the row, like every other ending's.
	const status = advanceStatus({ current: tx.status, candidate: { Failed: null } });

	forgetRow(tx.id);

	if (nonNullish(status)) {
		await applyActiveUserTransactionPollUpdate({
			identity,
			tx,
			update: {
				status,
				externalRefs: toCyclesMintExternalRefs({
					...toCyclesMintExternalRefsMap(tx.external_refs),
					[CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: 'not_sent'
				})
			}
		});
	}

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
	// custody and notifying again can still mint, so the row stays in flight. It earns the
	// grace period again before the next notify, so a CMC that keeps answering this way, or
	// cannot be reached, is asked about once a minute rather than on every tick.
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

			// An index or backend that does not answer backs the row off the same way.
			forgetRow(tx.id);
		}
	}
};
