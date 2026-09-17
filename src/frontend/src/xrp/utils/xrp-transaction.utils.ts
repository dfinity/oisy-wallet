import { XRP_RIPPLE_EPOCH_OFFSET } from '$xrp/constants/xrp.constants';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type {
	XrpAccountTransactionEntry,
	XrpPayment,
	XrpSubmitResult,
	XrpTransactionUi
} from '$xrp/types/xrp-transaction';
import { isNullish, nonNullish } from '@dfinity/utils';

// Only `tem` is a definitive rejection. The XRPL reference calls a `tem` result "final unless the
// rules for a valid transaction change", while a `tef` "may still succeed or fail with a different
// code after being reapplied" and `tel` transactions "may be automatically cached and retried
// later" — `tefALREADY` even reports that an earlier submission of this exact blob already
// applied. A "no" that may still become a yes must not be reported as a failure: the user would
// send again and pay twice. Everything else is polled to `LastLedgerSequence`, which is the only
// thing that decides definitively.
const XRP_FINAL_FAILURE_ENGINE_RESULT_PREFIX = 'tem';

const XRP_SUCCESS_TRANSACTION_RESULT = 'tesSUCCESS';

/**
 * Whether a submit response definitively rejects the transaction.
 *
 * Deliberately NOT a function of `accepted`: a node answering `tef`/`tel` reports
 * `accepted: false`, and one server refusing to take the blob is not evidence that no ledger will
 * ever include it — it may cache and reapply it. Only a malformed transaction can be called failed
 * here; everything else, including an applied-but-failed `tec*`, is decided by polling the
 * locally derived hash (see {@link isXrpTransactionSuccessful}).
 */
export const isXrpSubmitFinalFailure = ({ engineResult }: XrpSubmitResult): boolean =>
	engineResult.startsWith(XRP_FINAL_FAILURE_ENGINE_RESULT_PREFIX);

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
