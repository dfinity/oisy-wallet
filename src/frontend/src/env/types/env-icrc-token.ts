import { z } from 'zod';
import { envTokenSymbol } from '$env/types/env-token-common';

export const envIcrcTokenMetadata = z.object({
	decimals: z.number(),
	name: z.string(),
	symbol: z.string(),
	fee: z.bigint(),
	alternativeName: z.optional(z.string()),
	url: z.optional(z.string().url())
});

const indexCanisterVersion = z.union([z.literal('up-to-date'), z.literal('outdated')]);

export const envIcToken = z.object({
	ledgerCanisterId: z.string(),
	indexCanisterId: z.string()
});

export const envIcrcToken = envIcToken.extend({
	rootCanisterId: z.string(),
	metadata: envIcrcTokenMetadata,
	indexCanisterVersion
});

export const envIcrcTokens = z.array(envIcrcToken);

export type EnvIcrcTokenMetadata = z.infer<typeof envIcrcTokenMetadata>;

export type EnvIcrcToken = z.infer<typeof envIcrcToken>;

export type EnvIcrcTokens = z.infer<typeof envIcrcTokens>;

const envAdditionalIcrcTokens = z.record(envTokenSymbol, z.union([z.undefined(), envIcToken]));

export type EnvAdditionalIcrcTokens = z.infer<typeof envAdditionalIcrcTokens>;

export const envTokensAdditionalIcrc = z.object({
	production: envAdditionalIcrcTokens,
	staging: envAdditionalIcrcTokens
});
