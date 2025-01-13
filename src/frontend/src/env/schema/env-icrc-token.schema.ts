import * as z from 'zod';

export const EnvIcrcTokenMetadataSchema = z.object({
	decimals: z.number(),
	name: z.string(),
	symbol: z.string(),
	fee: z.bigint(),
	alternativeName: z.optional(z.string()),
	url: z.optional(z.string().url())
});

export const EnvIcTokenSchema = z.object({
	ledgerCanisterId: z.string(),
	indexCanisterId: z.string()
});
