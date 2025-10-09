import type {
	TokenGroupIdSchema,
	TokenGroupPropSchema,
	TokenGroupSchema
} from '$lib/schema/token-group.schema';
import type * as z from 'zod';

export type TokenGroupId = z.infer<typeof TokenGroupIdSchema>;

export type TokenGroupData = z.infer<typeof TokenGroupSchema>;

export type TokenGroup = z.infer<typeof TokenGroupPropSchema>;
