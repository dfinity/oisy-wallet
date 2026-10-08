export enum ScannerResults {
	PAY = 'pay',
	WALLET_CONNECT = 'wallet_connect',
	SOL_SEND = 'sol_send',
	BTC_SEND = 'btc_send',
	IC_SEND = 'ic_send'
}

export interface UniversalScannerData {
	walletConnectUri: string;
}
