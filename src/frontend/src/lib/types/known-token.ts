import { z } from 'zod';

export const knownIcrcTokenMetadata = z.object({
	decimals: z.number(),
	name: z.string(),
	symbol: z.string(),
	fee: z.bigint(),
	alternativeName: z.optional(z.string()),
	url: z.optional(z.string().url()),
	description: z.optional(z.string())
})

export const knownIcrcToken = z.object({
	ledgerCanisterId: z.string(),
	indexCanisterId: z.string(),
	metadata: knownIcrcTokenMetadata
});

export const knownIcrcTokens = z.array(knownIcrcToken);

export type KnownIcrcTokenMetadata = z.infer<typeof knownIcrcTokenMetadata>;

export type KnownIcrcToken = z.infer<typeof knownIcrcToken>;

export type KnownIcrcTokens = z.infer<typeof knownIcrcTokens>;
