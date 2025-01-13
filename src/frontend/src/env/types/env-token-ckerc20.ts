import { EnvCkErc20TokensSchema } from '$env/schema/env-token-ckerc20.schema';
import * as z from 'zod';

export type EnvCkErc20Tokens = z.infer<typeof EnvCkErc20TokensSchema>;
