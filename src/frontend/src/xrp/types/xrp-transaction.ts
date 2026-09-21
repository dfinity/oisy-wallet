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
	// AccountRoot flag bits. Always a number: `Flags` is a mandatory AccountRoot field, so a
	// response omitting it is malformed rather than a snapshot with unknown flags — `0` means no
	// flags are set, which is a positive answer and not an absent one.
	flags: number;
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
 * Nothing travels beside the blob. The transaction id and the ledger range confirmation polls are
 * both pure functions of it — see `deriveXrpTransactionHash` and `deriveXrpLedgerWindow` — and
 * carrying either as a field made it a second claim that could disagree with what was signed. A
 * mismatched id polls a different transaction; a mismatched range searches the wrong ledgers. Both
 * end in a settled payment being reported as expired and safe to resend.
 *
 * `tefALREADY` is a narrower case, not this one: rippled reaches it only via
 * `checkPriorTxAndLastLedger`, which runs after `checkSeqProxy`, so it fires for a duplicate
 * submitted inside the same open ledger — before the sequence was consumed.
 */
export interface XrpPendingTransaction {
	txBlob: string;
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
