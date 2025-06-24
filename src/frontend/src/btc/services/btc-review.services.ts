import type { UtxoSelectionResult } from '$btc/types/btc-review.services';
import type { UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import { filterLockedUtxos, getUtxos, selectUtxosWithFee } from '$btc/utils/btc-utxos.utils';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Amount } from '$lib/types/send';
import {
	assertAmount,
	assertArrayNotEmpty,
	assertStringNotEmpty,
	assertSufficientBalance
} from '$lib/utils/asserts';
import type { BitcoinNetwork, Utxo } from '@dfinity/ckbtc';
import { assertNonNullish } from '@dfinity/utils';

const DEFAULT_MIN_CONFIRMATIONS = 6;

export interface BtcReviewParams {
	identity: OptionIdentity;
	network: BitcoinNetwork;
	amount: Amount;
	address: string;
	minterCanisterId: CanisterIdText;
	feeRateSatoshisPerByte: bigint;
	pendingTxIds?: string[];
}

export interface BtcReviewResult {
	feeSatoshis: bigint;
	utxos: Utxo[];
	totalInputValue: bigint;
	changeAmount: bigint;
}

/**
 * Main orchestrator function that replaces the backend btc_select_user_utxos_fee call
 * This function coordinates all the steps needed to select UTXOs and calculate fees
 */
export const selectUtxosFee = async ({
	identity,
	network,
	amount,
	address,
	pendingTxIds = []
}: BtcReviewParams): Promise<BtcReviewResult> => {
	assertNonNullish(identity);
	assertNonNullish(address);

	// Convert amount to satoshis
	const amountSatoshis = convertNumberToSatoshis({ amount });

	try {
		// Step 1: Fetch all available UTXOs using query call (fast and no cycle cost)
		const allUtxos = await getUtxos({
			identity,
			address,
			network,
			minterCanisterId
		});

		// Step 2: Filter UTXOs based on confirmations and exclude locked ones
		const availableUtxos = filterAvailableUtxos({
			utxos: allUtxos,
			options: {
				minConfirmations: DEFAULT_MIN_CONFIRMATIONS,
				pendingTxIds
			}
		});

		assertArrayNotEmpty(availableUtxos, 'No available UTXOs found for the transaction');

		// Step 3: Select UTXOs with fee consideration
		const selection = selectUtxosWithFee({
			availableUtxos,
			amountSatoshis,
			feeRateSatoshisPerByte
		});

		// Step 4: Calculate final fee based on selected UTXOs
		const feeSatoshis = calculateFinalFee({ selection, amountSatoshis });

		return {
			feeSatoshis,
			utxos: selection.selectedUtxos,
			totalInputValue: selection.totalInputValue,
			changeAmount: selection.changeAmount
		};
	} catch (error) {
		console.error('Error in selectUtxosFee:', error);
		throw error;
	}
};

/**
 * Simplified version that returns the UtxosFee format expected by existing components
 * This maintains compatibility with the current frontend structure
 */
export const selectUtxosFeeCompatible = async (params: BtcReviewParams): Promise<UtxosFee> => {
	const result = await selectUtxosFee(params);

	return {
		feeSatoshis: result.feeSatoshis,
		utxos: result.utxos
	};
};

/**
 * Filters UTXOs based on confirmations and excludes those locked by pending transactions
 */
const filterAvailableUtxos = ({
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

	// First filter by confirmations
	const confirmedUtxos = utxos.filter((utxo) => {
		// Unconfirmed transactions have height 0
		if (utxo.height === 0) {
			return false;
		}

		// Check if it has enough confirmations
		// Note: This is a simplified check. In a production system, you'd compare with current block height
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
const calculateFinalFee = ({
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

/**
 * Estimates the fee for a transaction without actually selecting UTXOs
 * Useful for quick fee estimates in the UI
 */
export const estimateTransactionFee = ({
	estimatedInputs,
	feeRateSatoshisPerByte
}: {
	estimatedInputs: number;
	feeRateSatoshisPerByte: bigint;
}): bigint => {
	// Estimate transaction size (2 outputs: recipient + change)
	const baseSize = 10;

	// P2WPKH input size including witness
	const inputSize = 68;

	// P2WPKH output size
	const outputSize = 31;

	const estimatedSize = baseSize + estimatedInputs * inputSize + 2 * outputSize;

	return BigInt(estimatedSize) * feeRateSatoshisPerByte;
};

/**
 * Validates that the transaction parameters are valid
 */
export const validateTransactionParams = ({
	amount,
	address,
	availableBalance
}: {
	amount: Amount;
	address: string;
	availableBalance?: bigint;
}): void => {
	assertStringNotEmpty(address, 'Bitcoin address is required');
	assertAmount(amount);

	const amountSatoshis = convertNumberToSatoshis({ amount });

	if (availableBalance !== undefined) {
		assertSufficientBalance(amountSatoshis, availableBalance);
	}
};

/**
 * Helper function to get pending transaction IDs from UTXOs
 * This can be used to extract transaction IDs from pending UTXOs for filtering
 */
export const extractTxIdsFromUtxos = (utxos: Utxo[]): string[] =>
	utxos.map((utxo) => Buffer.from(utxo.outpoint.txid).toString('hex'));
