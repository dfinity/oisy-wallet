import { envIcToken } from '$env/types/env-icrc-token';
import { envTokenSymbol } from '$env/types/env-token-common';
import { z } from 'zod';

const envTokenData = envIcToken.extend({});

const envTokens = z.record(envTokenSymbol, z.union([z.undefined(), envTokenData]));

export type EnvIcrcTokens = z.infer<typeof envTokens>;

export const envTokensAdditionalIcrc = z.object({
	production: envTokens,
	staging: envTokens
});
