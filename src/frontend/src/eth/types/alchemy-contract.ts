// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-ownership-endpoints/get-contracts-for-owner-v-3
interface Contract {
	address: string;
	name?: string;
	isSpam: boolean;
	tokenType: string;
}

export interface AlchemyProviderContracts {
	contracts: Contract[];
}
