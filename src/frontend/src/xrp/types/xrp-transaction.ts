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
	// The inclusive ledger range the transaction can appear in: the open index when it was signed,
	// through the `LastLedgerSequence` it was signed with. Confirmation needs it to ask `tx` for a
	// definite answer — see `loadXrpTransactionOutcome`.
	firstLedgerSequence: number;
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
