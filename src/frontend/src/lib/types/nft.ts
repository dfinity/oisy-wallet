import type { NftSchema } from '$lib/schema/nftSchema';
import type * as z from 'zod';
import type { Token } from '$lib/types/token';

export type Nft = z.infer<typeof NftSchema> & { contract?: Token };
