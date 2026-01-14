import type {
	EnvExtTokenSchema,
	EnvExtTokenStandardVersionSchema
} from '$env/schema/env-ext-token.schema';
import type * as z from 'zod';

export type EnvExtTokenStandardVersion = z.infer<typeof EnvExtTokenStandardVersionSchema>;

export type EnvExtToken = z.infer<typeof EnvExtTokenSchema>;
