import type { UtxoSelectionResult } from '$btc/types/btc-review.services';
import type { Utxo } from '@dfinity/ckbtc';
import { uint8ArrayToHexString } from '@dfinity/utils';

/**
 * Converts a UTXO transaction ID (Uint8Array) to a hex string
 */
export const utxoTxIdToString = (txid: Uint8Array | number[]): string =>
	uint8ArrayToHexString(txid);

/**
 * Extracts transaction IDs from an array of UTXOs
 */
export const extractUtxoTxIds = (utxos: Utxo[]): string[] =>
	utxos.map(({ outpoint: { txid } }) => utxoTxIdToString(txid));

/**
 * Estimates transaction size in bytes based on number of inputs and outputs
 * This is a simplified calculation for P2WPKH transactions
 */
export const estimateTransactionSize = ({
	numInputs,
	numOutputs
}: {
	numInputs: number;
	numOutputs: number;
}): number => {
	// version (4) and locktime (4) and input count (1) and output count (1)
	const baseSize = 10;

	// P2WPKH input size: outpoint (36) and scriptSig length (1) and scriptSig (0) and sequence (4) = 41 bytes
	// Plus witness data: witness stack items (1) and signature (72) and pubkey (33) = 106 bytes
	// But witness data is counted as 1/4 for fee calculation, so effective size is 41 and 106/4 = 67.5 bytes
	const inputSize = 68;

	// P2WPKH output size: value (8) and scriptPubKey length (1) and scriptPubKey (22) = 31 bytes
	const outputSize = 31;

	return baseSize + numInputs * inputSize + numOutputs * outputSize;
};

/**
 * Main function to select UTXOs for a transaction with fee consideration
 * This function iteratively selects UTXOs and calculates fees until sufficient funds are found
 */
export const calculateUtxoSelection = ({
	availableUtxos,
	amountSatoshis,
	feeRateSatoshisPerByte
}: {
	availableUtxos: Utxo[];
	amountSatoshis: bigint;
	feeRateSatoshisPerByte: bigint;
}): UtxoSelectionResult => {
	if (availableUtxos.length === 0) {
		throw new Error('No UTXOs available for selection');
	}

	// Sort UTXOs by value in descending order
	const sortedUtxos = [...availableUtxos].sort((a, b) => {
		const aValue = BigInt(a.value);
		const bValue = BigInt(b.value);
		return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
	});

	const selectedUtxos: Utxo[] = [];
	let totalInputValue = 0n;

	// Iteratively add UTXOs until we have enough to cover amount and fee
	for (const utxo of sortedUtxos) {
		selectedUtxos.push(utxo);
		totalInputValue += BigInt(utxo.value);

		// Calculate current transaction size and fee
		// 2 outputs: one for recipient, one for change (if needed)
		const txSize = estimateTransactionSize({
			numInputs: selectedUtxos.length,
			numOutputs: 2
		});
		const estimatedFee = BigInt(txSize) * feeRateSatoshisPerByte;
		const totalRequired = amountSatoshis + estimatedFee;

		// Check if we have enough to cover amount and fee
		if (totalInputValue >= totalRequired) {
			const changeAmount = totalInputValue - totalRequired;

			return {
				selectedUtxos,
				totalInputValue,
				changeAmount
			};
		}
	}

	// If we get here, we don't have sufficient funds
	const finalTxSize = estimateTransactionSize({
		numInputs: selectedUtxos.length,
		numOutputs: 2
	});
	const finalEstimatedFee = BigInt(finalTxSize) * feeRateSatoshisPerByte;
	const totalRequired = amountSatoshis + finalEstimatedFee;

	throw new Error(
		`Insufficient funds: required ${totalRequired} satoshis (${amountSatoshis} and ${finalEstimatedFee} fee), available ${totalInputValue} satoshis`
	);
};

/**
 * Filters out UTXOs that are locked by pending transactions
 */
export const filterLockedUtxos = ({
	utxos,
	pendingTxIds
}: {
	utxos: Utxo[];
	pendingTxIds: string[];
}): Utxo[] =>
	utxos.filter((utxo) => {
		const txIdHex = utxoTxIdToString(utxo.outpoint.txid);
		return !pendingTxIds.includes(txIdHex);
	});

/**
 * Filters UTXOs based on confirmations and excludes those locked by pending transactions
 */
export const filterAvailableUtxos = ({
	utxos,
	options
}: {
	utxos: Utxo[];
	options: {
		minConfirmations: number;
		pendingTxIds: string[];
	};
}): Utxo[] => {
	const { minConfirmations, pendingTxIds } = options;

	// First filter by confirmations to ensure transaction security
	// Note: UTXOs are pre-filtered by the Bitcoin canister endpoint
	const confirmedUtxos = utxos.filter((utxo) => {
		// Unconfirmed transactions have height 0
		if (utxo.height === 0) {
			return false;
		}

		// Check if it has enough confirmations
		return utxo.height >= minConfirmations;
	});

	// Then filter out locked UTXOs
	return filterLockedUtxos({
		utxos: confirmedUtxos,
		pendingTxIds
	});
};

/**
 * Calculates the final fee based on the selected UTXOs
 * This ensures the fee calculation is consistent with the UTXO selection
 */
export const calculateFinalFee = ({
	selection,
	amountSatoshis
}: {
	selection: UtxoSelectionResult;
	amountSatoshis: bigint;
}): bigint => {
	// The fee is the difference between total input and the amount + change
	const totalUsed = amountSatoshis + selection.changeAmount;
	return selection.totalInputValue - totalUsed;
};
