import type { Erc1155Token } from '$eth/types/erc1155';
import type { Erc721Token } from '$eth/types/erc721';
import type {
	CollectionSchema,
	NftAttributeSchema,
	NftIdSchema,
	NftMetadataSchema,
	NftSchema
} from '$lib/schema/nft.schema';
import type { NetworkId } from '$lib/types/network';
import type * as z from 'zod';

export type NftId = z.infer<typeof NftIdSchema>;

export type NftAttributes = z.infer<typeof NftAttributeSchema>;

export type NftMetadata = z.infer<typeof NftMetadataSchema>;

export type Collection = z.infer<typeof CollectionSchema>;

export type Nft = z.infer<typeof NftSchema>;

export type NftsByNetwork = Record<NetworkId, Record<string, Nft[]>>;

export type NonFungibleToken = Erc721Token | Erc1155Token;
