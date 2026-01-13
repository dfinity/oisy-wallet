import { NonFungibleTokenAppearanceSchema } from '$lib/schema/nft-ui.schema';
import { TokenSchema } from '$lib/schema/token.schema';
import { CanisterIdTextSchema } from '$lib/types/canister';
import * as z from 'zod';

export const IcPunksCanistersSchema = z.object({
	canisterId: CanisterIdTextSchema
});

export const IcPunksInterfaceSchema = z.object({
	...IcPunksCanistersSchema.shape
});

export const IcPunksTokenSchema = z.object({
	...TokenSchema.shape,
	...NonFungibleTokenAppearanceSchema.shape,
	...IcPunksInterfaceSchema.shape
});

export const IcPunksTokenWithoutIdSchema = IcPunksTokenSchema.omit({ id: true }).strict();
