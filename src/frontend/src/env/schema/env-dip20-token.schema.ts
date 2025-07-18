import { EnvIcrcTokenMetadataSchema, EnvIcTokenSchema } from '$env/schema/env-icrc-token.schema';
import * as z from 'zod/v4';

export const EnvDip20TokenSchema = EnvIcTokenSchema.pick({ ledgerCanisterId: true }).extend({
	metadata: EnvIcrcTokenMetadataSchema
});

export const EnvDip20TokensSchema = z.array(EnvDip20TokenSchema);
