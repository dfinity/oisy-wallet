import {
	EnvIcTokenWithMetadataSchema,
	OptionalEnvIcTokenWithMetadataSchema
} from '$env/schema/env-icrc-token.schema';
import { EnvTokenSymbolSchema } from '$env/schema/env-token-common.schema';
import * as z from 'zod';

export const EnvAdditionalIcrcTokensSchema = z.record(
	EnvTokenSymbolSchema,
	OptionalEnvIcTokenWithMetadataSchema
);

export const EnvAdditionalIcrcTokensWithMetadataSchema = z.record(
	EnvTokenSymbolSchema,
	EnvIcTokenWithMetadataSchema
);
