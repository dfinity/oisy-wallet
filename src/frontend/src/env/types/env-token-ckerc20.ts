import type {
	EnvCkErc20TokenDataSchema,
	EnvCkErc20TokensRawSchema,
	EnvCkErc20TokensSchema,
	EnvCkErc20TokensWithMetadataSchema,
	EnvTokensCkErc20Schema
} from '$env/schema/env-token-ckerc20.schema';
import type * as z from 'zod/v4';

export type EnvCkErc20TokenData = z.infer<typeof EnvCkErc20TokenDataSchema>;

export type EnvCkErc20TokensRaw = z.infer<typeof EnvCkErc20TokensRawSchema>;

export type EnvCkErc20Tokens = z.infer<typeof EnvCkErc20TokensSchema>;

export type EnvTokensCkErc20 = z.infer<typeof EnvTokensCkErc20Schema>;

export type EnvCkErc20TokensWithMetadata = z.infer<typeof EnvCkErc20TokensWithMetadataSchema>;
