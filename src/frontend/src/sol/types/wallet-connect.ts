export interface WalletConnectSolApproveRequestMessage {
	signature: string;
	transaction?: string;
}

// Why OISY refuses a Solana transaction it could sign but cannot show faithfully. The Settings switch
// lets the user sign past each of these once they acknowledge it on the review.
export type SolWalletConnectRefusal =
	'close_pays_others' | 'cannot_be_shown' | 'unreviewed_without_simulation';
