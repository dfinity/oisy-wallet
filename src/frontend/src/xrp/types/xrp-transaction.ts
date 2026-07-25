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
