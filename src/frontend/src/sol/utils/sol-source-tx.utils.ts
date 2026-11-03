import type { SolanaSignatureStatus } from '$sol/types/sol-rpc';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * What the network says about a transaction the wallet broadcast on Solana.
 *
 * `expired` is a *candidate* verdict, like EVM's `replaced`: the reads are not atomic, and the nodes
 * behind one endpoint can each be at a different slot. Pollers only act on it after seeing it twice
 * in a row (see `readSolSourceTxOutcome`).
 */
export type SolSourceTxOutcome = 'succeeded' | 'reverted' | 'pending' | 'expired';

/**
 * Reads a transaction's outcome off the network.
 *
 * Only a status the cluster has confirmed is a verdict: a transaction merely processed sits in a
 * block that may still be dropped with its fork. Without a status, the transaction can still land
 * while its blockhash is valid, and never once it is not. `blockhash` is that read, with the slot it
 * was answered at, and is only passed when there is no status.
 *
 * A transaction that landed just before its blockhash aged out did so before that slot, so a status
 * read from a node not that far yet can miss it. A missing status is only evidence once its read is
 * at or past the slot the blockhash was found invalid at; before that, the transaction is pending.
 */
export const toSolSourceTxOutcome = ({
	status,
	statusSlot,
	blockhash
}: {
	status: SolanaSignatureStatus;
	statusSlot: bigint;
	blockhash?: { valid: boolean; slot: bigint };
}): SolSourceTxOutcome => {
	if (nonNullish(status)) {
		const { confirmationStatus, err } = status;

		if (confirmationStatus !== 'confirmed' && confirmationStatus !== 'finalized') {
			return 'pending';
		}

		return isNullish(err) ? 'succeeded' : 'reverted';
	}

	return nonNullish(blockhash) && !blockhash.valid && statusSlot >= blockhash.slot
		? 'expired'
		: 'pending';
};
