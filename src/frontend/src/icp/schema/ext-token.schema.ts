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
	...ExtInterfaceSchema.shape
});
