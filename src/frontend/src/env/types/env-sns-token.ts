import { envIcrcTokenMetadata, envIcToken } from '$env/types/env-icrc-token';
import { z } from 'zod';

const IndexCanisterVersionSchema = z.union([z.literal('up-to-date'), z.literal('outdated')]);

export const EnvSnsTokenSchema = envIcToken.extend({
	rootCanisterId: z.string(),
	metadata: envIcrcTokenMetadata,
	indexCanisterVersion: IndexCanisterVersionSchema
});

export const EnvSnsTokensSchema = z.array(EnvSnsTokenSchema);

export type EnvSnsToken = z.infer<typeof EnvSnsTokenSchema>;

export type EnvSnsTokens = z.infer<typeof EnvSnsTokensSchema>;
