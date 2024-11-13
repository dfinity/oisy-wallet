import { z } from 'zod';

export const envIcrcTokenMetadata = z.object({
	decimals: z.number(),
	name: z.string(),
	symbol: z.string(),
	fee: z.bigint(),
	alternativeName: z.optional(z.string()),
	url: z.optional(z.string().url())
});

export const envIcToken = z.object({
	ledgerCanisterId: z.string(),
	indexCanisterId: z.string()
});

export type EnvIcrcTokenMetadata = z.infer<typeof envIcrcTokenMetadata>;
