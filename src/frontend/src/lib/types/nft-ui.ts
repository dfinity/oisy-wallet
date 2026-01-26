import type { NonFungibleTokenAppearanceSchema } from '$lib/schema/nft-ui.schema';
import type * as z from 'zod';

export type NonFungibleTokenAppearance = z.infer<typeof NonFungibleTokenAppearanceSchema>;
