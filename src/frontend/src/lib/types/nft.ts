import type { NftSchema } from '$lib/schema/nftSchema';
import type { Token } from '$lib/types/token';
import type * as z from 'zod';

export type Nft = z.infer<typeof NftSchema> & { contract?: Token };
