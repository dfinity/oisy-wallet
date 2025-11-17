import { EarningCardFields } from '$env/types/env.earning-cards';
import * as z from 'zod';

export const EarningCardsSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	logo: z.string(),
	fields: z.array(z.enum(EarningCardFields)),
	actionText: z.string()
});
