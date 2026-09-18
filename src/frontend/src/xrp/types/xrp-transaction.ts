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
 * a retry safe — and the guarantee is the SEQUENCE, not transaction-identity dedup. A sequence can
 * be consumed only once, so if the original landed, the resubmission fails `checkSeqProxy` with
 * `tefPAST_SEQ` and is never applied. A rebuilt transaction carries a NEW sequence and is
 * therefore a second, independent payment.
 *
 * The transaction id is deliberately NOT a field here. It is a pure function of `txBlob`, and
 * carrying it separately meant a retry could submit one transaction while polling another id —
 * concluding that the second expired, which reports a settled payment as safe to resend.
 *
 * `tefALREADY` is a narrower case, not this one: rippled reaches it only via
 * `checkPriorTxAndLastLedger`, which runs after `checkSeqProxy`, so it fires for a duplicate
 * submitted inside the same open ledger — before the sequence was consumed.
 */
export interface XrpPendingTransaction {
	txBlob: string;
	// The inclusive ledger range the transaction can appear in: the open index when it was signed,
	// through the `LastLedgerSequence` it was signed with. Confirmation needs it to ask `tx` for a
	// definite answer — see `loadXrpTransactionOutcome`.
	firstLedgerSequence: number;
	lastLedgerSequence: number;
}

/**
 * What a `tx` lookup established about a submitted transaction.
 *
 * Three states rather than a boolean, because only one of them may end confirmation as
 * non-inclusion. `absent` is the node reporting `txnNotFound` having searched the whole ledger
 * range; `pending` is the node positively holding the transaction in a ledger that is not
 * validated yet. Collapsing the two lets the expiry recheck declare that a transaction the node
 * just handed back can never apply — and expiry, unlike every other confirmation failure, tells a
 * retry to build a NEW transaction, which takes a fresh sequence and pays a second time.
 */
export type XrpTransactionOutcome =
	{ state: 'validated'; transactionResult: string } | { state: 'pending' } | { state: 'absent' };

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
