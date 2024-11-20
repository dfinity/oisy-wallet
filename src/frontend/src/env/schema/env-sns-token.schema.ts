import { EnvIcrcTokenMetadataSchema, EnvIcTokenSchema } from '$env/schema/env-icrc-token.schema';
import { z } from 'zod';

export const EnvSnsTokenSchema = EnvIcTokenSchema.extend({
	rootCanisterId: z.string(),
	metadata: EnvIcrcTokenMetadataSchema
});

export const EnvSnsTokensSchema = z.array(EnvSnsTokenSchema);
