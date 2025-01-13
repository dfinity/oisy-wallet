import { EnvSnsTokenSchema, EnvSnsTokensSchema } from '$env/schema/env-sns-token.schema';
import * as z from 'zod';

export type EnvSnsToken = z.infer<typeof EnvSnsTokenSchema>;

export type EnvSnsTokens = z.infer<typeof EnvSnsTokensSchema>;
