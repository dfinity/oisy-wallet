import type {
	NftAttributeSchema,
	NftIdSchema,
	NftMetadataSchema,
	NftSchema
} from '$lib/schema/nft.schema';
import type { Network } from '$lib/types/network';
import type { TokenId, TokenStandard } from '$lib/types/token';
import type * as z from 'zod';

export type NftId = z.infer<typeof NftIdSchema>;

export type NftAttributes = z.infer<typeof NftAttributeSchema>;

export type NftMetadata = z.infer<typeof NftMetadataSchema>;

export type Nft = z.infer<typeof NftSchema> & {
	contract: {
		id: TokenId;
		network: Network;
		standard: TokenStandard;
	};
};
