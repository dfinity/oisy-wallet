import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpPayment, XrpSubmitResult } from '$xrp/types/xrp-transaction';
import { nonNullish } from '@dfinity/utils';

// XRPL groups results by prefix: `tes` succeeded, `ter` is retried/queued and `tec` was applied
// but *failed*, claiming the fee — all three mean the node took the transaction. `tem`/`tef`/`tel`
// were not applied BY THIS SUBMISSION; see `XRP_ALREADY_APPLIED_ENGINE_RESULT` for the code that
// reports an earlier one did apply.
//
// `tec` belongs here precisely because it WAS applied: failing on it at submit would report an
// applied transaction as rejected and skip the confirmation that knows which `tec` it was and
// that the fee was charged. Polling instead reaches the validated result and reports it
// definitively. If this reading of `tec` is ever shown to be wrong, the cost is bounded: the poll
// runs to `LastLedgerSequence` and ends with the indeterminate message rather than a false claim.
const XRP_PROCESSING_ENGINE_RESULT_PREFIXES = ['tes', 'ter', 'tec'];

// The one `tef` that is not a statement about this submission: per the XRPL reference it means
// "the same exact transaction has already been applied", i.e. an earlier submission of this very
// blob is in a ledger. Calling that a rejection would report a completed payment as unsent and
// invite a retry that pays a second time, so it is polled like an accepted result — the hash is
// derived locally, so there is always something to poll.
const XRP_ALREADY_APPLIED_ENGINE_RESULT = 'tefALREADY';

const XRP_SUCCESS_TRANSACTION_RESULT = 'tesSUCCESS';

/**
 * Whether the node took a submitted transaction for processing.
 *
 * "Took it" is not "it succeeded": a `tec*` result is taken and applied yet the payment failed.
 * Success is decided later, from the validated `meta.TransactionResult` — see
 * {@link isXrpTransactionSuccessful}. Both facts are required here because `accepted` alone says
 * nothing about the engine result, and an engine result alone says nothing about whether this
 * node accepted the blob.
 *
 * `tefALREADY` is the exception to both: it reports that an earlier submission of this exact blob
 * already applied, which is a reason to confirm rather than to reject.
 */
export const isXrpSubmitAccepted = ({ accepted, engineResult }: XrpSubmitResult): boolean =>
	// Not conjoined with `accepted`: a `tef` response reports `accepted: false`, and this code is
	// about a previous submission having applied rather than about this node taking the blob.
	engineResult === XRP_ALREADY_APPLIED_ENGINE_RESULT ||
	(accepted &&
		XRP_PROCESSING_ENGINE_RESULT_PREFIXES.some((prefix) => engineResult.startsWith(prefix)));

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
