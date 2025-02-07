import { EnvTokenSymbolSchema } from '$env/schema/env-token-common.schema';
import * as z from 'zod';

export type EnvTokenSymbol = z.infer<typeof EnvTokenSymbolSchema>;
