import {
	BtcBroadcastUnconfirmedError,
	BtcPrepareSendError,
	type UtxosFee
} from '$btc/types/btc-send';
import { BTC_SEND_VIA_BACKEND_ENABLED } from '$env/btc.env';
import { BTC_DECIMALS } from '$env/tokens/tokens.btc.env';
import { BtcBroadcastTransactionCanisterError } from '$lib/canisters/errors';
import { SignerCanisterPaymentError } from '$lib/canisters/signer.errors';
import { NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';
import type { Amount } from '$lib/types/send';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { nonNullish, secondsToDuration } from '@dfinity/utils';

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
		case BtcPrepareSendError.MinimumBalance:
			return i18n.send.assertion.minimum_btc_amount;
		case BtcPrepareSendError.UtxoLocked:
			return i18n.send.assertion.btc_utxo_locked;
		case BtcPrepareSendError.PendingTransactionsNotAvailable:
			return i18n.send.assertion.pending_transactions_not_available;
		default:
			return i18n.send.info.no_available_utxos;
	}
};

// The two answers that leave the broadcast's outcome open: something may have gone out.
const isOpenBroadcastAnswer = ({ variant }: BtcBroadcastTransactionCanisterError): boolean =>
	'BroadcastOutcomeUnknown' in variant || 'BroadcastInProgress' in variant;

/**
 * Whether `btc_broadcast_transaction` answered that nothing of this transaction went out: any of
 * its typed errors but `BroadcastOutcomeUnknown` and `BroadcastInProgress`. A failure with no typed
 * answer, such as a transport error, never is one.
 */
export const isDefinitiveBtcBroadcastRefusal = (err: unknown): boolean =>
	err instanceof BtcBroadcastTransactionCanisterError && !isOpenBroadcastAnswer(err);

/**
 * Whether a BTC broadcast's outcome is unclear, so the transaction may have gone out: the backend
 * answered `BroadcastOutcomeUnknown` or `BroadcastInProgress`, or gave no typed answer at all.
 */
export const isUnclearBtcBroadcastOutcome = (err: unknown): boolean =>
	err instanceof BtcBroadcastUnconfirmedError ||
	(err instanceof BtcBroadcastTransactionCanisterError && isOpenBroadcastAnswer(err));

// The window of the backend's rate-limit tier that refused the broadcast: a minute, an hour or a day.
const btcBroadcastRateLimitWindowSeconds = (err: unknown): bigint | undefined =>
	err instanceof BtcBroadcastTransactionCanisterError && 'RateLimited' in err.variant
		? err.variant.RateLimited.window_ns / NANO_SECONDS_IN_SECOND
		: undefined;

// `btc_sign_prehash` is paid from the approval the backend grants each user at sign-in
// (`allow_signing`). Once it is spent, the cycles ledger refuses the charge, and signing fails until
// the next sign-in tops it up. The ledger's `InsufficientFunds` is the backend's own balance
// instead, which a sign-in does not fix.
//
// Only on the backend path: one input costs 38B there, so a refusal means the approval is nearly
// spent, and a sign-in renews it. `btc_caller_send` charges a whole send upfront, with no input cap,
// so it can cost more than any renewed approval, and a sign-in would not help (sbpublic).
const isBtcSigningAllowanceSpent = (err: unknown): boolean =>
	BTC_SEND_VIA_BACKEND_ENABLED &&
	err instanceof SignerCanisterPaymentError &&
	'LedgerWithdrawFromError' in err.paymentError &&
	'InsufficientAllowance' in err.paymentError.LedgerWithdrawFromError.error;

/**
 * Whether a failed `sendBtc` hit one of the backend's limits: a rate-limited broadcast, or a spent
 * signing approval. Nothing was sent, and its message from `mapBtcBroadcastErrorToMessage` says
 * what to do, so a toast leaves out the error's own detail, which is English and technical.
 */
export const isBtcSendLimitError = (err: unknown): boolean =>
	nonNullish(btcBroadcastRateLimitWindowSeconds(err)) || isBtcSigningAllowanceSpent(err);

/**
 * The message for a failed `sendBtc` that every flow shows alike, or `undefined` for the caller to
 * keep its own.
 */
export const mapBtcBroadcastErrorToMessage = ({
	err,
	i18n
}: {
	err: unknown;
	i18n: I18n;
}): string | undefined => {
	if (isUnclearBtcBroadcastOutcome(err)) {
		return i18n.send.error.btc_transaction_unconfirmed;
	}

	const rateLimitWindowSeconds = btcBroadcastRateLimitWindowSeconds(err);

	if (nonNullish(rateLimitWindowSeconds)) {
		return replacePlaceholders(i18n.send.error.btc_send_rate_limited, {
			$duration: secondsToDuration({
				seconds: rateLimitWindowSeconds,
				i18n: i18n.temporal.seconds_to_duration
			})
		});
	}

	if (isBtcSigningAllowanceSpent(err)) {
		return i18n.send.error.btc_signing_allowance_spent;
	}

	if (
		err instanceof BtcBroadcastTransactionCanisterError &&
		('UtxosAlreadyReserved' in err.variant || 'InvalidUtxos' in err.variant)
	) {
		return i18n.send.assertion.btc_utxo_locked;
	}
};
