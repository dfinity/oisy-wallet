import type { ProviderIdSchema, ProviderSchema } from '$lib/schema/provider.schema';
import type * as z from 'zod';

export type ProviderId = z.infer<typeof ProviderIdSchema>;

export type Provider = z.infer<typeof ProviderSchema>;
