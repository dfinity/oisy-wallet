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
