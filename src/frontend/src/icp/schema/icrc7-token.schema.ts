import { NonFungibleTokenAppearanceSchema } from '$lib/schema/nft-ui.schema';
import { TokenSchema } from '$lib/schema/token.schema';
import { CanisterIdTextSchema } from '$lib/types/canister';
import * as z from 'zod';

export const Icrc7CanistersSchema = z.object({
	canisterId: CanisterIdTextSchema
});

export const Icrc7InterfaceSchema = z.object({
	...Icrc7CanistersSchema.shape
});

export const Icrc7TokenSchema = z.object({
	...TokenSchema.shape,
	...NonFungibleTokenAppearanceSchema.shape,
	...Icrc7InterfaceSchema.shape
});
