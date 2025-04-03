// https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
export interface EtherscanProviderTransaction {
	blockNumber: string;
	timeStamp: string;
	hash: string;
	nonce: string;
	blockHash: string;
	transactionIndex: string;
	from: string;
	to: string;
	value: string;
	gas: string;
	gasPrice: string;
	isError: string;
	txreceipt_status: string;
	input: string;
	contractAddress: string;
	cumulativeGasUsed: string;
	gasUsed: string;
	confirmations: string;
	methodId: string;
	functionName: string;
}

// https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
export interface EtherscanRestTransaction {
	blockHash: string;
	blockNumber: string;
	confirmations: string;
	contractAddress: string;
	cumulativeGasUsed: string;
	from: string;
	gas: string;
	gasPrice: string;
	gasUsed: string;
	hash: string;
	input: string;
	nonce: string;
	timeStamp: string;
	to: string;
	tokenDecimal: string;
	tokenName: string;
	tokenSymbol: string;
	transactionIndex: string;
	value: string;
}
