import { z } from 'zod';

const envTokenData = z.object({
	ledgerCanisterId: z.string(),
	indexCanisterId: z.string()
});

const envTokenSymbol = z.string();

const envTokens = z.record(envTokenSymbol, z.union([z.undefined(), envTokenData]));

export const envTokensCkErc20 = z.object({
	production: envTokens,
	staging: envTokens
});
