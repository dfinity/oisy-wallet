import { EnvIcrcTokenMetadataSchema, EnvIcTokenSchema } from '$env/schema/env-icrc-token.schema';
import { IcTokenDeprecatedSchema } from '$icp/schema/ic-token-deprecated.schema';
import * as z from 'zod/v4';

export const EnvSnsTokenSchema = z.object({
	...EnvIcTokenSchema.shape,
	rootCanisterId: z.string(),
	metadata: EnvIcrcTokenMetadataSchema,
	...IcTokenDeprecatedSchema.shape
});

export const EnvSnsTokensSchema = z.array(EnvSnsTokenSchema);
