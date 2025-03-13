import {
	EnvAdditionalIcrcTokensSchema,
	EnvAdditionalIcrcTokensWithMetadataSchema
} from '$env/schema/env-additional-icrc-token.schema';
import * as z from 'zod';

export type EnvAdditionalIcrcTokens = z.infer<typeof EnvAdditionalIcrcTokensSchema>;

export type EnvAdditionalIcrcTokensWithMetadata = z.infer<
	typeof EnvAdditionalIcrcTokensWithMetadataSchema
>;
