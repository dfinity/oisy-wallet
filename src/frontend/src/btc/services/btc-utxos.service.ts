import { UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import { BtcPrepareSendError, type UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import {
	calculateUtxoSelection,
	filterAvailableUtxos,
	hasUtxoMinConfirmations,
	processNextUtxoPage
} from '$btc/utils/btc-utxos.utils';
import { BITCOIN_CANISTER_IDS, IC_CKBTC_MINTER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { getUtxosQuery, getUtxosQueryPaged } from '$icp/api/bitcoin.api';
import { getPendingTransactionIds } from '$icp/utils/btc.utils';
import { getCurrentBtcFeePercentiles } from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import type { BtcAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { Amount } from '$lib/types/send';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork, Utxo } from '@dfinity/ckbtc';
import { isNullish } from '@dfinity/utils';

export interface BtcReviewServiceParams {
	identity: Identity;
	network: BitcoinNetwork;
	amount: Amount;
	source: BtcAddress;
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
}: BtcReviewServiceParams): Promise<UtxosFee> => {
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
	const allUtxos = await getAllUtxos({
		identity,
		address: source,
		network,
		minConfirmations: requiredMinConfirmations
	});

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
			pendingTxIds
		}
	});

	if (filteredUtxos.length === 0) {
		return {
			feeSatoshis: ZERO,
			utxos: [],
			error: BtcPrepareSendError.InsufficientBalance
		};
	}

	// Step 4: Select UTXOs with fee consideration
	const selection = calculateUtxoSelection({
		availableUtxos: filteredUtxos,
		amountSatoshis,
		feeRateSatoshisPerVByte
	});

	// Check if there were insufficient funds during UTXO selection
	if (!selection.sufficientFunds) {
		return {
			feeSatoshis: ZERO,
			utxos: filteredUtxos,
			error: BtcPrepareSendError.InsufficientBalanceForFee
		};
	}

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
	const medianFeeMillisatsPerVByte = fee_percentiles[medianIndex];

	// Convert from millisats to sats (divide by 1000)
	const feeRateSatsPerVByte = medianFeeMillisatsPerVByte / 1000n;

	// Apply minimum and maximum limits
	const MIN_FEE_RATE = 1n; // 1 sat/vbyte minimum
	const MAX_FEE_RATE = 100n; // 100 sat/vbyte maximum

	if (feeRateSatsPerVByte < MIN_FEE_RATE) {
		return MIN_FEE_RATE;
	}

	if (feeRateSatsPerVByte > MAX_FEE_RATE) {
		return MAX_FEE_RATE;
	}

	return feeRateSatsPerVByte;
};

/**
 * Fetches all UTXOs for a Bitcoin address using pagination
 * Since the Bitcoin canister returns paginated results, this function
 * automatically handles pagination to retrieve all available UTXOs
 */
export const getAllUtxos = async ({
	identity,
	address,
	network,
	minConfirmations
}: {
	identity: OptionIdentity;
	network: BitcoinNetwork;
	address: string;
	minConfirmations?: number;
}): Promise<Utxo[]> => {
	// Get the Bitcoin canister ID for the current network
	const bitcoinCanisterId = BITCOIN_CANISTER_IDS[IC_CKBTC_MINTER_CANISTER_ID];

	// Array to accumulate all UTXOs from paginated responses
	const allUtxos: Utxo[] = [];

	// Start with the first page using the non-paginated query
	// This avoids the MalformedPage error when passing an empty Uint8Array
	const firstPageResponse = await getUtxosQuery({
		identity,
		bitcoinCanisterId,
		address,
		network,
		minConfirmations
	});

	// Add UTXOs from the first page
	allUtxos.push(...firstPageResponse.utxos);

	// Check if there are more pages to fetch
	let currentPage = processNextUtxoPage(firstPageResponse.next_page?.[0]);

	// Continue fetching additional pages if available
	while (currentPage) {
		// Fetch current page of UTXOs using the paginated query
		const response = await getUtxosQueryPaged({
			identity,
			bitcoinCanisterId,
			address,
			network,
			page: currentPage
		});

		// Add retrieved UTXOs to our collection
		allUtxos.push(...response.utxos);

		// Process next page information for subsequent requests
		currentPage = processNextUtxoPage(response.next_page?.[0]);
	}

	// Apply minimum confirmations filter if specified
	// Note: This filtering is done client-side since the Bitcoin canister
	// cannot combine pagination with minConfirmations filtering
	if (minConfirmations !== undefined) {
		return allUtxos.filter((utxo) => hasUtxoMinConfirmations({ utxo, minConfirmations }));
	}

	return allUtxos;
};
