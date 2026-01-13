import type { EnvIcPunksTokenSchema } from '$env/schema/env-icpunks-token.schema';
import type * as z from 'zod';

export type EnvIcPunksToken = z.infer<typeof EnvIcPunksTokenSchema>;
