import { ProviderIdSchema } from '$lib/schema/provider.schema';
import type { ProviderId } from '$lib/types/provider';
import * as z from 'zod';

const ProviderIdStringSchema = z.string();

export const parseProviderId = (
	tokenIdString: z.infer<typeof ProviderIdStringSchema>
): ProviderId => {
	const validString = ProviderIdStringSchema.parse(tokenIdString);
	return ProviderIdSchema.parse(Symbol(validString));
};
