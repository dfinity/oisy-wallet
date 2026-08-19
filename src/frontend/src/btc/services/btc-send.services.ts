import { BTC_SEND_FEE_TOLERANCE_PERCENTAGE } from '$btc/constants/btc.constants';
import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
import { getFeeRateFromPercentiles } from '$btc/services/btc-utxos.service';
import type { BtcAddress } from '$btc/types/address';
import { BtcSendValidationError, BtcValidationError, type UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import { estimateTransactionVSize, extractUtxoOutpoints } from '$btc/utils/btc-utxos.utils';
import type { SendBtcResponse, SignBtcResponse } from '$declarations/signer/signer.did';
import { getPendingTransactionUtxoOutpoints, txidStringToUint8Array } from '$icp/utils/btc.utils';
import { addPendingBtcTransaction } from '$lib/api/backend.api';
import { sendBtc as sendBtcApi, signBtc as signBtcApi } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Amount } from '$lib/types/send';
import { extractIIDelegationChain } from '$lib/utils/delegation.utils';
import { invalidAmount } from '$lib/utils/input.utils';
import { mapBitcoinNetworkToNetworkId, mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import { isNullish, nonNullish, toNullable } from '@dfinity/utils';
import type { BitcoinNetwork } from '@icp-sdk/canisters/ckbtc';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

interface CommonBtcServiceParams {
	identity: Identity;
	network: BitcoinNetwork;
	utxosFee: UtxosFee;
	destination: BtcAddress;
	onProgress?: () => void;
}

export type SendBtcParams = CommonBtcServiceParams & {
	amount: Amount;
	source: BtcAddress;
};

export type SignBtcParams = CommonBtcServiceParams & {
	satoshisAmount: bigint;
};

// Validation errors whose handling is a uniform toast differing only by the
// i18n key. AuthenticationRequired and the unexpected fallback are kept as
// explicit special cases below, so they intentionally do not appear here.
const btcValidationErrorMessages: Partial<Record<BtcSendValidationError, ($i18n: I18n) => string>> =
	{
		[BtcSendValidationError.NoNetworkId]: ($i18n) => $i18n.send.error.no_btc_network_id,
		[BtcSendValidationError.InvalidDestination]: ($i18n) =>
			$i18n.send.assertion.destination_address_invalid,
		[BtcSendValidationError.InvalidAmount]: ($i18n) => $i18n.send.assertion.amount_invalid,
		[BtcSendValidationError.UtxoFeeMissing]: ($i18n) => $i18n.send.assertion.utxos_fee_missing,
		[BtcSendValidationError.TokenUndefined]: ($i18n) => $i18n.tokens.error.unexpected_undefined,
		[BtcSendValidationError.InsufficientBalance]: ($i18n) =>
			$i18n.send.assertion.btc_insufficient_balance,
		[BtcSendValidationError.InsufficientBalanceForFee]: ($i18n) =>
			$i18n.send.assertion.btc_insufficient_balance_for_fee,
		[BtcSendValidationError.InvalidUtxoData]: ($i18n) => $i18n.send.assertion.btc_invalid_utxo_data,
		[BtcSendValidationError.UtxoLocked]: ($i18n) => $i18n.send.assertion.btc_utxo_locked,
		[BtcSendValidationError.InvalidFeeCalculation]: ($i18n) =>
			$i18n.send.assertion.btc_invalid_fee_calculation,
		[BtcSendValidationError.MinimumBalance]: ($i18n) => $i18n.send.assertion.minimum_btc_amount
	};

/**
 * Shows a toast for a BTC validation error, mapping each error type to its message.
 *
 * Shared between the BTC Send and Convert Wizard flows. Reads the current i18n store
 * internally, so no translation strings need to be passed in. `AuthenticationRequired`
 * is silently ignored and any unmapped error type falls back to a generic toast.
 *
 * This function is synchronous and returns void.
 *
 * @param params - Object containing the validation error
 * @param params.err - The {@link BtcValidationError} to surface as a toast
 */
export const handleBtcValidationError = ({ err }: { err: BtcValidationError }) => {
	if (err.type === BtcSendValidationError.AuthenticationRequired) {
		return;
	}

	const $i18n = get(i18n);

	const message = btcValidationErrorMessages[err.type];
	if (nonNullish(message)) {
		toastsError({ msg: { text: message($i18n) } });
		return;
	}

	toastsError({
		msg: { text: $i18n.send.error.unexpected },
		err
	});
};

/**
 * Validates all aspects of the provided UTXOs before sending Bitcoin transaction
 * @param params - Object containing all validation parameters
 * @throws BtcValidationError with specific error type if any validation fails
 */
export const validateBtcSend = async ({
	utxosFee,
	source,
	amount,
	network,
	identity
}: {
	utxosFee: UtxosFee;
	source: BtcAddress;
	amount: Amount;
	network: BitcoinNetwork;
	identity: Identity;
}): Promise<void> => {
	if (nonNullish(utxosFee.error)) {
		// If the send button was not properly disabled during an error, we return the same error again
		throw utxosFee.error;
	}

	// 1. Validate general input parameters first before accessing any properties
	if (invalidAmount(amount)) {
		throw new BtcValidationError(BtcSendValidationError.InvalidAmount);
	}

	const { utxos, feeSatoshis } = utxosFee;
	const amountSatoshis = convertNumberToSatoshis({ amount });

	if (utxos.length === 0) {
		throw new BtcValidationError(BtcSendValidationError.InsufficientBalance);
	}
	for (const utxo of utxos) {
		if (
			isNullish(utxo.outpoint) ||
			isNullish(utxo.outpoint.txid) ||
			utxo.outpoint.txid.length === 0 ||
			utxo.outpoint.vout === undefined ||
			isNullish(utxo.value) ||
			BigInt(utxo.value) <= ZERO ||
			isNullish(utxo.height) ||
			utxo.height < 0
		) {
			throw new BtcValidationError(BtcSendValidationError.InvalidUtxoData);
		}
	}

	// 2. Check if UTXOs are still unspent (not locked by pending transactions)
	// It is very important that the pending transactions are updated before validating the UTXOs
	await loadBtcPendingSentTransactions({
		identity,
		networkId: mapBitcoinNetworkToNetworkId(network), // we want to avoid having to pass redundant data to the function
		address: source
	});

	const pendingUtxoOutpoints = getPendingTransactionUtxoOutpoints(source);

	if (isNullish(pendingUtxoOutpoints)) {
		// when no pending transactions have been initiated, we cannot validate UTXO's and therefore, validation must fail
		throw new BtcValidationError(BtcSendValidationError.PendingTransactionsNotAvailable);
	}

	if (pendingUtxoOutpoints.length > 0) {
		const reserved = new Set(pendingUtxoOutpoints);
		const providedOutpoints = extractUtxoOutpoints(utxos);

		for (const outpointKey of providedOutpoints) {
			if (reserved.has(outpointKey)) {
				throw new BtcValidationError(BtcSendValidationError.UtxoLocked);
			}
		}
	}

	// 3. Verify UTXO values and calculate totals
	const totalUtxoValue = utxos.reduce((sum, utxo) => sum + BigInt(utxo.value), ZERO);
	if (totalUtxoValue <= ZERO) {
		throw new BtcValidationError(BtcSendValidationError.InvalidUtxoData);
	}

	// 4. Validate fee calculation matches expected transaction structure ( recipient + change)
	const feeRateMiliSatoshisPerVByte = await getFeeRateFromPercentiles({
		network,
		identity
	});
	const estimatedTxVSize = estimateTransactionVSize({
		numInputs: utxos.length,
		numOutputs: 2
	});
	const expectedMinFee = (BigInt(estimatedTxVSize) * feeRateMiliSatoshisPerVByte) / 1000n;

	// Allow some tolerance for fee calculation differences (±10%)
	const feeToleranceRange = expectedMinFee / BTC_SEND_FEE_TOLERANCE_PERCENTAGE;
	const minAcceptableFee = expectedMinFee - feeToleranceRange;
	const maxAcceptableFee = expectedMinFee + feeToleranceRange;

	if (feeSatoshis < minAcceptableFee || feeSatoshis > maxAcceptableFee) {
		throw new BtcValidationError(BtcSendValidationError.InvalidFeeCalculation);
	}

	// 5. Verify sufficient funds for amount + fee
	const totalRequired = amountSatoshis + feeSatoshis;
	if (totalUtxoValue < totalRequired) {
		throw new BtcValidationError(BtcSendValidationError.InsufficientBalanceForFee);
	}

	// TODO we must solve the dust issue first in prepareBtcSend before implementing this validation:
	// 6. Check for dust amounts in change output
	// const changeAmount = totalUtxoValue - totalRequired;
	// const DUST_THRESHOLD = 546n; // Standard Bitcoin dust threshold
	// if (changeAmount > ZERO && changeAmount < DUST_THRESHOLD) {
	//	throw new Error(
	//		`Transaction would create dust: change amount ${changeAmount} satoshis ` +
	//			`is below dust threshold ${DUST_THRESHOLD} satoshis`
	//	);
	// }
};

export const signBtc = async ({
	utxosFee,
	network,
	identity,
	satoshisAmount,
	destination
}: SignBtcParams): Promise<SignBtcResponse> => {
	const signerBitcoinNetwork = mapToSignerBitcoinNetwork({ network });

	return await signBtcApi({
		identity,
		network: signerBitcoinNetwork,
		feeSatoshis: toNullable(utxosFee.feeSatoshis),
		utxosToSpend: utxosFee.utxos,
		outputs: [{ destination_address: destination, sent_satoshis: satoshisAmount }]
	});
};

export const sendBtc = async ({
	utxosFee,
	network,
	source: _source,
	identity,
	onProgress,
	...rest
}: SendBtcParams): Promise<string> => {
	const { txid } = await send({ onProgress, utxosFee, network, identity, ...rest });

	await addPendingBtcTransaction({
		identity,
		network: mapToSignerBitcoinNetwork({ network }),
		txId: txidStringToUint8Array(txid),
		utxos: utxosFee.utxos,
		iiDelegationChain: extractIIDelegationChain(identity)
	});

	onProgress?.();

	await waitAndTriggerWallet();

	return txid;
};

const send = async ({
	identity,
	destination,
	network,
	amount,
	utxosFee,
	onProgress
}: Omit<SendBtcParams, 'source'>): Promise<SendBtcResponse> => {
	const satoshisAmount = convertNumberToSatoshis({ amount });
	const signerBitcoinNetwork = mapToSignerBitcoinNetwork({ network });

	onProgress?.();

	return await sendBtcApi({
		identity,
		network: signerBitcoinNetwork,
		feeSatoshis: toNullable(utxosFee.feeSatoshis),
		utxosToSpend: utxosFee.utxos,
		outputs: [{ destination_address: destination, sent_satoshis: satoshisAmount }]
	});
};
