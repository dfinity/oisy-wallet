import {
	BtcSendValidationError,
	type BtcValidationError,
	type UtxosFee
} from '$btc/types/btc-send';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import type { SendBtcResponse } from '$declarations/signer/signer.did';
import { addPendingBtcTransaction } from '$lib/api/backend.api';
import { sendBtc as sendBtcApi } from '$lib/api/signer.api';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { BtcAddress } from '$lib/types/address';
import type { Amount } from '$lib/types/send';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { waitAndTriggerWallet } from '$lib/utils/wallet.utils';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { hexStringToUint8Array, toNullable } from '@dfinity/utils';
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

export const sendBtc = async ({
	utxosFee,
	network,
	source,
	identity,
	onProgress,
	...rest
}: SendBtcParams): Promise<void> => {
	// TODO: use txid returned by this method to register it as a pending transaction in BE
	const { txid } = await send({ onProgress, utxosFee, network, identity, ...rest });

	onProgress?.();

	await addPendingBtcTransaction({
		identity,
		network: mapToSignerBitcoinNetwork({ network }),
		address: source,
		txId: hexStringToUint8Array(txid),
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
