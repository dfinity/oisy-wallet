import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpPayment, XrpSubmitResult } from '$xrp/types/xrp-transaction';
import { nonNullish } from '@dfinity/utils';

// XRPL groups results by prefix: `tes` succeeded, `ter` is retried/queued, while `tec`
// was applied but *failed* (claiming the fee) and `tem`/`tef`/`tel` were not applied.
const XRP_PROCESSING_ENGINE_RESULT_PREFIXES = ['tes', 'ter'];

const XRP_SUCCESS_TRANSACTION_RESULT = 'tesSUCCESS';

/**
 * Whether the node took a submitted transaction for processing.
 *
 * Both facts are required: `accepted` alone only says the node applied, queued, broadcast
 * or kept it — an applied fee-claiming `tec*` result is "accepted" too, yet the payment
 * failed and must never enter confirmation.
 */
export const isXrpSubmitAccepted = ({ accepted, engineResult }: XrpSubmitResult): boolean =>
	accepted &&
	XRP_PROCESSING_ENGINE_RESULT_PREFIXES.some((prefix) => engineResult.startsWith(prefix));

/**
 * Whether a validated transaction actually succeeded.
 *
 * A validated transaction is only *final*; `tec*` results are validated as well, so the
 * final `meta.TransactionResult` is what decides success.
 */
export const isXrpTransactionSuccessful = (transactionResult: string | undefined): boolean =>
	transactionResult === XRP_SUCCESS_TRANSACTION_RESULT;

/**
 * Assembles an unsigned XRPL Payment for native XRP.
 *
 * `amount` and `fee` are drops (bigint) and are serialized as decimal strings, the
 * form XRPL expects. `DestinationTag` and `LastLedgerSequence` are only included
 * when provided — an omitted tag must not become `0`, which is a distinct, valid tag.
 */
export const buildXrpPayment = ({
	account,
	destination,
	amount,
	fee,
	sequence,
	signingPublicKey,
	destinationTag,
	lastLedgerSequence
}: {
	account: string;
	destination: string;
	amount: XrpBalance;
	fee: XrpBalance;
	sequence: number;
	signingPublicKey: string;
	destinationTag?: number;
	lastLedgerSequence?: number;
}): XrpPayment => ({
	TransactionType: 'Payment',
	Account: account,
	Destination: destination,
	Amount: `${amount}`,
	Fee: `${fee}`,
	Sequence: sequence,
	SigningPubKey: signingPublicKey,
	...(nonNullish(destinationTag) && { DestinationTag: destinationTag }),
	...(nonNullish(lastLedgerSequence) && { LastLedgerSequence: lastLedgerSequence })
});
