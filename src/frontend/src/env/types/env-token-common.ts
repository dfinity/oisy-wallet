import { EnvTokenSymbolSchema } from '$env/schema/env-token-common.schema';
import { z } from 'zod';

export type EnvTokenSymbol = z.infer<typeof EnvTokenSymbolSchema>;
