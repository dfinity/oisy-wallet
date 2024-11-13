import { z } from 'zod';
import { envTokenSymbol } from '$env/types/env-token-common';
import { EnvIcTokenSchema } from '$env/schema/env-icrc-token.schema';

// TODO, extract the union into it's own schema
export const EnvAdditionalIcrcTokensSchema = z.record(
	envTokenSymbol,
	z.union([z.undefined(), EnvIcTokenSchema])
);

export const EnvTokensAdditionalIcrcSchema = z.object({
	production: EnvAdditionalIcrcTokensSchema,
	staging: EnvAdditionalIcrcTokensSchema
});
