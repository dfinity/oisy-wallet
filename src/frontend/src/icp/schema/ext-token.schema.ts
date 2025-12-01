import { NonFungibleTokenAppearanceSchema } from '$lib/schema/nft-ui.schema';
import { TokenSchema } from '$lib/schema/token.schema';
import { CanisterIdTextSchema } from '$lib/types/canister';
import * as z from 'zod';

export const ExtCanistersSchema = z.object({
	canisterId: CanisterIdTextSchema
});

export const ExtInterfaceSchema = z.object({
	...ExtCanistersSchema.shape
});

export const ExtTokenSchema = z.object({
	...TokenSchema.shape,
	...NonFungibleTokenAppearanceSchema.shape,
	...ExtInterfaceSchema.shape
});

export const ExtTokenWithoutIdSchema = ExtTokenSchema.omit({ id: true }).strict();
