import { getSignatureStatus, getSolBalance, isBlockhashValid } from '$sol/api/solana.api';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import { toSolSourceTxOutcome, type SolSourceTxOutcome } from '$sol/utils/sol-source-tx.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Counts how many consecutive polls have observed a row's source transaction as expired. A single
 * observation is not trusted: the reads are not atomic, and the nodes behind one endpoint can each
 * be at a different slot or fork, so a transaction that landed can momentarily read as missing with
 * an expired blockhash. Writing `Failed` there would be a permanent wrong verdict on a transaction
 * that went through.
 *
 * Keyed by active-transaction row id, so one map serves every provider. Deliberately in-memory: a
 * refresh resets the count, which at worst delays the verdict by one poll and never hastens it.
 *
 * Not pruned: a row stops being polled only once it is terminal (here or in another tab), which is
 * final, so an entry it leaves behind is never read again; sign-out reloads the page. A provider
 * must not prune to its own rows, since the map is shared.
 */
const expiryObservations = new Map<string, number>();

// Test seam — module-level state would otherwise leak between cases.
export const resetSolSourceTxObservations = (): void => {
	expiryObservations.clear();
};

const EXPIRY_OBSERVATIONS_REQUIRED = 2;

const recordExpiryObservation = (rowId: string): number => {
	const count = (expiryObservations.get(rowId) ?? 0) + 1;
	expiryObservations.set(rowId, count);
	return count;
};

/**
 * The network's verdict on a transaction an active-transaction row tracks: its signature status
 * says whether it landed and how, and its recent blockhash, read only while there is no status, is
 * what distinguishes a transaction that can still land from one that never will.
 *
 * `minContextSlot` is a slot where the blockhash is known to be valid. A node not that far yet then
 * refuses to answer, and the read throws, rather than calling a blockhash it has not seen yet
 * invalid. Without it, the blockhash read is taken as it comes.
 *
 * `expired` is returned only once two consecutive polls of the same row have seen it; the first
 * reads as `pending`. With `finalized`, a status counts only once it is finalized (see
 * `toSolSourceTxOutcome`).
 */
export const readSolSourceTxOutcome = async ({
	rowId,
	signature,
	blockhash,
	minContextSlot,
	network,
	finalized = false
}: {
	rowId: string;
	signature: string;
	blockhash: string;
	minContextSlot?: bigint;
	network: SolanaNetworkType;
	finalized?: boolean;
}): Promise<SolSourceTxOutcome> => {
	const { status, slot } = await getSignatureStatus({ signature, network });

	let outcome = toSolSourceTxOutcome({ status, statusSlot: slot, finalized });

	// Only a missing status is ambiguous: the transaction may still land, or never will. The
	// blockhash tells the two apart.
	if (isNullish(status)) {
		const blockhashRead = await isBlockhashValid({ blockhash, network, minContextSlot });

		if (!blockhashRead.valid) {
			// The transaction may have landed just before its blockhash aged out, after the status was
			// read, or that read may have come from a node further behind: read it again before counting
			// this as evidence that the transaction can never land.
			const recheck = await getSignatureStatus({ signature, network });

			outcome = toSolSourceTxOutcome({
				status: recheck.status,
				statusSlot: recheck.slot,
				blockhash: blockhashRead,
				finalized
			});
		}
	}

	if (outcome === 'expired' && recordExpiryObservation(rowId) < EXPIRY_OBSERVATIONS_REQUIRED) {
		return 'pending';
	}

	// Any other answer breaks the run, so that the two observations are back to back; an `expired`
	// verdict ends the row, which is then no longer polled.
	expiryObservations.delete(rowId);

	return outcome;
};

/**
 * The lamports an address holds once a transaction is finalized, read at finalized commitment no
 * earlier than its slot. Finalized blocks are on the one fork that stays, so the balance counts what
 * that transaction moved, which a processed status or a confirmed read cannot promise. `undefined`
 * until the status read finds the transaction finalized without an error. A node not that far yet
 * refuses to answer, and the read throws.
 */
export const readSolBalanceAfterTx = async ({
	address,
	signature,
	network
}: {
	address: SolAddress;
	signature: string;
	network: SolanaNetworkType;
}): Promise<bigint | undefined> => {
	const { status } = await getSignatureStatus({ signature, network });

	if (isNullish(status) || status.confirmationStatus !== 'finalized' || nonNullish(status.err)) {
		return;
	}

	return await getSolBalance({
		address,
		network,
		minContextSlot: status.slot,
		commitment: 'finalized'
	});
};
