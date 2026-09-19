import { XRP_LEDGER_SEARCH_LOOKBACK } from '$xrp/constants/xrp.constants';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpPayment, XrpSubmitResult } from '$xrp/types/xrp-transaction';
import { nonNullish } from '@dfinity/utils';
import { decode } from 'ripple-binary-codec';

// Only `tem` is a definitive rejection. The XRPL reference calls a `tem` result "final unless the
// rules for a valid transaction change", while a `tef` "may still succeed or fail with a different
// code after being reapplied" and `tel` transactions "may be automatically cached and retried
// later", and `tefALREADY` reports that this exact blob is already in the open ledger. A "no" that may still become a yes must not be reported as a failure: the user would
// send again and pay twice. Everything else is polled to `LastLedgerSequence`, which is the only
// thing that decides definitively.
// The COMPLETE code shape, not a prefix: `startsWith('tem')` also matched `temporary`, `tem`,
// `temBAD_fee` and `tem BAD_FEE extra`, and `engine_result` is `z.string()` in the submit schema,
// so any of them can arrive. Each read as a definitive rejection — which is decided AFTER the blob
// has been broadcast, so a transaction that may still land was reported as rejected and the user
// invited to send again.
//
// Checked against `ripple-binary-codec`'s own `TRANSACTION_RESULTS`: all 51 `tem` codes match, and
// no code from the other five classes does.
const XRP_FINAL_FAILURE_ENGINE_RESULT_PATTERN = /^tem[A-Z0-9_]+$/;

const XRP_SUCCESS_TRANSACTION_RESULT = 'tesSUCCESS';

/**
 * Whether a submit response definitively rejects the transaction.
 *
 * `accepted: false` is deliberately NOT enough: a node answering `tef`/`tel` reports it, and one
 * server refusing to take the blob is not evidence that no ledger will ever include it — it may
 * cache and reapply it. Only a malformed transaction can be called failed here; everything else,
 * including an applied-but-failed `tec*`, is decided by polling the locally derived hash (see
 * {@link isXrpTransactionSuccessful}).
 *
 * `accepted: true` alongside a `tem` is the separate case, and it is not the mirror of the above.
 * A malformed transaction is one no node can take, so a response saying both that it is malformed
 * and that this node took it contradicts itself — and a response that contradicts itself is not
 * evidence of anything, least of all on the ONE path here that declares a definitive failure after
 * the blob has been broadcast. So it is treated as ambiguous: the send falls through to the
 * confirmation poll, which costs a validity window on a transaction that will never land, and
 * avoids reporting someone else's rejection as this payment's.
 */
export const isXrpSubmitFinalFailure = ({ engineResult, accepted }: XrpSubmitResult): boolean =>
	XRP_FINAL_FAILURE_ENGINE_RESULT_PATTERN.test(engineResult) && !accepted;

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

/**
 * The inclusive ledger range a signed transaction can be included in, read out of the blob.
 *
 * Not carried as fields, for the same reason the transaction id is not (see
 * {@link XrpPendingTransaction}): the blob is what the ledger acts on, so anything travelling
 * beside it is a second claim that can disagree — and a stored lower bound that disagreed would
 * search the wrong ledgers, which is precisely the failure this window exists to avoid.
 *
 * The two ends are therefore established differently, because only one of them is signed.
 * `LastLedgerSequence` comes out of the blob and is exact. The lower bound cannot: nothing in the
 * blob records the index it was signed against, so it is reconstructed from
 * `XRP_LEDGER_SEARCH_LOOKBACK` — a constant that exists separately from the signing offset for
 * exactly this reason, and may never decrease. Deriving it from `XRP_LAST_LEDGER_SEQUENCE_OFFSET`
 * meant reducing the validity window also moved the search bound for blobs signed under the old
 * one, putting `min_ledger` above their true signing index.
 *
 * The two directions are not symmetric, which is what makes a conservative lower bound safe. Too
 * LOW is a superset of the signed window: the node may decline `searched_all` over it, which leaves
 * the outcome indeterminate and the poll running. Too HIGH excludes ledgers the payment can be in
 * while the node still reports `searched_all`, so confirmation reports a live transaction as
 * expired — and expiry is the one result that tells a retry to build a new transaction, on a new
 * sequence.
 *
 * A blob with no `LastLedgerSequence` is rejected rather than given an open-ended window. Such a
 * transaction can never expire, so no retry for it could ever be called safe, and `sendXrp` never
 * signs one without it.
 */
export const deriveXrpLedgerWindow = (
	txBlob: string
): { firstLedgerSequence: number; lastLedgerSequence: number } => {
	const { LastLedgerSequence: lastLedgerSequence } = decode(txBlob);

	if (typeof lastLedgerSequence !== 'number') {
		throw new Error(
			'Cannot derive the XRP ledger window: the signed transaction carries no LastLedgerSequence, so it can never expire.'
		);
	}

	return {
		// At or below the open index the transaction was signed against, whatever signing offset was
		// in force when it was signed. Clamped at zero because the subtraction must not produce a
		// negative `min_ledger` for an index below the lookback, which no real ledger reaches but the
		// codec's own bounds allow.
		firstLedgerSequence: Math.max(lastLedgerSequence - XRP_LEDGER_SEARCH_LOOKBACK, 0),
		lastLedgerSequence
	};
};

// XRPL's transaction-ID hash prefix, 'TXN\0'.
const XRP_TRANSACTION_ID_PREFIX = Uint8Array.from([0x54, 0x58, 0x4e, 0x00]);

const XRP_TRANSACTION_ID_BYTES = 32;

// A serialized transaction is whole bytes of hex. `Buffer.from(hex, 'hex')` does not reject
// anything else — it stops at the first character that is not a hex digit and returns what it had,
// so `1200ZZ`, `1200xyz` and `1200 00` all produce the bytes of `1200` and therefore one identical
// id. That matters most for a resubmission, whose blob comes from the caller: a wrong id is polled
// to a false expiry, which is the outcome this whole path exists to avoid.
const XRP_HEX_BLOB_REGEX = /^(?:[0-9a-fA-F]{2})+$/;

/**
 * Transaction ID of a signed blob: `SHA-512Half(0x54584E00 || blob)`.
 *
 * Derived locally so confirmation does not depend on the submit response. A lost or malformed
 * response is not evidence of non-inclusion — the node may already have applied the transaction —
 * and without a hash of our own there would be nothing to poll, so the send would be reported as
 * failed and a retry would spend the funds again.
 *
 * `ripple-binary-codec` does ship this as `transactionID`, but only from `dist/hashes`, which its
 * public entry point does not re-export — and the frontend deep-imports no package's `dist`. Kept
 * here rather than being the first, since it is pinned to a real ledger vector.
 */
export const deriveXrpTransactionHash = async (txBlob: string): Promise<string> => {
	if (!XRP_HEX_BLOB_REGEX.test(txBlob)) {
		throw new Error('Cannot derive an XRP transaction id: the blob is not whole bytes of hex.');
	}

	const blob = Uint8Array.from(Buffer.from(txBlob, 'hex'));

	const message = new Uint8Array(XRP_TRANSACTION_ID_PREFIX.length + blob.length);
	message.set(XRP_TRANSACTION_ID_PREFIX);
	message.set(blob, XRP_TRANSACTION_ID_PREFIX.length);

	const digest = new Uint8Array(await crypto.subtle.digest('SHA-512', message));

	return Buffer.from(digest.slice(0, XRP_TRANSACTION_ID_BYTES)).toString('hex').toUpperCase();
};
