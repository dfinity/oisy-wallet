import type { EnvExtTokenSchema } from '$env/schema/env-ext-token.schema';
import type * as z from 'zod';

export type EnvExtToken = z.infer<typeof EnvExtTokenSchema>;
