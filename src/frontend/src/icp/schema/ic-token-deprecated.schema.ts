import * as z from 'zod';

export const IcTokenDeprecatedSchema = z.object({
	deprecated: z.boolean().optional()
});
