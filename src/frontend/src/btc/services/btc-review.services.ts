import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import type { UtxoSelectionResult } from '$btc/types/btc-review.services';
import type { UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import { calculateUtxoSelection, filterLockedUtxos, getUtxos } from '$btc/utils/btc-utxos.utils';
import type {
	BitcoinNetwork as BackendBitcoinNetwork,
	PendingTransaction
} from '$declarations/backend/backend.did';
import { BITCOIN_CANISTER_IDS, CKBTC_MINTER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { getCurrentBtcFeePercentiles } from '$lib/api/backend.api';
import type { BtcAddress } from '$lib/types/address';
import type { Amount } from '$lib/types/send';
import { assertArrayNotEmpty, assertStringNotEmpty } from '$lib/utils/asserts';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork, Utxo } from '@dfinity/ckbtc';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

const DEFAULT_MIN_CONFIRMATIONS = 6;
const DEFAULT_FEE_RATE_SATOSHIS_PER_BYTE = 10n;

interface BtcReviewServiceParams {
	identity: Identity;
	network: BitcoinNetwork;
	amount: Amount;
	source: BtcAddress;
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
export const prepareTransactionUtxos = async ({
	identity,
	network,
	amount,
	source
}: BtcReviewServiceParams): Promise<BtcReviewResult> => {
	assertNonNullish(identity);
	assertStringNotEmpty({ value: source, message: 'Source address is required' });
	assertNonNullish(CKBTC_MINTER_CANISTER_ID);

	// assertAmount({ amount });
	const bitcoinCanisterId = BITCOIN_CANISTER_IDS[CKBTC_MINTER_CANISTER_ID];

	console.warn('bitcoinCanisterId=', bitcoinCanisterId);

	// Get pending transactions to exclude locked UTXOs
	const pendingTxIds = getPendingTransactionIds(source);

	// Convert amount to satoshis
	const amountSatoshis = convertNumberToSatoshis({ amount });

	try {
		// Step 1: Get current fee percentiles from backend
		const feeRateSatoshisPerByte = await getFeeRateFromPercentiles({
			identity,
			network
		});

		console.warn(`Using fee rate: ${feeRateSatoshisPerByte} sat/byte (from percentiles)`);

		// Step 2: Fetch all available UTXOs using query call (fast and no cycle cost)
		const allUtxos = await getUtxos({
			identity,
			address: source,
			network,
			bitcoinCanisterId
		});

		// Step 3: Filter UTXOs based on confirmations and exclude locked ones
		const availableUtxos = filterAvailableUtxos({
			utxos: allUtxos,
			options: {
				minConfirmations: DEFAULT_MIN_CONFIRMATIONS,
				pendingTxIds
			}
		});

		assertArrayNotEmpty({
			array: availableUtxos,
			message: 'No available UTXOs found for the transaction'
		});

		// Step 4: Select UTXOs with fee consideration
		const selection = calculateUtxoSelection({
			availableUtxos,
			amountSatoshis,
			feeRateSatoshisPerByte
		});

		// Step 5: Calculate final fee based on selected UTXOs
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
 * Converts BitcoinNetwork from @dfinity/ckbtc to backend BitcoinNetwork type
 */
const convertNetworkType = (network: BitcoinNetwork): BackendBitcoinNetwork => {
	switch (network) {
		case 'mainnet':
			return { mainnet: null };
		case 'testnet':
			return { testnet: null };
		case 'regtest':
			return { regtest: null };
		default:
			throw new Error(`Unsupported Bitcoin network: ${network}`);
	}
};

/**
 * Gets fee rate from current fee percentiles, with fallback to default
 * Uses the median fee rate (50th percentile) for balanced speed/cost
 */
const getFeeRateFromPercentiles = async ({
	identity,
	network
}: {
	identity: Identity;
	network: BitcoinNetwork;
}): Promise<bigint> => {
	try {
		// Convert network type to backend format
		const backendNetwork = convertNetworkType(network);

		const response = await getCurrentBtcFeePercentiles({
			identity,
			network: backendNetwork
		});

		// Get fee percentiles array
		const feePercentiles = response.fee_percentiles;

		if (isNullish(feePercentiles) || feePercentiles.length === 0) {
			throw new Error('No fee percentiles available - cannot calculate transaction fee');
		}

		// Use the median fee rate (50th percentile) for balanced transaction speed/cost
		// Fee percentiles are typically returned in order: [10th, 25th, 50th, 75th, 90th]
		const medianIndex = Math.floor(feePercentiles.length / 2);
		const medianFeeRate = feePercentiles[medianIndex];

		// Ensure we have a reasonable minimum fee rate
		// TODO add a reasaoble value for the minFeeRate
		const minFeeRate = 1n;
		// make sure to use the minimun fee rate if medianFeeRate is below the minimum rate
		const finalFeeRate = medianFeeRate > minFeeRate ? medianFeeRate : minFeeRate;

		console.warn(`Using fee rate: ${finalFeeRate} sat/byte (from percentiles)`);
		return finalFeeRate;
	} catch (error) {
		console.warn('Failed to get fee percentiles, using default fee rate:', error);
		// TODO should we throw an error instead of using a default fee rateS?
		return DEFAULT_FEE_RATE_SATOSHIS_PER_BYTE;
	}
};

/**
 * Simplified version that returns the UtxosFee format expected by existing components
 * This maintains compatibility with the current frontend structure
 */
export const selectUtxosFeeCompatible = async (
	params: BtcReviewServiceParams
): Promise<UtxosFee> => {
	const result = await prepareTransactionUtxos(params);

	return {
		feeSatoshis: result.feeSatoshis,
		utxos: result.utxos
	};
};

/**
 * Get pending transaction IDs from the store to exclude locked UTXOs
 */
const getPendingTransactionIds = (address: string): string[] => {
	const storeData = get(btcPendingSentTransactionsStore);
	const pendingTransactions = storeData[address];

	if (isNullish(pendingTransactions) || !pendingTransactions.data) {
		return [];
	}

	// Extract transaction IDs from pending transactions
	// This assumes the pending transactions have a txid field
	return pendingTransactions.data
		.map((tx: PendingTransaction) => {
			// Handle different txid formats - could be Uint8Array, number[], or string
			if (tx.txid instanceof Uint8Array) {
				return Array.from(tx.txid)
					.map((b: number) => b.toString(16).padStart(2, '0'))
					.join('');
			}

			// Handle number array case
			if (Array.isArray(tx.txid)) {
				return tx.txid.map((b: number) => b.toString(16).padStart(2, '0')).join('');
			}

			// Handle string case
			if (typeof tx.txid === 'string') {
				return tx.txid;
			}

			// Fallback - convert to string
			return String(tx.txid);
		})
		.filter(Boolean);
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
