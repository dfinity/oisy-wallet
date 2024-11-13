import { EnvIcrcTokenMetadataSchema, EnvIcTokenSchema } from '$env/schema/env-icrc-token.schema';
import { EnvSnsTokensSchema } from '$env/types/env-sns-token';
import { z } from 'zod';

const IndexCanisterVersionSchema = z.union([z.literal('up-to-date'), z.literal('outdated')]);

export const EnvSnsTokenSchema = EnvIcTokenSchema.extend({
	rootCanisterId: z.string(),
	metadata: EnvIcrcTokenMetadataSchema,
	indexCanisterVersion: IndexCanisterVersionSchema
});

export type EnvSnsToken = z.infer<typeof EnvSnsTokenSchema>;

export type EnvSnsTokens = z.infer<typeof EnvSnsTokensSchema>;
