import { NonFungibleTokenAppearanceSchema } from '$lib/schema/nft-ui.schema';
import { TokenSchema } from '$lib/schema/token.schema';
import { CanisterIdTextSchema } from '$lib/types/canister';
import * as z from 'zod';

export const Dip721CanistersSchema = z.object({
	canisterId: CanisterIdTextSchema
});

export const Dip721InterfaceSchema = z.object({
	...Dip721CanistersSchema.shape
});

export const Dip721TokenSchema = z.object({
	...TokenSchema.shape,
	...NonFungibleTokenAppearanceSchema.shape,
	...Dip721InterfaceSchema.shape
});
