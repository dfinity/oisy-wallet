import { ZERO } from '$lib/constants/app.constants';
import type { Utxo } from '@dfinity/ckbtc';
import { uint8ArrayToHexString } from '@dfinity/utils';

export interface UtxoSelectionResult {
	selectedUtxos: Utxo[];
	totalInputValue: bigint;
	changeAmount: bigint;
	sufficientFunds: boolean;
	feeSatoshis: bigint;
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

// Dust threshold for P2WPKH outputs
const DUST_THRESHOLD = 294n;

/**
 * Represents a transaction fee scenario with or without change output
 */
interface FeeScenario {
	fee: bigint;
	changeAmount: bigint;
	numOutputs: number;
}

/**
 * Main function to select UTXOs for a transaction with fee consideration
 * This function iteratively selects UTXOs and calculates fees until sufficient funds are found
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
	if (availableUtxos.length === 0) {
		return {
			selectedUtxos: [],
			totalInputValue: ZERO,
			changeAmount: ZERO,
			sufficientFunds: false,
			feeSatoshis: ZERO
		};
	}

	// Sort UTXOs by value in descending order (largest-first greedy strategy)
	// This approach minimizes the number of inputs needed, reducing transaction size and fees.
	// Trade-offs: Uses fewer UTXOs (lower fees) but may fragment the UTXO set over time. A more complex
	// strategy could be introduced in the future to balance between these trade-offs.
	const sortedUtxos = [...availableUtxos].sort((a, b) => {
		const aValue = BigInt(a.value);
		const bValue = BigInt(b.value);
		return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
	});

	const selectedUtxos: Utxo[] = [];
	let totalInputValue = ZERO;

	// Iteratively add UTXOs until we have enough to cover amount and fee
	for (const utxo of sortedUtxos) {
		selectedUtxos.push(utxo);
		totalInputValue += BigInt(utxo.value);

		const optimalScenario = selectOptimalFeeScenario({
			numInputs: selectedUtxos.length,
			totalInputValue,
			amountSatoshis,
			feeRateSatoshisPerVByte
		});

		if (
			hasSufficientFunds({
				totalInputValue,
				amountSatoshis,
				fee: optimalScenario.fee
			})
		) {
			return {
				selectedUtxos,
				totalInputValue,
				changeAmount: optimalScenario.changeAmount,
				sufficientFunds: true,
				feeSatoshis: optimalScenario.fee
			};
		}
	}

	// If we get here, we don't have sufficient funds
	const failureFee =
		BigInt(
			estimateTransactionSize({
				numInputs: selectedUtxos.length,
				numOutputs: 2
			})
		) * feeRateSatoshisPerVByte;

	return {
		selectedUtxos,
		totalInputValue,
		changeAmount: ZERO,
		sufficientFunds: false,
		feeSatoshis: failureFee
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

/**
 * Calculates fee and change for a transaction with one output (no change)
 */
const calculateNoChangeScenario = ({
	numInputs,
	totalInputValue,
	amountSatoshis,
	feeRateSatoshisPerVByte
}: {
	numInputs: number;
	totalInputValue: bigint;
	amountSatoshis: bigint;
	feeRateSatoshisPerVByte: bigint;
}): FeeScenario => {
	const txSize = estimateTransactionSize({ numInputs, numOutputs: 1 });
	const fee = BigInt(txSize) * feeRateSatoshisPerVByte;
	const changeAmount = totalInputValue - amountSatoshis - fee;

	return {
		fee,
		changeAmount,
		numOutputs: 1
	};
};

/**
 * Calculates fee and change for a transaction with two outputs (with change)
 */
const calculateWithChangeScenario = ({
	numInputs,
	totalInputValue,
	amountSatoshis,
	feeRateSatoshisPerVByte
}: {
	numInputs: number;
	totalInputValue: bigint;
	amountSatoshis: bigint;
	feeRateSatoshisPerVByte: bigint;
}): FeeScenario => {
	const txSize = estimateTransactionSize({ numInputs, numOutputs: 2 });
	const fee = BigInt(txSize) * feeRateSatoshisPerVByte;
	const changeAmount = totalInputValue - amountSatoshis - fee;

	return {
		fee,
		changeAmount,
		numOutputs: 2
	};
};

/**
 * Determines whether change should be created or absorbed as extra fee
 * Returns true if change amount is meaningful (above dust threshold)
 */
const shouldCreateChangeOutput = ({ changeAmount }: { changeAmount: bigint }): boolean =>
	changeAmount >= DUST_THRESHOLD;

/**
 * Selects the optimal fee scenario between no-change and with-change options
 */
const selectOptimalFeeScenario = ({
	numInputs,
	totalInputValue,
	amountSatoshis,
	feeRateSatoshisPerVByte
}: {
	numInputs: number;
	totalInputValue: bigint;
	amountSatoshis: bigint;
	feeRateSatoshisPerVByte: bigint;
}): FeeScenario => {
	const noChangeScenario = calculateNoChangeScenario({
		numInputs,
		totalInputValue,
		amountSatoshis,
		feeRateSatoshisPerVByte
	});

	const withChangeScenario = calculateWithChangeScenario({
		numInputs,
		totalInputValue,
		amountSatoshis,
		feeRateSatoshisPerVByte
	});

	// Use change scenario only if change is meaningful and we have enough funds
	if (
		shouldCreateChangeOutput({ changeAmount: withChangeScenario.changeAmount }) &&
		withChangeScenario.changeAmount >= 0
	) {
		return withChangeScenario;
	}

	return noChangeScenario;
};

/**
 * Checks if we have sufficient funds for the transaction
 */
const hasSufficientFunds = ({
	totalInputValue,
	amountSatoshis,
	fee
}: {
	totalInputValue: bigint;
	amountSatoshis: bigint;
	fee: bigint;
}): boolean => totalInputValue >= amountSatoshis + fee;
