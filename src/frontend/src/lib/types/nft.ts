import type { Erc1155Token } from '$eth/types/erc1155';
import type { Erc721Token } from '$eth/types/erc721';
import type {
	NftAttributeSchema,
	NftCollectionSchema,
	NftIdSchema,
	NftMetadataSchema,
	NftSchema,
	OwnedContractSchema
} from '$lib/schema/nft.schema';
import type { NetworkId } from '$lib/types/network';
import type * as z from 'zod';

export type NftId = z.infer<typeof NftIdSchema>;

export type NftAttributes = z.infer<typeof NftAttributeSchema>;

export type NftMetadata = z.infer<typeof NftMetadataSchema>;

export type NftCollection = z.infer<typeof NftCollectionSchema>;

export interface NftCollectionUi {
	collection: NftCollection;
	nfts: Nft[];
}

export type Nft = z.infer<typeof NftSchema>;

export type OwnedContract = z.infer<typeof OwnedContractSchema>;

export type NftsByNetwork = Record<NetworkId, Record<string, Nft[]>>;

export type NonFungibleTokensByNetwork = Map<NetworkId, NonFungibleToken[]>;

export type NonFungibleToken = Erc721Token | Erc1155Token;
