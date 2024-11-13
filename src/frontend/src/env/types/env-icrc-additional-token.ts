import { z } from 'zod';
import { EnvTokensAdditionalIcrcSchema } from '$env/schema/env-additional-icrc-token.schema';

export type EnvAdditionalIcrcTokens = z.infer<typeof EnvTokensAdditionalIcrcSchema>;
