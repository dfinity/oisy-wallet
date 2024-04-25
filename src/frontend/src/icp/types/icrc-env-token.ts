import { z } from 'zod';

export const icrcEnvTokenMetadata = z.object({
	decimals: z.number(),
	name: z.string(),
	symbol: z.string(),
	fee: z.bigint(),
	alternativeName: z.optional(z.string()),
	url: z.optional(z.string().url())
});

const indexCanisterVersion = z.union([z.literal('up-to-date'), z.literal('outdated')]);

export const icrcEnvToken = z.object({
	ledgerCanisterId: z.string(),
	rootCanisterId: z.string(),
	indexCanisterId: z.string(),
	metadata: icrcEnvTokenMetadata,
	indexCanisterVersion
});

export const icrcEnvTokens = z.array(icrcEnvToken);

export type IcrcEnvTokenMetadata = z.infer<typeof icrcEnvTokenMetadata>;

export type IcrcEnvToken = z.infer<typeof icrcEnvToken>;

export type IcrcEnvTokens = z.infer<typeof icrcEnvTokens>;
