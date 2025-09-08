// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-ownership-endpoints/get-nf-ts-for-owner-v-3
interface OwnedNft {
	balance: string;
	description?: string;
	image?: Image;
	name?: string;
	raw: { metadata: Metadata };
	tokenId: string;
	contract: Contract;
	acquiredAt?: { blockTimestamp: string}
}

interface Contract {
	address: string;
	isSpam?: boolean;
	name?: string;
	openSeaMetadata?: {
		bannerImageUrl?: string;
		description?: string;
	};
	symbol?: string;
	tokenType: string;
}

interface Image {
	cachedUrl?: string;
	contentType?: string;
	originalUrl?: string;
	pngUrl?: string;
	thumbnailUrl?: string;
}

interface Metadata {
	attributes?: Attribute[];
}

interface Attribute {
	trait_type: string;
	value: string;
}

export interface AlchemyProviderOwnedNfts {
	ownedNfts: OwnedNft[];
}
