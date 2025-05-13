import type { EnvDip20TokenSchema } from '$env/schema/env-dip20-token.schema';
import type * as z from 'zod';

export type EnvDip20Token = z.infer<typeof EnvDip20TokenSchema>;
