import type { NftAttributeSchema, NftIdSchema, NftMetadataSchema } from '$lib/schema/nft.schema';
import type * as z from 'zod';

export type NftId = z.infer<typeof NftIdSchema>;

export type NftAttributes = z.infer<typeof NftAttributeSchema>;

export type NftMetadata = z.infer<typeof NftMetadataSchema>;
