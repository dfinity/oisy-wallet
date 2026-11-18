import { ZERO } from '$lib/constants/app.constants';
import {
	XrpAccountTransactionEntrySchema,
	XrpRippleStateNodeSchema
} from '$xrp/schema/xrpl-rpc.schema';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpTrustLineTransactionUi } from '$xrp/types/xrp-transaction';
import type { XrpTrustLineTokenIdentity } from '$xrp/types/xrp-trust-line-token';
import {
	isXrpTransactionSuccessful,
	mapXrpTransaction,
	toXrpTransactionTimestamp
} from '$xrp/utils/xrp-transaction.utils';
import { parseXrpTokenValue } from '$xrp/utils/xrp-trust-line.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

type XrpTrustLineChange = XrpTrustLineTokenIdentity & {
	// What the wallet's balance on the line moved by, in base units: positive when it grew.
	delta: bigint;
};

/**
 * What one metadata node did to one of the wallet's trust lines, or `undefined` when the node is not
 * a line of the wallet's. The wallet's side is whichever limit names its address; the issuer is the
 * other side, and the balance, stated from the low side, is turned to the wallet's.
 */
const toXrpTrustLineChange = ({
	node,
	xrpAddress
}: {
	node: unknown;
	xrpAddress: XrpAddress;
}): XrpTrustLineChange | undefined => {
	const parsed = XrpRippleStateNodeSchema.safeParse(node);

	if (!parsed.success) {
		return;
	}

	const { data } = parsed;

	const { fields, final, previous } =
		'ModifiedNode' in data
			? {
					fields: data.ModifiedNode.FinalFields,
					final: data.ModifiedNode.FinalFields.Balance.value,
					// Listed only when it changed.
					previous:
						data.ModifiedNode.PreviousFields?.Balance?.value ??
						data.ModifiedNode.FinalFields.Balance.value
				}
			: 'CreatedNode' in data
				? {
						fields: data.CreatedNode.NewFields,
						final: data.CreatedNode.NewFields.Balance?.value ?? '0',
						previous: '0'
					}
				: {
						fields: data.DeletedNode.FinalFields,
						final: data.DeletedNode.FinalFields.Balance.value,
						previous:
							data.DeletedNode.PreviousFields?.Balance?.value ??
							data.DeletedNode.FinalFields.Balance.value
					};

	const { LowLimit: low, HighLimit: high } = fields;

	const walletIsLow = low.issuer === xrpAddress;

	// Exactly one side must be the wallet's: a line between two other accounts moved through this
	// transaction, and one with the wallet on both sides cannot exist.
	if (walletIsLow === (high.issuer === xrpAddress)) {
		return;
	}

	let lowDelta: bigint;

	try {
		lowDelta = parseXrpTokenValue({ value: final }) - parseXrpTokenValue({ value: previous });
	} catch (_: unknown) {
		// A value the parser refuses — an exponent past its bound — skips the node, as a malformed
		// one is skipped.
		return;
	}

	return {
		currency: low.currency,
		issuer: walletIsLow ? high.issuer : low.issuer,
		delta: walletIsLow ? lowDelta : -lowDelta
	};
};

/**
 * Maps one XRPL `account_tx` entry to the rows of the trust-line tokens it moved: one per line of
 * the wallet's that a settled `Payment` sent or received through, with what moved on that line —
 * read from the metadata, never from `Amount`, which a partial payment does not deliver and a
 * transfer fee does not cover.
 *
 * Only payments the wallet sent or received are read, as for native XRP. Anything else that touched
 * a line — a `TrustSet`, a clawback, a freeze — is not listed; the balance reflects it.
 *
 * The network fee, paid in XRP by whoever signed, goes on one row of the transaction only: on the
 * native XRP row when the payment has one, otherwise on the first token row.
 */
export const mapXrpTrustLineTransactions = ({
	transaction,
	xrpAddress
}: {
	transaction: unknown;
	xrpAddress: XrpAddress;
}): XrpTrustLineTransactionUi[] => {
	const parsed = XrpAccountTransactionEntrySchema.safeParse(transaction);

	if (!parsed.success) {
		return [];
	}

	const entry = parsed.data;

	const { meta, validated } = entry;
	const tx = entry.tx ?? entry.tx_json;

	// The same premises as `mapXrpTransaction`, for the same reasons: a payment without a
	// destination is malformed, and neither an unsettled nor an unsuccessful one moved anything.
	if (isNullish(tx) || tx.TransactionType !== 'Payment' || isNullish(tx.Destination)) {
		return [];
	}

	if (validated === false || !isXrpTransactionSuccessful(meta?.TransactionResult)) {
		return [];
	}

	const hash = tx.hash ?? entry.hash;

	if (isNullish(hash)) {
		return [];
	}

	const isReceive = tx.Destination === xrpAddress;
	const isSender = tx.Account === xrpAddress;

	if (!isReceive && !isSender) {
		return [];
	}

	const changes = (meta?.AffectedNodes ?? [])
		.map((node) => toXrpTrustLineChange({ node, xrpAddress }))
		.filter((change): change is XrpTrustLineChange => nonNullish(change) && change.delta !== ZERO);

	if (changes.length === 0) {
		return [];
	}

	const timestamp = toXrpTransactionTimestamp({ entry, tx });
	const ledgerIndex = tx.ledger_index ?? entry.ledger_index;

	const feeOnNativeRow = nonNullish(mapXrpTransaction({ transaction, xrpAddress })?.fee);

	return changes.map(({ currency, issuer, delta }, index) => ({
		currency,
		issuer,
		transaction: {
			id: hash,
			type: delta > ZERO ? 'receive' : 'send',
			status: 'confirmed',
			value: delta > ZERO ? delta : -delta,
			...(isSender &&
				!feeOnNativeRow &&
				index === 0 &&
				nonNullish(tx.Fee) && { fee: BigInt(tx.Fee) }),
			from: tx.Account,
			to: tx.Destination,
			...(nonNullish(timestamp) && { timestamp }),
			...(nonNullish(ledgerIndex) && { blockNumber: ledgerIndex }),
			...(nonNullish(tx.DestinationTag) && { destinationTag: tx.DestinationTag })
		}
	}));
};
