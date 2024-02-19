export type MetamaskAccounts = string[];
export type MetamaskTransactionHash = string;
export type MetamaskChainId = `${'0x'}${string}`;

export interface MetamaskAccountsRequest {
	method: 'eth_requestAccounts';
}

export interface MetamaskSendTransactionRequestParams {
	from: string;
	to: string;
	value: string; // expected: BigNumber.toString() representation
}

export interface MetamaskSendTransactionRequest {
	method: 'eth_sendTransaction';
	params: [MetamaskSendTransactionRequestParams];
}

export interface MetamaskSwitchChainRequestParams {
	chainId: MetamaskChainId;
}

export interface MetamaskSwitchChainRequest {
	method: 'wallet_switchEthereumChain';
	params: [MetamaskSwitchChainRequestParams];
}

export interface MetamaskProvider {
	isMetaMask: boolean;
	request: {
		(request: MetamaskAccountsRequest): Promise<MetamaskAccounts>;
		(request: MetamaskSendTransactionRequest): Promise<MetamaskTransactionHash>;
		(request: MetamaskSwitchChainRequest): Promise<null>;
	};
}
