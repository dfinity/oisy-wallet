import { CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import type { BtcAddress } from '$btc/types/address';
import { BtcPrepareSendError, type UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import { calculateUtxoSelection, filterAvailableUtxos } from '$btc/utils/btc-utxos.utils';
import { getPendingTransactionUtxoTxIds } from '$icp/utils/btc.utils';
import { getCurrentBtcFeePercentiles } from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import type { Amount } from '$lib/types/send';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { isNullish } from '@dfinity/utils';
import type { BitcoinNetwork, CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';
import type { Identity } from '@icp-sdk/core/agent';

export interface BtcReviewServiceParams {
	identity: Identity;
	network: BitcoinNetwork;
	amount: Amount;
	source: BtcAddress;
	allUtxos: CkBtcMinterDid.Utxo[];
	feeRateMiliSatoshisPerVByte: bigint;
}

/**
 * Main orchestrator function that replaces the backend btc_select_user_utxos_fee call
 * This function coordinates all the steps needed to select UTXOs and calculate fees
 */
export const prepareBtcSend = ({
	amount,
	source,
	allUtxos,
	feeRateMiliSatoshisPerVByte
}: BtcReviewServiceParams): UtxosFee => {
	console.log('start');

	const requiredMinConfirmations = CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS;

	// Get pending UTXO transaction IDs to exclude locked UTXOs
	// It is very important that the pending transactions are updated before validating the UTXOs
	// await loadBtcPendingSentTransactions({
	// 	identity,
	// 	networkId: mapBitcoinNetworkToNetworkId(network), // we want to avoid having to pass redundant data to the function
	// 	address: source
	// });
	const pendingUtxoTxIds = getPendingTransactionUtxoTxIds(source);
	if (isNullish(pendingUtxoTxIds)) {
		return {
			feeSatoshis: ZERO,
			utxos: [],
			error: BtcPrepareSendError.PendingTransactionsNotAvailable
		};
	}

	// Convert amount to satoshis
	const amountSatoshis = convertNumberToSatoshis({ amount });

	// Step 1: Get current fee percentiles from backend

	if (allUtxos.length === 0) {
		return {
			feeSatoshis: ZERO,
			utxos: [],
			error: BtcPrepareSendError.InsufficientBalance
		};
	}

	// Step 3: Filter UTXOs based on confirmations and exclude locked ones
	const filteredUtxos = filterAvailableUtxos({
		utxos: allUtxos,
		options: {
			minConfirmations: requiredMinConfirmations,
			pendingUtxoTxIds
		}
	});

	if (filteredUtxos.length === 0) {
		return {
			feeSatoshis: ZERO,
			utxos: [],
			error: BtcPrepareSendError.UtxoLocked
		};
	}

	// Step 4: Select UTXOs with fee consideration
	const selection = calculateUtxoSelection({
		availableUtxos: filteredUtxos,
		amountSatoshis,
		feeRateMiliSatoshisPerVByte
	});

	// Check if there were insufficient funds during UTXO selection
	if (!selection.sufficientFunds) {
		return {
			feeSatoshis: selection.feeSatoshis,
			utxos: filteredUtxos,
			error: BtcPrepareSendError.InsufficientBalanceForFee
		};
	}
	console.log('end');
	// Fee is already calculated in the selection process
	return {
		feeSatoshis: selection.feeSatoshis,
		utxos: selection.selectedUtxos
	};
};

export const getFeeRateFromPercentiles = async ({
	identity,
	network
}: {
	identity: Identity;
	network: BitcoinNetwork;
}): Promise<bigint> => {
	const mappedNetwork = mapToSignerBitcoinNetwork({ network });

	const { fee_percentiles } = await getCurrentBtcFeePercentiles({
		identity,
		network: mappedNetwork
	});

	if (isNullish(fee_percentiles) || fee_percentiles.length === 0) {
		throw new Error('No fee percentiles available - cannot calculate transaction fee');
	}

	// Use median fee percentile
	const medianIndex = Math.floor(fee_percentiles.length / 2);

	// Use median fee percentile
	const medianFeeMillisatsPerVByte = fee_percentiles[medianIndex];

	// Apply minimum and maximum limits
	const MIN_FEE_RATE = 1_000n; // 1 sat/vbyte minimum
	const MAX_FEE_RATE = 100_000n; // 100 sat/vbyte maximum

	if (medianFeeMillisatsPerVByte < MIN_FEE_RATE) {
		return MIN_FEE_RATE;
	}

	if (medianFeeMillisatsPerVByte > MAX_FEE_RATE) {
		return MAX_FEE_RATE;
	}

	return medianFeeMillisatsPerVByte;
};
