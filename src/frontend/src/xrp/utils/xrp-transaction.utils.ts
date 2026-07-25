import { XRP_RIPPLE_EPOCH_OFFSET } from '$xrp/constants/xrp.constants';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type {
	XrpAccountTransactionEntry,
	XrpPayment,
	XrpTransactionUi
} from '$xrp/types/xrp-transaction';
import { isNullish, nonNullish } from '@dfinity/utils';

const XRPL_SUCCESS_RESULT = 'tesSUCCESS';

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

	if (nonNullish(meta?.TransactionResult) && meta.TransactionResult !== XRPL_SUCCESS_RESULT) {
		return undefined;
	}

	// The actually delivered amount (a partial payment can deliver less than `Amount`).
	// For native XRP it is a drops string; for issued currencies it is an object, which
	// we do not display.
	const amount = meta?.delivered_amount ?? tx.Amount;

	if (typeof amount !== 'string') {
		return undefined;
	}

	const hash = tx.hash ?? transaction.hash;

	if (isNullish(hash)) {
		return undefined;
	}

	const isReceive = tx.Destination === xrpAddress;
	const ledgerIndex = tx.ledger_index ?? transaction.ledger_index;

	return {
		id: hash,
		type: isReceive ? 'receive' : 'send',
		status: validated === false ? 'pending' : 'confirmed',
		value: BigInt(amount),
		...(!isReceive && nonNullish(tx.Fee) && { fee: BigInt(tx.Fee) }),
		from: tx.Account,
		to: tx.Destination,
		...(nonNullish(tx.date) && { timestamp: BigInt(tx.date + XRP_RIPPLE_EPOCH_OFFSET) }),
		...(nonNullish(ledgerIndex) && { blockNumber: ledgerIndex }),
		...(nonNullish(tx.DestinationTag) && { destinationTag: tx.DestinationTag })
	};
};
