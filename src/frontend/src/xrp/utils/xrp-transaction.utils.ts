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

// XRPL's transaction-ID hash prefix, 'TXN\0'.
const XRP_TRANSACTION_ID_PREFIX = Uint8Array.from([0x54, 0x58, 0x4e, 0x00]);

const XRP_TRANSACTION_ID_BYTES = 32;

/**
 * Transaction ID of a signed blob: `SHA-512Half(0x54584E00 || blob)`.
 *
 * Derived locally so confirmation does not depend on the submit response. A lost or malformed
 * response is not evidence of non-inclusion — the node may already have applied the transaction —
 * and without a hash of our own there would be nothing to poll, so the send would be reported as
 * failed and a retry would spend the funds again.
 */
export const deriveXrpTransactionHash = async (txBlob: string): Promise<string> => {
	const blob = Uint8Array.from(Buffer.from(txBlob, 'hex'));

	const message = new Uint8Array(XRP_TRANSACTION_ID_PREFIX.length + blob.length);
	message.set(XRP_TRANSACTION_ID_PREFIX);
	message.set(blob, XRP_TRANSACTION_ID_PREFIX.length);

	const digest = new Uint8Array(await crypto.subtle.digest('SHA-512', message));

	return Buffer.from(digest.slice(0, XRP_TRANSACTION_ID_BYTES)).toString('hex').toUpperCase();
};
