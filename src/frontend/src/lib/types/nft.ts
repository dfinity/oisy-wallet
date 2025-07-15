import type { NftMetadataSchema, NftSchema } from '$lib/schema/nftSchema';
import type * as z from 'zod';
import type { TokenId } from '$lib/types/token';

export type NftMetadata = z.infer<typeof NftMetadataSchema>;

export type Nft = z.infer<typeof NftSchema> & {contract: {
	id: TokenId
	}};