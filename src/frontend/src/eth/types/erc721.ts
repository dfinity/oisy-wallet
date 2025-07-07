import type { NftSchema } from '$lib/schema/nftSchema';
import type * as z from 'zod';

// export type Erc721Token = z.infer<typeof NFTSchema>;

export type Nft = z.infer<typeof NftSchema>;
