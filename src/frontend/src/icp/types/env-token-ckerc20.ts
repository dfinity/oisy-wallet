import { z } from 'zod';

const envTokenData = z.object({
	ledgerCanisterId: z.string(),
	indexCanisterId: z.string()
});

const envTokenSymbol = z.string();

export type EnvTokenSymbol = z.infer<typeof envTokenSymbol>;

const envTokens = z.record(envTokenSymbol, z.union([z.undefined(), envTokenData]));

export type EnvTokens = z.infer<typeof envTokens>;

export const envTokensCkErc20 = z.object({
	production: envTokens,
	staging: envTokens
});
