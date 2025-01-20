export interface WalletConnectSolApproveRequestMessage {
	signature: string;
	transaction?: string;
}

export interface WalletConnectSolSendTransactionParams {
	transaction: string;
