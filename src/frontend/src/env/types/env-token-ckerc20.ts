import {
	EnvCkErc20TokenDataSchema,
	EnvCkErc20TokensRawSchema,
	EnvCkErc20TokensSchema,
	EnvTokensCkErc20Schema
} from '$env/schema/env-token-ckerc20.schema';
import * as z from 'zod';

export type EnvCkErc20TokenData = z.infer<typeof EnvCkErc20TokenDataSchema>;

export type EnvCkErc20TokensRaw = z.infer<typeof EnvCkErc20TokensRawSchema>;

export type EnvCkErc20Tokens = z.infer<typeof EnvCkErc20TokensSchema>;

export type EnvTokensCkErc20 = z.infer<typeof EnvTokensCkErc20Schema>;
