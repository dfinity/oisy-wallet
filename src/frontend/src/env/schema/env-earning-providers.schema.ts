import { EarningCardFields } from '$env/types/env.earning-cards';
import * as z from 'zod';

export const EarningProviderConfigSchema = z.object({
	id: z.string(),
	type: z.enum(['stake', 'lending']),
	titles: z.array(z.string()),
	description: z.string(),
	logo: z.string(),
	fields: z.array(z.nativeEnum(EarningCardFields)),
	actionText: z.string()
});
