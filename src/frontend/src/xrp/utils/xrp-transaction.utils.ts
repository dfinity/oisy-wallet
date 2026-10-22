import { XRP_LEDGER_SEARCH_LOOKBACK, XRP_RIPPLE_EPOCH_OFFSET } from '$xrp/constants/xrp.constants';
import { XrpAccountTransactionEntrySchema } from '$xrp/schema/xrpl-rpc.schema';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpPayment, XrpTransactionUi } from '$xrp/types/xrp-transaction';
import { isNullish, nonNullish } from '@dfinity/utils';
import { decode } from 'ripple-binary-codec';

const XRP_SUCCESS_TRANSACTION_RESULT = 'tesSUCCESS';

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
	transaction: unknown;
	xrpAddress: XrpAddress;
}): XrpTransactionUi | undefined => {
	// `unknown`, not the entry type. The RPC schema checks the envelope and leaves rows alone, so
	// what arrives is whatever the node sent — and typing this parameter as a validated entry
	// promised something no caller could deliver.
	//
	// One parse rather than a list of guards. The guards were added three review rounds running,
	// each catching the field the last one missed, because nothing made the set complete: a row
	// with `hash: {}` passed every numeric check and became a store key that stringifies to
	// `[object Object]`. A rejected row is skipped exactly as before — the page survives it.
	const parsed = XrpAccountTransactionEntrySchema.safeParse(transaction);

	if (!parsed.success) {
		return undefined;
	}

	const entry = parsed.data;

	const { meta, validated } = entry;
	const tx = entry.tx ?? entry.tx_json;

	// `Destination` is mandatory on an XRPL Payment — the ledger rejects one without it — so a row
	// claiming to be a Payment and omitting it is malformed, not merely unusual. Left through, our
	// own account as `Account` made it a confirmed send with no recipient, in the list, the modal
	// and the CSV.
	//
	// Checked here rather than made required in the schema: `tx` is shared with the non-Payment
	// entries `account_tx` returns, and requiring it there would reject those at parse time instead
	// of letting the type check skip them.
	if (isNullish(tx) || tx.TransactionType !== 'Payment' || isNullish(tx.Destination)) {
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

	const hash = tx.hash ?? entry.hash;

	if (isNullish(hash)) {
		return undefined;
	}

	const isReceive = tx.Destination === xrpAddress;

	// Not `!isReceive`: the two are not opposites. XRPL allows a payment to your own account — the
	// standard cross-currency conversion — where this wallet is both sides at once.
	const isSender = tx.Account === xrpAddress;

	// `account_tx` returns everything that *affected* the account, not only what it sent or
	// received — an offer of ours consumed by someone else's payment, for instance. Mapping such an
	// entry would book a stranger's amount, and their fee, as this wallet's own send.
	if (!isReceive && !isSender) {
		return undefined;
	}

	// `SendMax` as an object means the delivered XRP was funded by an issued currency.
	const crossCurrency = nonNullish(tx.SendMax) && typeof tx.SendMax !== 'string';

	// `delivered_amount` is what the destination received. On a cross-currency payment the sender
	// funds it with something else, so crediting it as XRP leaving this wallet would be wrong:
	// only the fee did. Receiving stays valid, the XRP really did arrive.
	if (!isReceive && crossCurrency) {
		return undefined;
	}

	const ledgerIndex = tx.ledger_index ?? entry.ledger_index;

	// A payment to ourselves that delivers XRP is a round trip: the amount comes straight back and
	// only the fee leaves. Reported as a receive it claimed income the account never gained, while
	// the export — which books it as a standalone round trip — said the opposite about the same
	// transaction.
	//
	// XRP is the only chain whose self-transfer arrives as a single INCOMING row, and the export's
	// model is built on non-IC self-transfers being "a single outgoing row". Classifying it as a
	// send is what makes XRP fit that model rather than be compensated for.
	//
	// A self-CONVERSION stays a receive: `crossCurrency` says the delivered XRP was funded by
	// something else, so it genuinely arrived.
	// api_version 1 carries `tx.date`, seconds since the Ripple epoch; version 2 carries an ISO
	// string on the entry. Whichever the node speaks, the row gets a timestamp — a v2 response used
	// to map without one and land under "no date", with nothing saying why.
	//
	// An unparseable ISO string is dropped rather than skipping the row: the time is the one field
	// here that is presentational, and a payment is worth showing undated.
	const isoSeconds = nonNullish(entry.close_time_iso)
		? Math.floor(Date.parse(entry.close_time_iso) / 1000)
		: undefined;

	const timestamp = nonNullish(tx.date)
		? BigInt(tx.date + XRP_RIPPLE_EPOCH_OFFSET)
		: nonNullish(isoSeconds) && Number.isFinite(isoSeconds)
			? BigInt(isoSeconds)
			: undefined;

	const isRoundTrip = isSender && isReceive && !crossCurrency;

	return {
		id: hash,
		type: isReceive && !isRoundTrip ? 'receive' : 'send',
		// Unvalidated entries never get this far.
		status: 'confirmed',
		value: BigInt(amount),
		// Whoever signed paid the fee, which on a payment to ourselves is this wallet even though the
		// row is a receive. Keyed on `!isReceive` this dropped the cost of a self-conversion, and
		// export understated what the account paid.
		...(isSender && nonNullish(tx.Fee) && { fee: BigInt(tx.Fee) }),
		from: tx.Account,
		to: tx.Destination,
		...(nonNullish(timestamp) && { timestamp }),
		...(nonNullish(ledgerIndex) && { blockNumber: ledgerIndex }),
		...(nonNullish(tx.DestinationTag) && { destinationTag: tx.DestinationTag }),
		// Carried so the export can tell a self-conversion from a self-send: the first is a real
		// credit, the second cancels itself out.
		...(crossCurrency && { crossCurrency: true })
	};
};

/**
 * The inclusive ledger range a signed transaction can be included in, read out of the blob.
 *
 * Read out of the blob, like the transaction id: the blob is what the ledger acts on, so anything
 * travelling beside it is a second claim that can disagree — and a stored lower bound that
 * disagreed would search the wrong ledgers, which is precisely the failure this window exists to
 * avoid.
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

	return xrpLedgerSearchWindow(lastLedgerSequence);
};

/**
 * The same window as {@link deriveXrpLedgerWindow}, from the signed
 * `LastLedgerSequence` alone.
 *
 * Exported because an Active User Transaction row stores that one number and
 * nothing else — a resolver reading the row must search exactly the ledgers the
 * blob's own window covers, or its `searched_all` answer describes a different
 * range than the one the transaction could be in. One definition, so the two
 * cannot drift apart.
 */
export const xrpLedgerSearchWindow = (
	lastLedgerSequence: number
): { firstLedgerSequence: number; lastLedgerSequence: number } => ({
	// At or below the open index the transaction was signed against, whatever signing offset was
	// in force when it was signed. Clamped at zero because the subtraction must not produce a
	// negative `min_ledger` for an index below the lookback, which no real ledger reaches but the
	// codec's own bounds allow.
	firstLedgerSequence: Math.max(lastLedgerSequence - XRP_LEDGER_SEARCH_LOOKBACK, 0),
	lastLedgerSequence
});

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
