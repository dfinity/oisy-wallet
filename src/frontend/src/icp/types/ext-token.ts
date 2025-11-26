import type { ExtTokenSchema, ExtTokenWithoutIdSchema } from '$icp/schema/ext-token.schema';
import type * as z from 'zod';

export type ExtToken = z.infer<typeof ExtTokenSchema>;

export type ExtTokenWithoutId = z.infer<typeof ExtTokenWithoutIdSchema>;
