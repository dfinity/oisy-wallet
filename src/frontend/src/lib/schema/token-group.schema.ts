import * as z from 'zod/v4';

export const TokenGroupIdSchema = z.symbol().brand<'TokenGroupId'>();

export const TokenGroupSchema = z.object({
	id: TokenGroupIdSchema,
	symbol: z.string(),
	name: z.string(),
	icon: z.string().optional()
});

export const TokenGroupPropSchema = z.object({
	groupData: TokenGroupSchema.optional()
});
