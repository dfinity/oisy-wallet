import { UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import {
	calculateFinalFee,
	calculateUtxoSelection,
	filterAvailableUtxos
} from '$btc/utils/btc-utxos.utils';
import { BITCOIN_CANISTER_IDS, IC_CKBTC_MINTER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { getUtxosQuery } from '$icp/api/bitcoin.api';
import { getPendingTransactionIds } from '$icp/utils/btc.utils';
import { getCurrentBtcFeePercentiles } from '$lib/api/backend.api';
import type { BtcAddress } from '$lib/types/address';
import type { Amount } from '$lib/types/send';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork, Utxo } from '@dfinity/ckbtc';
import { isNullish } from '@dfinity/utils';

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
export const prepareBtcSend = async ({
	identity,
	network,
	amount,
	source
}: BtcReviewServiceParams): Promise<BtcReviewResult> => {
	const bitcoinCanisterId = BITCOIN_CANISTER_IDS[IC_CKBTC_MINTER_CANISTER_ID];

	const requiredMinConfirmations = UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS;

	// Get pending transactions to exclude locked UTXOs
	const pendingTxIds = getPendingTransactionIds(source);

	// Convert amount to satoshis
	const amountSatoshis = convertNumberToSatoshis({ amount });

	// Step 1: Get current fee percentiles from backend
	const feeRateSatoshisPerVByte = await getFeeRateFromPercentiles({
		identity,
		network
	});

	// Step 2: Fetch all available UTXOs using query call (fast and no cycle cost)
	const response = await getUtxosQuery({
		identity,
		bitcoinCanisterId,
		address: source,
		network,
		minConfirmations: requiredMinConfirmations
	});

	const allUtxos = response.utxos;

	if (allUtxos.length === 0) {
		throw new Error(
			// We can't send BTC when no UTXOs are available
			`InsufficientBalance: No UTXO's available for address ${source} with ${requiredMinConfirmations} confirmations`
		);
	}

	// Step 3: Filter UTXOs based on confirmations and exclude locked ones
	const filteredUtxos = filterAvailableUtxos({
		utxos: allUtxos,
		options: {
			minConfirmations: requiredMinConfirmations,
			pendingTxIds
		}
	});

	if (filteredUtxos.length === 0) {
		// We can't send BTC when no UTXOs are available
		throw new Error("InsufficientBalance: No UTXO's available after filtering");
	}

	// Step 4: Select UTXOs with fee consideration
	const selection = calculateUtxoSelection({
		availableUtxos: filteredUtxos,
		amountSatoshis,
		feeRateSatoshisPerVByte
	});

	// Step 5: Calculate the final fee based on selected UTXOs
	const feeSatoshis = calculateFinalFee({ selection, amountSatoshis });
	return {
		feeSatoshis,
		utxos: selection.selectedUtxos,
		totalInputValue: selection.totalInputValue,
		changeAmount: selection.changeAmount
	};
};

/**
 * Gets fee rate from current fee percentiles, with fallback to default
 * Uses the median fee rate (50th percentile) for balanced speed/cost
 * IMPORTANT: Converts from millisatoshis per vbyte (backend) to satoshis per vbyte (frontend)
 */
export const getFeeRateFromPercentiles = async ({
	identity,
	network
}: {
	identity: Identity;
	network: BitcoinNetwork;
}): Promise<bigint> => {
	// Convert network type to bitcoin canister format
	const bitcoinNetwork = mapToSignerBitcoinNetwork({ network });

	const response = await getCurrentBtcFeePercentiles({
		identity,
		network: bitcoinNetwork
	});

	// Get fee percentiles array
	const feePercentiles = response.fee_percentiles;
	if (isNullish(feePercentiles) || feePercentiles.length === 0) {
		throw new Error('No fee percentiles available - cannot calculate transaction fee');
	}

	// Use the median fee rate (50th percentile) for balanced transaction speed/cost
	const medianIndex = Math.floor(feePercentiles.length / 2);
	const medianFeeRateMillisatPerVByte = feePercentiles[medianIndex];

	// Convert from millisatoshis per vbyte to satoshis per vbyte
	// Backend returns values in millisat/vbyte, frontend uses sat/vbyte
	const medianFeeRatePerVByte = medianFeeRateMillisatPerVByte / 1000n;

	// Ensure we have a reasonable minimum fee rate (1 sat/vbyte)
	const minFeeRate = 1n;
	const finalFeeRate = medianFeeRatePerVByte > minFeeRate ? medianFeeRatePerVByte : minFeeRate;

	// Add safety cap to prevent extremely high fees (max 100 sat/vbyte)
	const maxFeeRate = 100n;

	return finalFeeRate > maxFeeRate ? maxFeeRate : finalFeeRate;
};
