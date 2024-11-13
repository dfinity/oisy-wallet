import { EnvTokensAdditionalIcrcSchema } from '$env/schema/env-additional-icrc-token.schema';
import { z } from 'zod';

export type EnvAdditionalIcrcTokens = z.infer<typeof EnvTokensAdditionalIcrcSchema>;
