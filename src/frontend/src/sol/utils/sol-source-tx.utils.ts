import type { SolanaSignatureStatus } from '$sol/types/sol-rpc';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * What the network says about a transaction the wallet broadcast on Solana.
 *
 * `expired` is a *candidate* verdict, like EVM's `replaced`: the status read and the blockhash read
 * are not atomic, so a transaction that landed just before its blockhash aged out can be read as
 * missing, and its blockhash then as invalid. Pollers only act on it after seeing it twice in a row
 * (see `readSolSourceTxOutcome`).
 */
export type SolSourceTxOutcome = 'succeeded' | 'reverted' | 'pending' | 'expired';

/**
 * Reads a transaction's outcome off the network.
 *
 * Only a status the cluster has confirmed is a verdict: a transaction merely processed sits in a
 * block that may still be dropped with its fork. Without a status, the transaction can still land
 * while its blockhash is valid, and never once it is not. `blockhashValid` is only read, and only
 * passed, when there is no status.
 */
export const toSolSourceTxOutcome = ({
	status,
	blockhashValid
}: {
	status: SolanaSignatureStatus;
	blockhashValid?: boolean;
}): SolSourceTxOutcome => {
	if (nonNullish(status)) {
		const { confirmationStatus, err } = status;

		if (confirmationStatus !== 'confirmed' && confirmationStatus !== 'finalized') {
			return 'pending';
		}

		return isNullish(err) ? 'succeeded' : 'reverted';
	}

	return blockhashValid === false ? 'expired' : 'pending';
};
