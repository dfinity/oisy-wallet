import * as z from 'zod';

export const TokenGroupSchema = z.object({
	symbol: z.string(),
	name: z.string(),
	icon: z.string().optional()
});

export const TokenGroupPropSchema = z.object({
	groupData: TokenGroupSchema.optional()
});
