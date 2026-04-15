export enum ScannerResults {
	PAY = 'pay',
	WALLET_CONNECT = 'wallet_connect'
}

export interface UniversalScannerData {
	walletConnectUri: string;
}
