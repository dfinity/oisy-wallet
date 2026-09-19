import { XRP_LEDGER_SEARCH_LOOKBACK, XRP_RIPPLE_EPOCH_OFFSET } from '$xrp/constants/xrp.constants';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type {
	XrpAccountTransactionEntry,
	XrpPayment,
	XrpSubmitResult,
	XrpTransactionUi
} from '$xrp/types/xrp-transaction';
import { isNullish, nonNullish } from '@dfinity/utils';
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
 * It also has to be about THIS transaction: see the identity check in the body.
 *
 * `accepted: true` alongside a `tem` is the separate case, and it is not the mirror of the above.
 * A malformed transaction is one no node can take, so a response saying both that it is malformed
 * and that this node took it contradicts itself — and a response that contradicts itself is not
 * evidence of anything, least of all on the ONE path here that declares a definitive failure after
 * the blob has been broadcast. So it is treated as ambiguous: the send falls through to the
 * confirmation poll, which costs a validity window on a transaction that will never land, and
 * avoids reporting someone else's rejection as this payment's.
 */
export const isXrpSubmitFinalFailure = ({
	submitResult: { engineResult, accepted, txHash },
	transactionId
}: {
	submitResult: XrpSubmitResult;
	transactionId: string;
}): boolean =>
	XRP_FINAL_FAILURE_ENGINE_RESULT_PATTERN.test(engineResult) &&
	!accepted &&
	// The answer has to be about the blob we broadcast. Nothing else on this path ties the submit
	// response to the transaction, and this is the only branch that reports a definitive failure
	// AFTER the blob is on the wire — the report that tells a caller to rebuild, on a new sequence,
	// which is a second payment rather than a retry of the first.
	//
	// Only here, not on every submit: the id is derived locally so a lost or partial response stays
	// survivable, and demanding it everywhere would turn that property into a poll on every send. A
	// missing or mismatched hash therefore falls through to confirmation instead of rejecting.
	//
	// Hex, so compared case-insensitively — unlike the base58 addresses bound elsewhere.
	nonNullish(txHash) &&
	txHash.toUpperCase() === transactionId.toUpperCase();

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
 * Maps one XRPL `account_tx` entry to a UI transaction, or `undefined` when it is not
 * a settled native-XRP payment we display.
 *
 * v1 shows only successful native-XRP `Payment`s relative to `xrpAddress`: non-`Payment`
 * types (offers, trust lines, …), issued-currency payments (`Amount` an object, not a
 * drops string) and failed transactions (`TransactionResult` other than `tesSUCCESS`)
 * are skipped. The fee is attributed to the sending account only.
 */
export const mapXrpTransaction = ({
	transaction,
	xrpAddress
}: {
	transaction: XrpAccountTransactionEntry;
	xrpAddress: XrpAddress;
}): XrpTransactionUi | undefined => {
	const { meta, validated } = transaction;
	const tx = transaction.tx ?? transaction.tx_json;

	if (isNullish(tx) || tx.TransactionType !== 'Payment') {
		return undefined;
	}

	// Absence of a result is not evidence of success, so anything but an explicit `tesSUCCESS` is
	// skipped. Unvalidated entries are skipped too: the scheduler caches by transaction hash, which
	// does not change once the entry is validated, so a row stored while pending would never be
	// replaced by its settled form.
	if (validated === false || !isXrpTransactionSuccessful(meta?.TransactionResult)) {
		return undefined;
	}

	// The actually delivered amount (a partial payment can deliver less than `Amount`).
	// For native XRP it is a drops string; for issued currencies it is an object, which
	// we do not display.
	const amount = meta?.delivered_amount ?? tx.Amount;

	// XRPL reports `delivered_amount: "unavailable"` when the delivered amount was never recorded,
	// so the string check alone is not enough — only unsigned drops convert. Skipping beats falling
	// back to `Amount`, which is a partial payment's ceiling rather than what arrived.
	if (typeof amount !== 'string' || !/^\d+$/.test(amount)) {
		return undefined;
	}

	const hash = tx.hash ?? transaction.hash;

	if (isNullish(hash)) {
		return undefined;
	}

	const isReceive = tx.Destination === xrpAddress;

	// `account_tx` returns everything that *affected* the account, not only what it sent or
	// received — an offer of ours consumed by someone else's payment, for instance. Mapping such an
	// entry would book a stranger's amount, and their fee, as this wallet's own send.
	if (!isReceive && tx.Account !== xrpAddress) {
		return undefined;
	}

	// `delivered_amount` is what the destination received. On a cross-currency payment the sender
	// funds it with something else — `SendMax` as an object — so crediting it as XRP leaving this
	// wallet would be wrong: only the fee did. Receiving stays valid, the XRP really did arrive.
	if (!isReceive && nonNullish(tx.SendMax) && typeof tx.SendMax !== 'string') {
		return undefined;
	}

	const ledgerIndex = tx.ledger_index ?? transaction.ledger_index;

	return {
		id: hash,
		type: isReceive ? 'receive' : 'send',
		// Unvalidated entries never get this far.
		status: 'confirmed',
		value: BigInt(amount),
		// Guarded above, so not being the destination means being the sender.
		...(!isReceive && nonNullish(tx.Fee) && { fee: BigInt(tx.Fee) }),
		from: tx.Account,
		to: tx.Destination,
		...(nonNullish(tx.date) && { timestamp: BigInt(tx.date + XRP_RIPPLE_EPOCH_OFFSET) }),
		...(nonNullish(ledgerIndex) && { blockNumber: ledgerIndex }),
		...(nonNullish(tx.DestinationTag) && { destinationTag: tx.DestinationTag })
	};
};

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
