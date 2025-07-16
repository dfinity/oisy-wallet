import type * as z from 'zod';
import type { NftAttributeSchema, NftMetadataSchema } from '$lib/schema/nft.schema';

export type NftAttributes = z.infer<typeof NftAttributeSchema>;

export type NftMetadata = z.infer<typeof NftMetadataSchema>;