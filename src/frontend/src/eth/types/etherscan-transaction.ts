// https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-normal-transactions-by-address
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

// https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-internal-transactions-by-address
export interface EtherscanProviderInternalTransaction {
	blockNumber: string;
	timeStamp: string;
	hash: string;
	from: string;
	to: string;
	value: string;
	contractAddress: string;
	input: string;
	type: string;
	gas: string;
	gasUsed: string;
	traceId: string;
	isError: string;
	errCode: string;
}

// https://docs.etherscan.io/etherscan-v2/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
export interface EtherscanProviderTokenTransferTransaction {
	blockNumber: string;
	timeStamp: string;
	hash: string;
	nonce: string;
	blockHash: string;
	from: string;
	contractAddress: string;
	to: string;
	value: string;
	tokenName: string;
	tokenSymbol: string;
	tokenDecimal: string;
	transactionIndex: string;
	gas: string;
	gasPrice: string;
	gasUsed: string;
	cumulativeGasUsed: string;
	input: string;
	confirmations: string;
}
