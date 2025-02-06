import {
	EnvIcrcTokenIconSchema,
	EnvIcrcTokenMetadataSchema
} from '$env/schema/env-icrc-token.schema';
import * as z from 'zod';

export type EnvIcrcTokenMetadata = z.infer<typeof EnvIcrcTokenMetadataSchema>;

export type EnvIcrcTokenIcon = z.infer<typeof EnvIcrcTokenIconSchema>;

export type EnvIcrcTokenMetadataWithIcon = EnvIcrcTokenMetadata & EnvIcrcTokenIcon;
