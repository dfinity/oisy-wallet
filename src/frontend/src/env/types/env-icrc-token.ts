import { z } from 'zod';

export const envIcrcTokenMetadata = z.object({
	decimals: z.number(),
	name: z.string(),
	symbol: z.string(),
	fee: z.bigint(),
	alternativeName: z.optional(z.string()),
	url: z.optional(z.string().url())
});

const indexCanisterVersion = z.union([z.literal('up-to-date'), z.literal('outdated')]);

export const envIcrcToken = z.object({
	ledgerCanisterId: z.string(),
	rootCanisterId: z.string(),
	indexCanisterId: z.string(),
	metadata: envIcrcTokenMetadata,
	indexCanisterVersion
});

export const envIcrcTokens = z.array(envIcrcToken);

export type EnvIcrcTokenMetadata = z.infer<typeof envIcrcTokenMetadata>;

export type EnvIcrcToken = z.infer<typeof envIcrcToken>;

export type EnvIcrcTokens = z.infer<typeof envIcrcTokens>;
