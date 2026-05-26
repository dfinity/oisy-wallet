export enum ScannerResults {
	PAY = 'pay',
	WALLET_CONNECT = 'wallet_connect',
	SOL_SEND = 'sol_send'
}

export interface UniversalScannerData {
	walletConnectUri: string;
}
