import { infuraProviders } from '$eth/providers/infura.providers';
import type { EthAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import { toEvmSourceTxOutcome, type EvmSourceTxOutcome } from '$lib/utils/evm-source-tx.utils';
import { isNullish } from '@dfinity/utils';

/**
 * Counts how many consecutive polls have observed a row's source transaction as
 * replaced-or-dropped. A single observation is not trusted: the receipt read and
 * the confirmed-nonce read are not atomic, so a transaction that has just
 * confirmed can be seen with an advanced nonce while a lagging RPC node still
 * answers `null` for its receipt. Writing `Failed` there would be a permanent
 * wrong verdict on a successful transaction.
 *
 * Keyed by active-transaction row id, so one map serves every provider. Deliberately
 * in-memory: a refresh resets the count, which at worst delays terminalization by
 * one tick and never produces a wrong verdict.
 */
const replacementObservations = new Map<string, number>();

// Test seam — module-level state would otherwise leak between cases.
export const resetEvmSourceTxObservations = (): void => {
	replacementObservations.clear();
};

const REPLACEMENT_OBSERVATIONS_REQUIRED = 2;

const recordReplacementObservation = (rowId: string): number => {
	const count = (replacementObservations.get(rowId) ?? 0) + 1;
	replacementObservations.set(rowId, count);
	return count;
};

/**
 * The source chain's verdict on a transaction an active-transaction row tracks: the receipt's
 * `status` says whether it executed or reverted, and the sender's confirmed nonce is what
 * distinguishes a transaction still in the mempool from one that was replaced or dropped.
 *
 * `replaced` is returned only once two consecutive polls of the same row have seen it; the first
 * reads as `pending`.
 *
 * `confirmedNonceByChainId` is shared by the rows of one poll, so several rows on a chain cost one
 * nonce read.
 */
export const readEvmSourceTxOutcome = async ({
	rowId,
	hash,
	txNonce,
	network,
	userAddress,
	confirmedNonceByChainId
}: {
	rowId: string;
	hash: string;
	txNonce: number;
	network: EthereumNetwork;
	userAddress: EthAddress;
	confirmedNonceByChainId: Map<string, Promise<number>>;
}): Promise<EvmSourceTxOutcome> => {
	const provider = infuraProviders(network.id);

	const receipt = await provider.getTransactionReceipt(hash);

	let outcome = toEvmSourceTxOutcome({ receipt, txNonce });

	// Only a missing receipt is ambiguous — it reads the same whether the
	// transaction is still in the mempool or was replaced. The confirmed nonce
	// tells the two apart.
	if (isNullish(receipt)) {
		const chainId = `${network.chainId}`;

		const confirmedNoncePromise =
			confirmedNonceByChainId.get(chainId) ?? provider.getTransactionCountLatest(userAddress);
		confirmedNonceByChainId.set(chainId, confirmedNoncePromise);

		const confirmedNonce = await confirmedNoncePromise;

		outcome = toEvmSourceTxOutcome({ receipt, confirmedNonce, txNonce });

		if (outcome === 'replaced') {
			// The nonce read may have raced our own confirmation: re-read the receipt
			// before counting this as evidence that the transaction can never mine.
			outcome = toEvmSourceTxOutcome({
				receipt: await provider.getTransactionReceipt(hash),
				confirmedNonce,
				txNonce
			});
		}
	}

	if (
		outcome === 'replaced' &&
		recordReplacementObservation(rowId) < REPLACEMENT_OBSERVATIONS_REQUIRED
	) {
		return 'pending';
	}

	// The row either stopped looking replaced or is about to terminalize as
	// replaced; either way it is no longer under observation.
	replacementObservations.delete(rowId);

	return outcome;
};
