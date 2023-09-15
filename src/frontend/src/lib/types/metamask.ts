export type MetamaskAccounts = string[];
export type MetamaskTransactionHash = string;

export type MetamaskAccountsRequest = {
	method: 'eth_requestAccounts';
};

export type MetamaskSendTransactionRequestParams = {
	from: string;
	to: string;
	value: string; // expected: BigNumber.toString() representation
};

export type MetamaskSendTransactionRequest = {
	method: 'eth_sendTransaction';
	params: [MetamaskSendTransactionRequestParams];
};

export interface MetamaskProvider {
	isMetaMask: boolean;
	request: {
		(request: MetamaskAccountsRequest): Promise<MetamaskAccounts>;
		(request: MetamaskSendTransactionRequest): Promise<MetamaskTransactionHash>;
	};
}
