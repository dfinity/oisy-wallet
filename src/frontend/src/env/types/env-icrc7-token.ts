import type { EnvIcrc7TokenSchema } from '$env/schema/env-icrc7-token.schema';
import type * as z from 'zod';

export type EnvIcrc7Token = z.infer<typeof EnvIcrc7TokenSchema>;
