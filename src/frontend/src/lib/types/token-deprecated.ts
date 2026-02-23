import type { TokenDeprecatedSchema } from '$lib/schema/token-deprecated.schema';
import type * as z from 'zod';

export type TokenDeprecated = z.infer<typeof TokenDeprecatedSchema>;
