import { BtcPrepareSendError, type UtxosFee } from '$btc/types/btc-send';
import { BTC_DECIMALS } from '$env/tokens/tokens.btc.env';
import type { Amount } from '$lib/types/send';
import { nonNullish } from '@dfinity/utils';

export const convertNumberToSatoshis = ({ amount }: { amount: Amount }): bigint =>
	// Numbers like 0.00004 can be stored internally by JS as 0.0000399999999...
	// Therefore, when multiplied by 10 ** BTC_DECIMALS this can result in a float like 4000.0000000000005
	// To avoid errors while converting to bigint, we need to ignore the floating part
	BigInt((Number(amount) * 10 ** BTC_DECIMALS).toFixed(0));

export const convertSatoshisToBtc = (satoshis: bigint): string => {
	const btcValue = Number(satoshis) / 10 ** BTC_DECIMALS;
	return btcValue.toFixed(BTC_DECIMALS).replace(/\.?0+$/, '');
};

/**
 * True when the frontend UTXO selection cannot fund a broadcast — the selection
 * reported an error or picked no UTXOs (e.g. the balance is only in unconfirmed
 * UTXOs). Such a result must never be handed to the signer.
 */
export const isInvalidUtxosFee = ({ error, utxos }: UtxosFee): boolean =>
	nonNullish(error) || utxos.length === 0;

/**
 * User-facing message for an unusable UTXO selection (mirrors the warnings shown
 * by `BtcSendWarnings` on the regular send form).
 */
export const mapUtxosFeeErrorToMessage = ({
	utxosFee: { error },
	i18n
}: {
	utxosFee: UtxosFee;
	i18n: I18n;
}): string => {
	switch (error) {
		case BtcPrepareSendError.InsufficientBalance:
			return i18n.send.assertion.insufficient_funds_verbose_btc;
		case BtcPrepareSendError.InsufficientBalanceForFee:
			return i18n.fee.assertion.insufficient_funds_for_fee;
		case BtcPrepareSendError.UtxoLocked:
			return i18n.send.assertion.btc_utxo_locked;
		case BtcPrepareSendError.PendingTransactionsNotAvailable:
			return i18n.send.assertion.pending_transactions_not_available;
		default:
			return i18n.send.info.no_available_utxos;
	}
};
