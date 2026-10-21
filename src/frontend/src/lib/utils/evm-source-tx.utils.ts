import { nonNullish } from '@dfinity/utils';

/**
 * What the source chain says about a transaction the wallet broadcast on an EVM chain.
 *
 * `replaced` is a *candidate* verdict, not a conclusion: the receipt read and the nonce read are
 * not atomic, so a transaction that has just mined can momentarily look replaced. Pollers only
 * act on it after seeing it twice in a row (see `readEvmSourceTxOutcome`).
 */
export type EvmSourceTxOutcome = 'succeeded' | 'reverted' | 'pending' | 'replaced' | 'unknown';

/**
 * Reads a transaction's outcome off the source chain.
 *
 * `getNonce` signs with the *pending* count, so the transaction owns nonce `N`, while
 * `confirmedNonce` is the sender's next unused *confirmed* nonce. A null receipt with a confirmed
 * count already past `N` means some other transaction consumed slot `N` — a speed-up, a cancel, or
 * a re-broadcast — so ours can never mine.
 */
export const toEvmSourceTxOutcome = ({
	receipt,
	confirmedNonce,
	txNonce
}: {
	receipt: { status: number | null } | null;
	confirmedNonce?: number;
	txNonce: number;
}): EvmSourceTxOutcome => {
	if (nonNullish(receipt)) {
		if (receipt.status === 1) {
			return 'succeeded';
		}

		if (receipt.status === 0) {
			return 'reverted';
		}

		return 'unknown';
	}

	if (nonNullish(confirmedNonce) && confirmedNonce > txNonce) {
		return 'replaced';
	}

	return 'pending';
};
