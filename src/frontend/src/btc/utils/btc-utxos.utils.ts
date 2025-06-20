import type { UtxoFilterOptions, UtxoSelectionResult } from '$btc/types/btc-review.services';
import { BITCOIN_CANISTER_IDS } from '$env/networks/networks.icrc.env';
import { getUtxosQuery } from '$icp/api/bitcoin.api';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { BitcoinNetwork, Utxo } from '@dfinity/ckbtc';
import { assertNonNullish, isNullish } from '@dfinity/utils';

/**
 * Fetches UTXOs for a given Bitcoin address using query call for better performance
 */
export const getUtxos = async ({
	identity,
	address,
	network,
	minterCanisterId
}: {
	identity: OptionIdentity;
	address: string;
	network: BitcoinNetwork;
	minterCanisterId: CanisterIdText;
}): Promise<Utxo[]> => {
	assertNonNullish(identity);

	const bitcoinCanisterId = BITCOIN_CANISTER_IDS[minterCanisterId];

	if (isNullish(bitcoinCanisterId)) {
		throw new Error(`No Bitcoin canister ID found for minter: ${minterCanisterId}`);
	}

	const response = await getUtxosQuery({
		identity,
		address,
		network,
		bitcoinCanisterId
	});

	return response.utxos;
};

/**
 * Filters UTXOs based on confirmations and excluded transaction IDs
 */
export const filterUtxos = ({
	utxos,
	options = {}
}: {
	utxos: Utxo[];
	options?: UtxoFilterOptions;
}): Utxo[] => {
	const { minConfirmations = 6, excludeTxIds = [] } = options;

	return utxos.filter((utxo) => {
		// Check minimum confirmations
		if (utxo.height === 0 || utxo.height < minConfirmations) {
			return false;
		}

		// Check if UTXO is not in the exclusion list (locked by pending transactions)
		const txIdHex = Buffer.from(utxo.outpoint.txid).toString('hex');
		return !excludeTxIds.includes(txIdHex);
	});
};

/**
 * Selects UTXOs to cover the required amount using a simple greedy algorithm
 * This implements a basic coin selection strategy similar to the backend
 */
export const selectUtxos = ({
	availableUtxos,
	amountSatoshis
}: {
	availableUtxos: Utxo[];
	amountSatoshis: bigint;
}): UtxoSelectionResult => {
	if (availableUtxos.length === 0) {
		throw new Error('No UTXOs available for selection');
	}

	// Sort UTXOs by value in descending order (largest first strategy)
	const sortedUtxos = [...availableUtxos].sort((a, b) => {
		const aValue = BigInt(a.value);
		const bValue = BigInt(b.value);
		return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
	});

	const selectedUtxos: Utxo[] = [];
	let totalInputValue = 0n;

	// Greedy selection: pick UTXOs until we have enough to cover the amount
	for (const utxo of sortedUtxos) {
		selectedUtxos.push(utxo);
		totalInputValue += BigInt(utxo.value);

		// Check if we have enough to cover the required amount
		// Note: We don't calculate fee here as that's done in the parent service
		if (totalInputValue >= amountSatoshis) {
			break;
		}
	}

	// Verify we have sufficient funds
	if (totalInputValue < amountSatoshis) {
		throw new Error(
			`Insufficient funds: required ${amountSatoshis} satoshis, available ${totalInputValue} satoshis`
		);
	}

	const changeAmount = totalInputValue - amountSatoshis;

	return {
		selectedUtxos,
		totalInputValue,
		changeAmount
	};
};

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
	// Base transaction size
	const baseSize = 10; // version (4) and locktime (4) and input count (1) and output count (1)

	// P2WPKH input size: outpoint (36) and scriptSig length (1) and scriptSig (0) and sequence (4) = 41 bytes
	// Plus witness data: witness stack items (1) and signature (72) and pubkey (33) = 106 bytes
	// But witness data is counted as 1/4 for fee calculation, so effective size is 41 and 106/4 = 67.5 bytes
	const inputSize = 68; // Rounded up

	// P2WPKH output size: value (8) and scriptPubKey length (1) and scriptPubKey (22) = 31 bytes
	const outputSize = 31;

	return baseSize + numInputs * inputSize + numOutputs * outputSize;
};

/**
 * Main function to select UTXOs for a transaction with fee consideration
 * This function iteratively selects UTXOs and calculates fees until sufficient funds are found
 */
export const selectUtxosWithFee = ({
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
}): Utxo[] => filterUtxos({ utxos, options: { excludeTxIds: pendingTxIds } });

/**
 * Handles pagination for UTXO queries (for edge case of >1000 UTXOs)
 * Most users will have <1000 UTXOs, so this is mainly for completeness
 */
export const getAllUtxosPaginated = async (params: {
	identity: OptionIdentity;
	address: string;
	network: BitcoinNetwork;
	minterCanisterId: CanisterIdText;
	maxBatchSize?: number;
}): Promise<Utxo[]> => {
	const { maxBatchSize = 1000, ...baseParams } = params;

	// For now, we'll implement basic single-call logic
	// This can be extended later if pagination becomes necessary
	const utxos = await getUtxos(baseParams);

	// If we get exactly the max batch size, there might be more UTXOs
	// In a full implementation, we'd make additional calls with pagination
	if (utxos.length >= maxBatchSize) {
		console.warn(
			`Retrieved ${utxos.length} UTXOs. There might be more available. Consider implementing pagination.`
		);
	}

	return utxos;
};
