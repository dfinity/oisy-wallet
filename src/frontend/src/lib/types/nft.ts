import type { NftSchema } from '$lib/schema/nftSchema';
import type * as z from 'zod';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';

export type Nft = z.infer<typeof NftSchema> & { contract: Erc721CustomToken };
