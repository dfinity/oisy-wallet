import {
	BTC_BROADCAST_MAX_INPUTS,
	CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
} from '$btc/constants/btc.constants';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { BTC_SEND_VIA_BACKEND_ENABLED } from '$env/btc.env';
import { outpointToKey } from '$icp/utils/btc.utils';
import { ZERO } from '$lib/constants/app.constants';
import { isNullish } from '@dfinity/utils';
import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';

export interface UtxoSelectionResult {
	selectedUtxos: CkBtcMinterDid.Utxo[];
	totalInputValue: bigint;
	changeAmount: bigint;
	sufficientFunds: boolean;
	feeSatoshis: bigint;
}

/**
 * The most inputs a send may spend: with `BTC_SEND_VIA_BACKEND_ENABLED`, what the backend's
 * broadcast accepts, so the selection and Max never offer a send it refuses. `undefined` otherwise.
 */
export const btcSendMaxInputs = (): number | undefined =>
	BTC_SEND_VIA_BACKEND_ENABLED ? BTC_BROADCAST_MAX_INPUTS : undefined;

/**
 * Extracts outpoint keys (txid + vout) from an array of UTXOs.
 * Outpoints uniquely identify a UTXO; matching on txid alone over-filters
 * UTXOs that share a parent transaction.
 */
export const extractUtxoOutpoints = (utxos: CkBtcMinterDid.Utxo[]): string[] =>
	utxos.map(({ outpoint }) => outpointToKey(outpoint));

/**
 * Estimates the virtual size (vbytes) of a send from the wallet's P2WPKH address: `numInputs`
 * P2WPKH inputs, the recipient's output (`recipientOutputVSize`, from `btcOutputVSize`) and a
 * P2WPKH change output.
 *
 * All constants are in vbytes: witness data is discounted to 1/4 weight per BIP-141,
 * so the result must be multiplied by a sat/vbyte fee rate, not a sat/byte rate.
 */
export const estimateTransactionVSize = ({
	numInputs,
	recipientOutputVSize
}: {
	numInputs: number;
	recipientOutputVSize: number;
}): number => {
	// version (4) + locktime (4) + input count (1) + output count (1) + SegWit marker+flag (0.5 → 1) = 11 vbytes
	const BASE_VSIZE = 11;

	// P2WPKH input: non-witness outpoint (36) + scriptSig length (1) + empty scriptSig (0) + sequence (4) = 41 vbytes
	// witness: stack item count (1) + signature (72) + pubkey (33) = 106 bytes → 106/4 = 26.5 vbytes
	// total: 41 + 26.5 = 67.5 → 68 vbytes
	const INPUT_VSIZE = 68;

	// P2WPKH change output: value (8) + scriptPubKey length (1) + scriptPubKey (22) = 31 vbytes
	const CHANGE_OUTPUT_VSIZE = 31;

	return BASE_VSIZE + numInputs * INPUT_VSIZE + recipientOutputVSize + CHANGE_OUTPUT_VSIZE;
};

/**
 * Fee in satoshis for a send with `numInputs` P2WPKH inputs, the recipient's output and the
 * change output every selection prices.
 *
 * The recipient's output is sized from its script (`btcOutputVSize`): a P2TR or P2WSH output is
 * 12 vbytes larger than a P2WPKH one, and pricing it as P2WPKH quotes less than the rate.
 *
 * Rounds up, so the transaction is never priced below the requested rate. Shared with the
 * pre-broadcast validation, which must arrive at the same number for the same inputs and
 * recipient.
 */
export const calculateFeeSatoshis = ({
	numInputs,
	recipientOutputVSize,
	feeRateMiliSatoshisPerVByte
}: {
	numInputs: number;
	recipientOutputVSize: number;
	feeRateMiliSatoshisPerVByte: bigint;
}): bigint => {
	const txVSize = estimateTransactionVSize({ numInputs, recipientOutputVSize });

	return (BigInt(txVSize) * feeRateMiliSatoshisPerVByte + 999n) / 1000n;
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
 *
 * With `maxInputs`, funds that need more inputs are insufficient. Since every pick but the last is
 * the largest left, the selection then finds a set whenever any set of that many inputs covers the
 * amount.
 */
export const calculateUtxoSelection = ({
	availableUtxos,
	amountSatoshis,
	recipientOutputVSize,
	feeRateMiliSatoshisPerVByte,
	maxInputs
}: {
	availableUtxos: CkBtcMinterDid.Utxo[];
	amountSatoshis: bigint;
	recipientOutputVSize: number;
	feeRateMiliSatoshisPerVByte: bigint;
	maxInputs?: number;
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

	const calcFee = (numInputs: number): bigint =>
		calculateFeeSatoshis({ numInputs, recipientOutputVSize, feeRateMiliSatoshisPerVByte });

	const selectedUtxos: CkBtcMinterDid.Utxo[] = [];
	let totalInputValue = ZERO;
	const remaining = [...availableUtxos];

	while (remaining.length > 0 && (isNullish(maxInputs) || selectedUtxos.length < maxInputs)) {
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
 * Filters out UTXOs that are reserved by pending transactions.
 *
 * Matching is at the outpoint level (txid + vout) so that unrelated UTXOs
 * sharing a parent txid stay available — this is what allows a user to keep
 * sending while a previous unconfirmed send is still pending.
 */
export const filterLockedUtxos = ({
	utxos,
	pendingUtxoOutpoints
}: {
	utxos: CkBtcMinterDid.Utxo[];
	pendingUtxoOutpoints: string[];
}): CkBtcMinterDid.Utxo[] => {
	const reserved = new Set(pendingUtxoOutpoints);

	return utxos.filter((utxo) => !reserved.has(outpointToKey(utxo.outpoint)));
};

/**
 * Filters UTXOs based on confirmations and excludes those reserved by pending transactions
 */
export const filterAvailableUtxos = ({
	utxos,
	options
}: {
	utxos: CkBtcMinterDid.Utxo[];
	options: {
		minConfirmations: number;
		pendingUtxoOutpoints: string[];
	};
}): CkBtcMinterDid.Utxo[] => {
	const { minConfirmations, pendingUtxoOutpoints } = options;

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
		pendingUtxoOutpoints
	});
};

/**
 * The largest amount a send from `utxos` can actually carry: every available UTXO spent,
 * minus the fee for a transaction with that many inputs.
 *
 * Derived from the set `prepareBtcSend` selects from — not from the wallet balance, which is
 * read at `BTC_BALANCE_MIN_CONFIRMATIONS` and therefore also counts incoming UTXOs still
 * under the confirmation floor a send requires. Offering those as "Max" quotes an amount the
 * selection then refuses for want of funds.
 *
 * Spending everything needs every input, so the fee is priced for the full set rather than
 * for whatever smaller set the greedy selection would pick at a lower amount.
 *
 * The fee is priced for the recipient's output, as the selection prices it, so the amount offered
 * is one the selection accepts. Before the recipient is known, `recipientOutputVSize` is
 * `BTC_LARGEST_OUTPUT_VSIZE`, and the amount is fundable whoever the recipient turns out to be.
 *
 * With `maxInputs`, a send spends at most that many, so the most it can carry comes from the
 * largest of them, as the selection would pick them.
 */
export const calculateMaxSpendableAmount = ({
	utxos,
	pendingUtxoOutpoints,
	recipientOutputVSize,
	feeRateMiliSatoshisPerVByte,
	maxInputs
}: {
	utxos: CkBtcMinterDid.Utxo[];
	pendingUtxoOutpoints: string[];
	recipientOutputVSize: number;
	feeRateMiliSatoshisPerVByte: bigint;
	maxInputs?: number;
}): bigint => {
	const availableUtxos = filterAvailableUtxos({
		utxos,
		options: {
			minConfirmations: CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS,
			pendingUtxoOutpoints
		}
	});

	if (availableUtxos.length === 0) {
		return ZERO;
	}

	const spentUtxos =
		isNullish(maxInputs) || availableUtxos.length <= maxInputs
			? availableUtxos
			: [...availableUtxos]
					.sort(({ value: a }, { value: b }) => (a > b ? -1 : a < b ? 1 : 0))
					.slice(0, maxInputs);

	const totalValue = spentUtxos.reduce((sum, { value }) => sum + BigInt(value), ZERO);

	const feeSatoshis = calculateFeeSatoshis({
		numInputs: spentUtxos.length,
		recipientOutputVSize,
		feeRateMiliSatoshisPerVByte
	});

	return totalValue > feeSatoshis ? totalValue - feeSatoshis : ZERO;
};

export const resetUtxosDataStores = (): void => {
	btcPendingSentTransactionsStore.reset();
	allUtxosStore.reset();
	feeRatePercentilesStore.reset();
};
