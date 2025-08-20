// https://docs.etherscan.io/etherscan-v2/api-endpoints/tokens#get-address-erc721-token-holding
export interface EtherscanProviderTokenBalance {
	TokenAddress: string;
	TokenName: string;
	TokenSymbol: string;
	TokenQuantity: string;
}
