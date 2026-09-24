import { XRP_LEDGER_SEARCH_LOOKBACK, XRP_RIPPLE_EPOCH_OFFSET } from '$xrp/constants/xrp.constants';
import { XrpAccountTransactionEntrySchema } from '$xrp/schema/xrpl-rpc.schema';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpPayment, XrpSubmitResult, XrpTransactionUi } from '$xrp/types/xrp-transaction';
import { isNullish, nonNullish } from '@dfinity/utils';
import { decode } from 'ripple-binary-codec';

// Only `tem` is a definitive rejection. The XRPL reference calls a `tem` result "final unless the
// rules for a valid transaction change", while a `tef` "may still succeed or fail with a different
// code after being reapplied" and `tel` transactions "may be automatically cached and retried
// later", and `tefALREADY` reports that this exact blob is already in the open ledger. A "no" that
// may still become a yes must not be reported as a failure: the user would send again and pay
// twice. Everything else is polled to `LastLedgerSequence`, which is the only thing that decides
// definitively.
//
// MEMBERSHIP, not a `tem`-shaped pattern. `engine_result` is `z.string()`, so `temporary`, `tem`,
// `temBAD_fee`, `tem BAD_FEE extra` and an invented `temFAKE` all arrive, and a pattern accepted
// the last of those as final — a definitive rejection decided AFTER the blob is broadcast, which
// tells a caller to rebuild on a new sequence and pay twice.
//
// The `tec` pattern in `XrplTxResultSchema` deliberately stays a pattern, and the asymmetry is the
// whole reason this one is a set. Staleness is the axis, since the protocol adds codes and any
// list here will eventually lag: an unknown `tem` is simply not final, so the send polls, the
// malformed transaction never lands and it expires — right answer, eighty seconds later. An
// unknown `tec` would stop the validated branch parsing and report a payment that was applied and
// did claim the fee as "outcome unknown", and amendments add `tec` codes routinely where they
// almost never add `tem` ones. A false positive runs the other way too: a fake `tem` is the worst
// outcome in this file, while a fake `tec` is harmless, because any validated result that is not
// `tesSUCCESS` means the payment did not deliver whatever the code is called.
//
// Generated once from `ripple-binary-codec`'s `TRANSACTION_RESULTS` and written out rather than
// imported from it: the list lives in the package's `dist`, it is typed as a class whose name
// direction is an implementation detail, and the dependency is range-pinned so CI can resolve a
// minor nobody verified. A test pins this set against that enum so a typo or a drift fails loudly.
const XRP_FINAL_FAILURE_ENGINE_RESULTS = new Set([
	'temARRAY_EMPTY',
	'temARRAY_TOO_LARGE',
	'temBAD_AMM_TOKENS',
	'temBAD_AMOUNT',
	'temBAD_CURRENCY',
	'temBAD_EXPIRATION',
	'temBAD_FEE',
	'temBAD_ISSUER',
	'temBAD_LIMIT',
	'temBAD_MPT',
	'temBAD_NFTOKEN_TRANSFER_FEE',
	'temBAD_OFFER',
	'temBAD_PATH',
	'temBAD_PATH_LOOP',
	'temBAD_QUORUM',
	'temBAD_REGKEY',
	'temBAD_SEND_XRP_LIMIT',
	'temBAD_SEND_XRP_MAX',
	'temBAD_SEND_XRP_NO_DIRECT',
	'temBAD_SEND_XRP_PARTIAL',
	'temBAD_SEND_XRP_PATHS',
	'temBAD_SEQUENCE',
	'temBAD_SIGNATURE',
	'temBAD_SIGNER',
	'temBAD_SRC_ACCOUNT',
	'temBAD_TICK_SIZE',
	'temBAD_TRANSFER_FEE',
	'temBAD_TRANSFER_RATE',
	'temBAD_WEIGHT',
	'temCANNOT_PREAUTH_SELF',
	'temDISABLED',
	'temDST_IS_SRC',
	'temDST_NEEDED',
	'temEMPTY_DID',
	'temINVALID',
	'temINVALID_ACCOUNT_ID',
	'temINVALID_COUNT',
	'temINVALID_FLAG',
	'temINVALID_INNER_BATCH',
	'temMALFORMED',
	'temREDUNDANT',
	'temRIPPLE_EMPTY',
	'temSEQ_AND_TICKET',
	'temUNCERTAIN',
	'temUNKNOWN',
	'temXCHAIN_BAD_PROOF',
	'temXCHAIN_BRIDGE_BAD_ISSUES',
	'temXCHAIN_BRIDGE_BAD_MIN_ACCOUNT_CREATE_AMOUNT',
	'temXCHAIN_BRIDGE_BAD_REWARD_AMOUNT',
	'temXCHAIN_BRIDGE_NONDOOR_OWNER',
	'temXCHAIN_EQUAL_DOOR_ACCOUNTS'
]);

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
	XRP_FINAL_FAILURE_ENGINE_RESULTS.has(engineResult) &&
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
