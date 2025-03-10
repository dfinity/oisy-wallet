import {
	EnvIcrcTokenIconSchema,
	EnvIcrcTokenMetadataSchema,
	EnvIcrcTokenMetadataWithIconSchema,
	EnvIcTokenSchema
} from '$env/schema/env-icrc-token.schema';
import * as z from 'zod';

export type EnvIcrcTokenMetadata = z.infer<typeof EnvIcrcTokenMetadataSchema>;

export type EnvIcrcTokenIcon = z.infer<typeof EnvIcrcTokenIconSchema>;

export type EnvIcrcTokenMetadataWithIcon = z.infer<typeof EnvIcrcTokenMetadataWithIconSchema>;

export type EnvIcToken = z.infer<typeof EnvIcTokenSchema>;
