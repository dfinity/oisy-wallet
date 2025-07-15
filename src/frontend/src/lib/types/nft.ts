import type { NftMetadataSchema, NftSchema } from '$lib/schema/nftSchema';
import type * as z from 'zod';
import type { TokenId, TokenStandard } from '$lib/types/token';
import type { Network } from '$lib/types/network';

export type NftMetadata = z.infer<typeof NftMetadataSchema>;

export type Nft = z.infer<typeof NftSchema> & {contract: {
	id: TokenId,
		network: Network,
		standard: TokenStandard
	}};