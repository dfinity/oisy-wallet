import * as z from 'zod';

export const ProviderIdSchema = z.symbol().brand<'ProviderId'>();

export const ProviderSchema = z.object({
	id: ProviderIdSchema,
	cardTitle: z.string(),
	logo: z.string()
});
