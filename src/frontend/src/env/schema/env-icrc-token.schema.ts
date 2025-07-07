import * as z from 'zod/v4';

export const EnvIcrcTokenMetadataSchema = z.object({
	decimals: z.number(),
	name: z.string(),
	symbol: z.string(),
	fee: z.bigint(),
	alternativeName: z.optional(z.string()),
	url: z.optional(z.string().url())
});

export const EnvIcrcTokenIconSchema = z.object({
	icon: z.string().optional()
});

export const EnvIcrcTokenMetadataWithIconSchema =
	EnvIcrcTokenMetadataSchema.merge(EnvIcrcTokenIconSchema);

export const EnvIcTokenSchema = z.object({
	ledgerCanisterId: z.string(),
	indexCanisterId: z.string().optional()
});
