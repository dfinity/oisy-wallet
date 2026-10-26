import { getSignatureStatus, isBlockhashValid } from '$sol/api/solana.api';
import type { SolanaNetworkType } from '$sol/types/network';
import { toSolSourceTxOutcome, type SolSourceTxOutcome } from '$sol/utils/sol-source-tx.utils';
import { isNullish } from '@dfinity/utils';

/**
 * Counts how many consecutive polls have observed a row's source transaction as expired. A single
 * observation is not trusted: the status read and the blockhash read are not atomic, so a
 * transaction that landed just before its blockhash aged out can be read as missing, and its
 * blockhash then as invalid. Writing `Failed` there would be a permanent wrong verdict on a
 * transaction that went through.
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
 * `expired` is returned only once two consecutive polls of the same row have seen it; the first
 * reads as `pending`.
 */
export const readSolSourceTxOutcome = async ({
	rowId,
	signature,
	blockhash,
	network
}: {
	rowId: string;
	signature: string;
	blockhash: string;
	network: SolanaNetworkType;
}): Promise<SolSourceTxOutcome> => {
	const status = await getSignatureStatus({ signature, network });

	const outcome = toSolSourceTxOutcome({
		status,
		blockhashValid: isNullish(status) ? await isBlockhashValid({ blockhash, network }) : undefined
	});

	if (outcome === 'expired' && recordExpiryObservation(rowId) < EXPIRY_OBSERVATIONS_REQUIRED) {
		return 'pending';
	}

	// Any other answer breaks the run, so that the two observations are back to back; an `expired`
	// verdict ends the row, which is then no longer polled.
	expiryObservations.delete(rowId);

	return outcome;
};
