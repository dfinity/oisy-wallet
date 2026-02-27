import type { EnvSnsTokenSchema } from '$env/schema/env-sns-token.schema';
import type * as z from 'zod';

export type EnvSnsToken = z.infer<typeof EnvSnsTokenSchema>;
