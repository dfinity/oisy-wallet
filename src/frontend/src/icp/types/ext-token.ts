import type { ExtTokenSchema } from '$icp/schema/ext-token.schema';
import type * as z from 'zod';

export type ExtToken = z.infer<typeof ExtTokenSchema>;
