import * as z from 'zod';

export const TokenDeprecatedSchema = z.object({
	deprecated: z.boolean().optional()
});
