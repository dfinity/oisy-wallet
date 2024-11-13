import { EnvSnsTokenSchema } from '$env/schema/env-sns-token.schema';
import { z } from 'zod';

export const EnvSnsTokensSchema = z.array(EnvSnsTokenSchema);
