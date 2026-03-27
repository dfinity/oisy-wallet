import { EnvIcrcTokenMetadataSchema, EnvIcTokenSchema } from '$env/schema/env-icrc-token.schema';
import { OptionalTokenTagsSchema } from '$lib/schema/token-tag.schema';
import * as z from 'zod';

export const EnvDip20TokenSchema = EnvIcTokenSchema.pick({ ledgerCanisterId: true }).extend({
	metadata: EnvIcrcTokenMetadataSchema,
	...OptionalTokenTagsSchema.shape
});

export const EnvDip20TokensSchema = z.array(EnvDip20TokenSchema);
