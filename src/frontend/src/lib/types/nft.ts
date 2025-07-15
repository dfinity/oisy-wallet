import { NftMetadataSchema, type NftSchema } from '$lib/schema/nftSchema';
import type * as z from 'zod';

export type NftMetadata = z.infer<typeof NftMetadataSchema>;

export type Nft = z.infer<typeof NftSchema>;