// https://www.alchemy.com/docs/reference/nft-api-endpoints/nft-api-endpoints/nft-ownership-endpoints/get-nf-ts-for-owner-v-3
interface OwnedNft {
	balance: string;
	contractAddress: string;
	tokenId: string;
}

export interface AlchemyProviderOwnedNfts {
	ownedNfts: OwnedNft[];
}
