import type {
	EnvIcrcTokenIconSchema,
	EnvIcrcTokenMetadataSchema,
	EnvIcrcTokenMetadataWithIconSchema
} from '$env/schema/env-icrc-token.schema';
import type * as z from 'zod/v4';

export type EnvIcrcTokenMetadata = z.infer<typeof EnvIcrcTokenMetadataSchema>;

export type EnvIcrcTokenIcon = z.infer<typeof EnvIcrcTokenIconSchema>;

export type EnvIcrcTokenMetadataWithIcon = z.infer<typeof EnvIcrcTokenMetadataWithIconSchema>;
