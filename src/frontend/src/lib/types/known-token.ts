import { z } from 'zod';

export const knownIcrcToken = z.object({
	ledgerCanisterId: z.string(),
	indexCanisterId: z.string(),
	metadata: z.object({
		decimals: z.number(),
		name: z.string(),
		symbol: z.string(),
		fee: z.bigint(),
		alternativeName: z.optional(z.string()),
		url: z.optional(z.string().url()),
		description: z.optional(z.string())
	})
});

export const knownIcrcTokens = z.array(knownIcrcToken);

export type KnownIcrcTokens = z.infer<typeof knownIcrcTokens>;
