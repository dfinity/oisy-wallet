// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-ownership-endpoints/get-contracts-for-owner-v-3
interface Contract {
	address: string;
	isSpam: boolean;
	tokenType: string;
}

export interface AlchemyProviderContracts {
	contracts: Contract[];
}

// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-metadata-endpoints/get-contract-metadata-v-3
interface OpenSeaMetadata {
	bannerImageUrl?: string;
	collectionName?: string;
	collectionSlug?: string;
	description?: string;
}

export interface AlchemyProviderContract {
	name?: string;
	symbol?: string;
	tokenType: string;
	openSeaMetadata?: OpenSeaMetadata;
}
