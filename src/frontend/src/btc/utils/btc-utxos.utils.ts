import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';

export interface UtxoSelectionResult {
	selectedUtxos: CkBtcMinterDid.Utxo[];
	totalInputValue: bigint;
	changeAmount: bigint;
	sufficientFunds: boolean;
	feeSatoshis: bigint;
}

/**
 * Extracts transaction IDs from an array of UTXOs
 */
export const extractUtxoTxIds = (utxos: CkBtcMinterDid.Utxo[]): string[] =>
	utxos.map(({ outpoint: { txid } }) => utxoTxIdToString(txid));

/**
 * Estimates transaction virtual size (vbytes) based on number of inputs and outputs.
 * This is a simplified calculation for P2WPKH transactions.
 *
 * All constants are in vbytes: witness data is discounted to 1/4 weight per BIP-141,
 * so the result must be multiplied by a sat/vbyte fee rate, not a sat/byte rate.
 */
export const estimateTransactionVSize = ({
	numInputs,
	numOutputs
}: {
	numInputs: number;
	numOutputs: number;
}): number => {
	// version (4) + locktime (4) + input count (1) + output count (1) + SegWit marker+flag (0.5 → 1) = 11 vbytes
	const BASE_VSIZE = 11;

	// P2WPKH input: non-witness outpoint (36) + scriptSig length (1) + empty scriptSig (0) + sequence (4) = 41 vbytes
	// witness: stack item count (1) + signature (72) + pubkey (33) = 106 bytes → 106/4 = 26.5 vbytes
	// total: 41 + 26.5 = 67.5 → 68 vbytes
	const INPUT_VSIZE = 68;

	// P2WPKH output: value (8) + scriptPubKey length (1) + scriptPubKey (22) = 31 vbytes
	const OUTPUT_VSIZE = 31;

	return BASE_VSIZE + numInputs * INPUT_VSIZE + numOutputs * OUTPUT_VSIZE;
};

/**
 * Main function to select UTXOs for a transaction with fee consideration.
 *
 * Algorithm (greedy, smallest-sufficient):
 * 1. Compute how many satoshis are still needed: amount + fee(N+1 inputs) - accumulated total.
 * 2. Pick the smallest UTXO whose value alone covers that need → minimises change and input count.
 * 3. If no such UTXO exists, pick the largest available UTXO to reduce the gap as fast as
 *    possible, then restart from step 1 with the updated totals.
 *
 * The fee is recalculated after every pick because each additional input increases transaction
 * size.  Using fee(N+1) as the target when searching for the next UTXO ensures the selected
 * set will remain sufficient once the UTXO is added.
 */
export const calculateUtxoSelection = ({
	availableUtxos,
	amountSatoshis,
	feeRateMiliSatoshisPerVByte
}: {
	availableUtxos: CkBtcMinterDid.Utxo[];
	amountSatoshis: bigint;
	feeRateMiliSatoshisPerVByte: bigint;
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

	const calcFee = (numInputs: number): bigint => {
		const txVSize = estimateTransactionVSize({ numInputs, numOutputs: 2 });
		return (BigInt(txVSize) * feeRateMiliSatoshisPerVByte + 999n) / 1000n;
	};

	const selectedUtxos: CkBtcMinterDid.Utxo[] = [];
	let totalInputValue = ZERO;
	const remaining = [...availableUtxos];

	while (remaining.length > 0) {
		// Fee for the transaction once we add one more input.
		const fee = calcFee(selectedUtxos.length + 1);
		const needed = amountSatoshis + fee - totalInputValue;

		// Step 1: find the smallest UTXO that alone covers the remaining need.
		let smallestSufficient: CkBtcMinterDid.Utxo | undefined;
		let smallestSufficientValue = ZERO;
		for (const utxo of remaining) {
			const val = BigInt(utxo.value);
			if (val >= needed && (smallestSufficient === undefined || val < smallestSufficientValue)) {
				smallestSufficient = utxo;
				smallestSufficientValue = val;
			}
		}

		if (smallestSufficient !== undefined) {
			selectedUtxos.push(smallestSufficient);
			totalInputValue += smallestSufficientValue;
			const feeSatoshis = calcFee(selectedUtxos.length);
			return {
				selectedUtxos,
				totalInputValue,
				changeAmount: totalInputValue - amountSatoshis - feeSatoshis,
				sufficientFunds: true,
				feeSatoshis
			};
		}

		// Step 2: no single UTXO covers the need; pick the largest to reduce the gap.
		let largestIndex = 0;
		let largestValue = BigInt(remaining[0].value);
		for (let i = 1; i < remaining.length; i++) {
			const val = BigInt(remaining[i].value);
			if (val > largestValue) {
				largestValue = val;
				largestIndex = i;
			}
		}
		selectedUtxos.push(remaining[largestIndex]);
		totalInputValue += largestValue;
		remaining.splice(largestIndex, 1);
	}

	// Insufficient funds.
	return {
		selectedUtxos,
		totalInputValue,
		changeAmount: ZERO,
		sufficientFunds: false,
		feeSatoshis: calcFee(selectedUtxos.length)
	};
};

/**
 * Filters out UTXOs that are locked by pending transactions
 */
export const filterLockedUtxos = ({
	utxos,
	pendingUtxoTxIds
}: {
	utxos: CkBtcMinterDid.Utxo[];
	pendingUtxoTxIds: string[];
}): CkBtcMinterDid.Utxo[] =>
	utxos.filter((utxo) => {
		const txIdHex = utxoTxIdToString(utxo.outpoint.txid);
		return !pendingUtxoTxIds.includes(txIdHex);
	});

/**
 * Filters UTXOs based on confirmations and excludes those locked by pending transactions
 */
export const filterAvailableUtxos = ({
	utxos,
	options
}: {
	utxos: CkBtcMinterDid.Utxo[];
	options: {
		minConfirmations: number;
		pendingUtxoTxIds: string[];
	};
}): CkBtcMinterDid.Utxo[] => {
	const { minConfirmations, pendingUtxoTxIds } = options;

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
		pendingUtxoTxIds
	});
};

export const resetUtxosDataStores = (): void => {
	btcPendingSentTransactionsStore.reset();
	allUtxosStore.reset();
	feeRatePercentilesStore.reset();
};
