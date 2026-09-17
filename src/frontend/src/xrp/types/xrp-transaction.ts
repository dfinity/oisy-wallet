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
 * Outcome of a completed XRP send.
 *
 * `txHash` is derived from the signed blob, so it is present even when the submit response was
 * lost — in which case `submitResult` is absent and inclusion was established by polling.
 */
export interface XrpSendResult {
	txHash: string;
	submitResult: XrpSubmitResult | undefined;
}
