// Adapted from ExternalProvider in '@ethersproject/providers'

export type MetamaskAccounts = string[];
export type MetamaskTransactionHash = string;

export type MetamaskAccountsRequest = {
	method: 'eth_requestAccounts';
};

export type MetamaskSendTransactionRequest = {
	method: 'eth_sendTransaction';
	params: [
		{
			from: string;
			to: string;
		}
	];
};

export interface MetamaskProvider {
	isMetaMask: boolean;
	request: {
		(request: MetamaskAccountsRequest): Promise<MetamaskAccounts>;
		(request: MetamaskSendTransactionRequest): Promise<MetamaskTransactionHash>;
	};
}
