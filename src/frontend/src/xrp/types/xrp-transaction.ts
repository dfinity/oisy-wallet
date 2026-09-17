import type { xrpTransactionTypes } from '$lib/schema/transaction.schema';
import type { TransactionId, TransactionType, TransactionUiCommon } from '$lib/types/transaction';

// Minimal XRPL Payment transaction shape (native XRP only). Amount and Fee are
// strings of drops (1 XRP = 1,000,000 drops); TxnSignature is set after signing.
export interface XrpPayment {
	TransactionType: 'Payment';
	Account: string;
	Destination: string;
	Amount: string;
	Fee: string;
	Sequence: number;
	SigningPubKey: string;
	DestinationTag?: number;
	LastLedgerSequence?: number;
	TxnSignature?: string;
}

export interface XrpSubmitResult {
	engineResult: string;
	engineResultMessage?: string;
	txHash?: string;
	accepted: boolean;
}

export interface XrpAccountInfo {
	balance: bigint;
	sequence: number;
	// Number of ledger objects the account owns; each one raises the reserve it must retain.
	ownerCount: number;
}

export type XrpTransactionType = Extract<
	TransactionType,
	(typeof xrpTransactionTypes.options)[number]
>;

export interface XrpTransactionUi extends TransactionUiCommon {
	id: TransactionId;
	type: XrpTransactionType;
	status: 'confirmed' | 'pending';
	value?: bigint;
	fee?: bigint;
	// XRPL destination tag — a numeric routing memo recipients such as exchanges use to
	// credit the right customer. Present only when the payment carried one.
	destinationTag?: number;
}

// Raw XRPL `account_tx` result shapes (native XRP only). `tx` is the classic
// (api_version 1) container; `tx_json` is its api_version 2 name — read whichever is
// present. `hash` / `ledger_index` also move to the entry level under api_version 2.
export interface XrpAccountTransaction {
	TransactionType: string;
	Account: string;
	Destination?: string;
	Amount?: string | Record<string, unknown>;
	// Drops for an XRP-funded payment, an object when the sender spent an issued currency.
	SendMax?: string | Record<string, unknown>;
	Fee?: string;
	DestinationTag?: number;
	hash?: string;
	ledger_index?: number;
	date?: number;
}

export interface XrpAccountTransactionMeta {
	TransactionResult?: string;
	delivered_amount?: string | Record<string, unknown>;
}

export interface XrpAccountTransactionEntry {
	tx?: XrpAccountTransaction;
	tx_json?: XrpAccountTransaction;
	meta?: XrpAccountTransactionMeta;
	validated?: boolean;
	hash?: string;
	ledger_index?: number;
}

export interface XrpTransactionsPage {
	transactions: XrpAccountTransactionEntry[];
	marker?: unknown;
}

/**
 * A signed transaction whose outcome is not known.
 *
 * Resubmitting exactly this, rather than rebuilding from a freshly fetched sequence, is what makes
 * a retry safe: the ledger applies a given signed transaction at most once, so a resubmission of
 * one that already landed is rejected as `tefALREADY` instead of paying a second time. A rebuilt
 * transaction has a new sequence and is therefore a second, independent payment.
 */
export interface XrpPendingTransaction {
	txBlob: string;
	txHash: string;
	lastLedgerSequence: number;
}

/**
 * Outcome of a completed XRP send.
 *
 * `txHash` is derived from the signed blob, so it is present even when the submit response was
 * lost — in which case `submitResult` is absent and inclusion was established by polling.
 */
export interface XrpSendResult {
	txHash: string;
	submitResult: XrpSubmitResult | undefined;
}
