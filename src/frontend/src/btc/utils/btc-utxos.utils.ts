import { ZERO } from '$lib/constants/app.constants';
import type { Utxo } from '@dfinity/ckbtc';
import { uint8ArrayToHexString } from '@dfinity/utils';

export interface UtxoSelectionResult {
	selectedUtxos: Utxo[];
	sufficientFunds: boolean;
	feeSatoshis: bigint;
	changeWouldBeDust: boolean;
}

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
 * This function calculates fees for the frontend estimation, but lets the backend
 * handle actual dust change behavior in build_p2wpkh_transaction
 */
export const calculateUtxoSelection = ({
	availableUtxos,
	amountSatoshis,
	feeRateSatoshisPerVByte
}: {
	availableUtxos: Utxo[];
	amountSatoshis: bigint;
	feeRateSatoshisPerVByte: bigint;
}): UtxoSelectionResult => {
	const DUST_THRESHOLD = 1000n; // Match backend DUST_THRESHOLD

	if (availableUtxos.length === 0) {
		return {
			selectedUtxos: [],
			sufficientFunds: false,
			feeSatoshis: ZERO,
			changeWouldBeDust: false
		};
	}

	// Sort UTXOs by value in ascending order
	const sortedUtxos = [...availableUtxos].sort((a, b) => {
		const aValue = BigInt(a.value);
		const bValue = BigInt(b.value);
		return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
	});

	const selectedUtxos: Utxo[] = [];
	let totalInputValue = ZERO;

	// Iteratively add UTXOs until we have enough to cover amount and fee
	for (const utxo of sortedUtxos) {
		selectedUtxos.push(utxo);
		totalInputValue += BigInt(utxo.value);

		// Calculate fee assuming we need a change output (worst case)
		// The backend will handle dust change by not creating the output
		const txSize = estimateTransactionSize({
			numInputs: selectedUtxos.length,
			numOutputs: 2 // recipient + potential change
		});
		const estimatedFee = BigInt(txSize) * feeRateSatoshisPerVByte;
		const totalRequired = amountSatoshis + estimatedFee;

		// Check if we have enough to cover amount and fee
		if (totalInputValue >= totalRequired) {
			// Calculate potential change amount
			const changeAmount = totalInputValue - totalRequired;
			const changeWouldBeDust = changeAmount > ZERO && changeAmount < DUST_THRESHOLD;

			return {
				selectedUtxos,
				sufficientFunds: true,
				feeSatoshis: estimatedFee,
				changeWouldBeDust
			};
		}
	}

	// If we get here, we don't have sufficient funds
	const finalTxSize = estimateTransactionSize({
		numInputs: selectedUtxos.length,
		numOutputs: 2
	});
	const finalFee = BigInt(finalTxSize) * feeRateSatoshisPerVByte;

	return {
		selectedUtxos,
		sufficientFunds: false,
		feeSatoshis: finalFee,
		changeWouldBeDust: false
	};
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
