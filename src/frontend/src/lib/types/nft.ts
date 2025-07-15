import type * as z from 'zod';
import type { NftSchema } from '$lib/schema/nftSchema';

export type Nft = z.infer<typeof NftSchema>;