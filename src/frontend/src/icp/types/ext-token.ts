import type {
	ExtCanistersSchema,
	ExtTokenSchema,
	ExtTokenWithoutIdSchema
} from '$icp/schema/ext-token.schema';
import type * as z from 'zod';

export type ExtCanisters = z.infer<typeof ExtCanistersSchema>;

export type ExtToken = z.infer<typeof ExtTokenSchema>;

export type ExtTokenWithoutId = z.infer<typeof ExtTokenWithoutIdSchema>;
