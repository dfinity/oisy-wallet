import type {
	EnvAdditionalIcrcTokensSchema,
	EnvAdditionalIcrcTokensWithMetadataSchema
} from '$env/schema/env-additional-icrc-token.schema';
import type * as z from 'zod/v4';

export type EnvAdditionalIcrcTokens = z.infer<typeof EnvAdditionalIcrcTokensSchema>;

export type EnvAdditionalIcrcTokensWithMetadata = z.infer<
	typeof EnvAdditionalIcrcTokensWithMetadataSchema
>;
