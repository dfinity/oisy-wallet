// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-ownership-endpoints/get-contracts-for-owner-v-3
export interface AlchemyProviderContract {
	address: string;
	name?: string;
	symbol?: string;
	isSpam?: boolean;
	tokenType: string;
	openSeaMetadata?: OpenSeaMetadata;
}

interface OpenSeaMetadata {
	bannerImageUrl?: string;
	collectionName?: string;
	collectionSlug?: string;
}

export interface AlchemyProviderContracts {
	contracts: AlchemyProviderContract[];
}
