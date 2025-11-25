import type { ExtTokenSchema, ExtTokenWithoutIdSchema } from '$icp/schema/ext-token.schema';
import type { NonFungibleTokenAppearance } from '$lib/types/nft-ui';
import type * as z from 'zod';

export type ExtToken = z.infer<typeof ExtTokenSchema> & NonFungibleTokenAppearance;

export type ExtTokenWithoutId = z.infer<typeof ExtTokenWithoutIdSchema>;
