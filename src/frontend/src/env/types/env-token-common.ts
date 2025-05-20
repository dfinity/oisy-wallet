import type { EnvTokenSymbolSchema } from '$env/schema/env-token-common.schema';
import type * as z from 'zod';

export type EnvTokenSymbol = z.infer<typeof EnvTokenSymbolSchema>;
