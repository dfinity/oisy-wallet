import { EnvIcrcTokenMetadataSchema, EnvIcTokenSchema } from '$env/schema/env-icrc-token.schema';
import * as z from 'zod';

export const EnvSnsTokenSchema = EnvIcTokenSchema.extend({
	rootCanisterId: z.string(),
	metadata: EnvIcrcTokenMetadataSchema,
	deprecated: z.boolean().optional()
});

export const EnvSnsTokensSchema = z.array(EnvSnsTokenSchema);
