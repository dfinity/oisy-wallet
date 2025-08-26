import { BTC_SEND_FEE_TOLERANCE_PERCENTAGE } from '$btc/constants/btc.constants';
import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
import { getFeeRateFromPercentiles } from '$btc/services/btc-utxos.service';
import { BtcSendValidationError, BtcValidationError, type UtxosFee } from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import { estimateTransactionSize, extractUtxoTxIds } from '$btc/utils/btc-utxos.utils';
import type { SendBtcResponse } from '$declarations/signer/signer.did';
import { getPendingTransactionUtxoTxIds, txidStringToUint8Array } from '$icp/utils/btc.utils';
import { addPendingBtcTransaction } from '$lib/api/backend.api';
import { sendBtc as sendBtcApi } from '$lib/api/signer.api';
import { ZERO } from '$lib/constants/app.constants';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { BtcAddress } from '$lib/types/address';
import type { Amount } from '$lib/types/send';
import { invalidAmount } from '$lib/utils/input.utils';
import { mapBitcoinNetworkToNetworkId, mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { isNullish, nonNullish, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

interface BtcSendServiceParams {
	identity: Identity;
	network: BitcoinNetwork;
	amount: Amount;
}

export type SendBtcParams = BtcSendServiceParams & {
	destination: BtcAddress;
	source: BtcAddress;
	utxosFee: UtxosFee;
	onProgress?: () => void;
};

/**
 * This function handles the validation errors thrown by the validateUtxosForSend function
 * It has been moved to a service so it can be shared between the BTC Send and Convert Wizard
 * @param err BtcValidationError - The validation error that was thrown
 * @param $i18n I18n - The i18n store containing translation strings
 * @returns Promise<void> - Returns void if successful, may throw errors if validation fails
 */
export const handleBtcValidationError = async ({ err }: { err: BtcValidationError }) => {
	switch (err.type) {
		case BtcSendValidationError.AuthenticationRequired:
			await nullishSignOut();
			return;
		case BtcSendValidationError.NoNetworkId:
			toastsError({
				msg: { text: get(i18n).send.error.no_btc_network_id }
			});
			break;
		case BtcSendValidationError.InvalidDestination:
			toastsError({
				msg: { text: get(i18n).send.assertion.destination_address_invalid }
			});
			break;
		case BtcSendValidationError.InvalidAmount:
			toastsError({
				msg: { text: get(i18n).send.assertion.amount_invalid }
			});
			break;
		case BtcSendValidationError.UtxoFeeMissing:
			toastsError({
				msg: { text: get(i18n).send.assertion.utxos_fee_missing }
			});
			break;
		case BtcSendValidationError.TokenUndefined:
			toastsError({
				msg: { text: get(i18n).tokens.error.unexpected_undefined }
			});
			break;
		case BtcSendValidationError.InsufficientBalance:
			toastsError({
				msg: { text: get(i18n).send.assertion.btc_insufficient_balance }
			});
			break;
		case BtcSendValidationError.InsufficientBalanceForFee:
			toastsError({
				msg: { text: get(i18n).send.assertion.btc_insufficient_balance_for_fee }
			});
			break;
		case BtcSendValidationError.InvalidUtxoData:
			toastsError({
				msg: { text: get(i18n).send.assertion.btc_invalid_utxo_data }
			});
			break;
		case BtcSendValidationError.UtxoLocked:
			toastsError({
				msg: { text: get(i18n).send.assertion.btc_utxo_locked }
			});
			break;
		case BtcSendValidationError.InvalidFeeCalculation:
			toastsError({
				msg: { text: get(i18n).send.assertion.btc_invalid_fee_calculation }
			});
			break;
		case BtcSendValidationError.MinimumBalance:
			toastsError({
				msg: { text: get(i18n).send.assertion.minimum_btc_amount }
			});
			break;
		default:
			toastsError({
				msg: { text: get(i18n).send.error.unexpected },
				err
			});
			break;
	}
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
			!nonNullish(utxo.outpoint) ||
			!nonNullish(utxo.outpoint.txid) ||
			utxo.outpoint.txid.length === 0 ||
			utxo.outpoint.vout === undefined ||
			!nonNullish(utxo.value) ||
			BigInt(utxo.value) <= ZERO ||
			!nonNullish(utxo.height) ||
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

	const pendingUtxoTxIds = getPendingTransactionUtxoTxIds(source);

	if (isNullish(pendingUtxoTxIds)) {
		// when no pending transactions have been initiated, we cannot validate UTXO's and therefore, validation must fail
		throw new BtcValidationError(BtcSendValidationError.UtxoLocked);
	}

	if (pendingUtxoTxIds.length > 0) {
		const providedUtxoTxIds = extractUtxoTxIds(utxos);
		for (const utxoTxId of providedUtxoTxIds) {
			if (pendingUtxoTxIds.includes(utxoTxId)) {
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
	const estimatedTxSize = estimateTransactionSize({
		numInputs: utxos.length,
		numOutputs: 2
	});
	const expectedMinFee = (BigInt(estimatedTxSize) * feeRateMiliSatoshisPerVByte) / 1000n;

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

export const sendBtc = async ({
	utxosFee,
	network,
	source,
	identity,
	onProgress,
	...rest
}: SendBtcParams): Promise<void> => {
	const { txid } = await send({ onProgress, utxosFee, network, identity, ...rest });

	onProgress?.();

	await addPendingBtcTransaction({
		identity,
		network: mapToSignerBitcoinNetwork({ network }),
		address: source,
		txId: txidStringToUint8Array(txid),
		utxos: utxosFee.utxos
	});

	await waitAndTriggerWallet();
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
