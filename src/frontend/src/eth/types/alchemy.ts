// Alchemy NFT API v3 response types.

// --- getNFTsForOwner / getNFTMetadata ---
// https://www.alchemy.com/docs/reference/nft-api-endpoints

export interface AlchemyNftImage {
	originalUrl?: string;
}

export interface AlchemyNftOpenSeaMetadata {
	bannerImageUrl?: string;
	description?: string;
}

export interface AlchemyNftContract {
	address: string;
	openSeaMetadata?: AlchemyNftOpenSeaMetadata;
}

export interface AlchemyNftRawMetadata {
	attributes?: unknown[];
}

export interface AlchemyNftRaw {
	metadata: AlchemyNftRawMetadata;
}

export interface AlchemyNftAcquiredAt {
	blockTimestamp?: string;
}

export interface AlchemyOwnedNft {
	tokenId: string;
	name?: string;
	description?: string;
	image?: AlchemyNftImage;
	raw: AlchemyNftRaw;
	acquiredAt?: AlchemyNftAcquiredAt;
	contract: AlchemyNftContract;
	balance?: string;
}

export interface AlchemyOwnedNftsResponse {
	ownedNfts: AlchemyOwnedNft[];
}

export type AlchemyNft = Omit<AlchemyOwnedNft, 'balance'>;

// --- getContractsForOwner ---
// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-ownership-endpoints/get-contracts-for-owner-v-3

interface AlchemyContract {
	address: string;
	isSpam: boolean;
	tokenType: string;
}

export interface AlchemyProviderContracts {
	contracts: AlchemyContract[];
}

// --- getContractMetadata ---
// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-metadata-endpoints/get-contract-metadata-v-3

interface AlchemyOpenSeaMetadata {
	bannerImageUrl?: string;
	collectionName?: string;
	collectionSlug?: string;
	description?: string;
}

export interface AlchemyProviderContract {
	name?: string;
	symbol?: string;
	tokenType: string;
	openSeaMetadata?: AlchemyOpenSeaMetadata;
}
